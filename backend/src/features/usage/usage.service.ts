import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  OnModuleInit
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { DataSource, LessThanOrEqual, MoreThan, Repository } from "typeorm";
import { AiMessageUsage } from "./ai-message-usage.entity";
import { CreatePlanDto, UpdatePlanDto } from "./dto/plan.dto";
import { Plan } from "./plan.entity";

export type MessageUsageSnapshot = {
  plan: {
    id: number;
    name: string;
    monthlyMessageLimit: number;
    creemProductId: string | null;
    webCrawlLimit: number;
    pdfUploadLimit: number;
    imageUploadLimit: number;
    csvUploadLimit: number;
  };
  periodStart: string;
  periodEnd: string;
  usedMessages: number;
  remainingMessages: number;
  creemSubscriptionId: string | null;
  subscriptionStatus: "active" | "canceled" | null;
  contentUsage: ContentUsageSnapshot;
};

export type ContentLimitResource = "webPages" | "pdfs" | "images" | "csvs";

export type ContentUsageSnapshot = Record<
  ContentLimitResource,
  {
    used: number;
    limit: number;
    remaining: number;
  }
>;

const DEFAULT_PLANS = [
  {
    id: 1,
    name: "free",
    monthlyMessageLimit: 50,
    creemProductId: null,
    webCrawlLimit: 1,
    pdfUploadLimit: 10,
    imageUploadLimit: 10,
    csvUploadLimit: 5
  },
  {
    id: 2,
    name: "premium",
    monthlyMessageLimit: 2000,
    creemProductId: "prod_35bC6WQHnFraq8HmtyE4YI",
    webCrawlLimit: 10,
    pdfUploadLimit: 100,
    imageUploadLimit: 200,
    csvUploadLimit: 50
  }
];

@Injectable()
export class UsageService implements OnModuleInit {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(AiMessageUsage)
    private readonly usageRepo: Repository<AiMessageUsage>,
    private readonly dataSource: DataSource
  ) {}

  async onModuleInit() {
    await this.planRepo.upsert(DEFAULT_PLANS, ["id"]);
  }

  async ensureCurrentUsage(userId: string): Promise<MessageUsageSnapshot> {
    const today = this.today();
    let usage = await this.findActiveUsage(userId, today);

    if (!usage) {
      const period = this.periodFrom(today);
      usage = this.usageRepo.create({
        userId,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        usedMessages: 0,
        planId: 1
      });
      usage = await this.usageRepo.save(usage);
      usage.plan = await this.loadPlan(usage.planId);
    }

    return this.toSnapshot(usage);
  }

  async incrementOrThrow(userId: string): Promise<MessageUsageSnapshot> {
    const today = this.today();
    const period = this.periodFrom(today);

    return this.dataSource.transaction(async (manager) => {
      let usage = await manager.findOne(AiMessageUsage, {
        where: {
          userId,
          periodStart: LessThanOrEqual(today),
          periodEnd: MoreThan(today)
        },
        order: { periodStart: "DESC" },
        lock: { mode: "pessimistic_write" }
      });

      if (!usage) {
        await manager
          .createQueryBuilder()
          .insert()
          .into(AiMessageUsage)
          .values({
            id: randomUUID(),
            userId,
            periodStart: period.periodStart,
            periodEnd: period.periodEnd,
            usedMessages: 0,
            planId: 1
          })
          .orIgnore()
          .execute();

        usage = await manager.findOne(AiMessageUsage, {
          where: { userId, periodStart: period.periodStart },
          lock: { mode: "pessimistic_write" }
        });
      }

      if (!usage) {
        throw new Error("Unable to load message usage for this user.");
      }

      const plan = await manager.findOneBy(Plan, { id: usage.planId });
      if (!plan) {
        throw new Error(`Plan ${usage.planId} not found.`);
      }

      if (usage.usedMessages >= plan.monthlyMessageLimit) {
        throw new HttpException(
          `Monthly AI message limit reached for the ${plan.name} plan.`,
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      usage.usedMessages += 1;
      await manager.save(usage);
      usage.plan = plan;

      return this.toSnapshot(usage);
    });
  }

  async setCurrentPlan(
    userId: string,
    planName: string,
    options: {
      creemSubscriptionId?: string | null;
      subscriptionStatus?: "active" | "canceled" | null;
    } = {}
  ): Promise<MessageUsageSnapshot> {
    const plan = await this.findPlanByName(planName);
    const today = this.today();
    const period = this.periodFrom(today);

    let usage = await this.findActiveUsage(userId, today);

    if (!usage) {
      usage = await this.usageRepo.findOne({
        where: { userId, periodStart: period.periodStart }
      });
    }

    if (!usage) {
      usage = this.usageRepo.create({
        userId,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        usedMessages: 0,
        planId: plan.id,
        creemSubscriptionId: options.creemSubscriptionId ?? null,
        subscriptionStatus: options.subscriptionStatus ?? null
      });
      usage = await this.usageRepo.save(usage);
    } else if (
      usage.planId === plan.id &&
      usage.periodStart === period.periodStart
    ) {
      await this.usageRepo.update(
        { id: usage.id },
        {
          periodEnd: period.periodEnd,
          creemSubscriptionId:
            options.creemSubscriptionId !== undefined
              ? options.creemSubscriptionId
              : usage.creemSubscriptionId,
          subscriptionStatus:
            options.subscriptionStatus !== undefined
              ? options.subscriptionStatus
              : usage.subscriptionStatus
        }
      );
    } else {
      await this.usageRepo.update(
        { id: usage.id },
        {
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
          usedMessages: 0,
          planId: plan.id,
          creemSubscriptionId:
            options.creemSubscriptionId !== undefined
              ? options.creemSubscriptionId
              : null,
          subscriptionStatus:
            options.subscriptionStatus !== undefined
              ? options.subscriptionStatus
              : null
        }
      );
    }

    const updatedUsage = await this.usageRepo.findOne({
      where: { userId, periodStart: period.periodStart },
      relations: { plan: true }
    });

    if (!updatedUsage) {
      throw new Error("Unable to load updated message usage for this user.");
    }

    return this.toSnapshot(updatedUsage);
  }

  async findCurrentSubscriptionId(userId: string): Promise<string | null> {
    const usage = await this.findActiveUsage(userId, this.today());
    return usage?.creemSubscriptionId ?? null;
  }

  async assertCanAddContent(
    userId: string,
    resource: ContentLimitResource,
    requestedCount = 1
  ): Promise<void> {
    const usage = await this.ensureCurrentUsage(userId);
    const quota = usage.contentUsage[resource];

    if (requestedCount > quota.remaining) {
      throw new ForbiddenException(
        this.buildContentLimitMessage(resource, quota.limit)
      );
    }
  }

  async setCurrentSubscriptionStatus(
    userId: string,
    subscriptionStatus: "active" | "canceled" | null
  ): Promise<MessageUsageSnapshot> {
    const usage = await this.findActiveUsage(userId, this.today());
    if (!usage) {
      throw new NotFoundException("No active usage period found.");
    }

    await this.usageRepo.update(
      { id: usage.id },
      {
        subscriptionStatus
      }
    );

    const updatedUsage = await this.usageRepo.findOne({
      where: { id: usage.id },
      relations: { plan: true }
    });

    if (!updatedUsage) {
      throw new Error("Unable to load updated message usage for this user.");
    }

    return this.toSnapshot(updatedUsage);
  }

  findPlans(): Promise<Plan[]> {
    return this.planRepo.find({ order: { id: "ASC" } });
  }

  async findPlan(id: number): Promise<Plan> {
    return this.loadPlan(id);
  }

  async findPlanByName(name: string): Promise<Plan> {
    const plan = await this.planRepo.findOneBy({ name });
    if (!plan) {
      throw new NotFoundException(`Plan ${name} not found.`);
    }
    return plan;
  }

  async createPlan(dto: CreatePlanDto): Promise<Plan> {
    this.validatePlanInput(dto);
    const id = dto.id ?? (await this.nextPlanId());
    const existing = await this.planRepo.findOne({
      where: [{ id }, { name: dto.name.trim() }]
    });

    if (existing) {
      throw new BadRequestException(
        "A plan with this id or name already exists."
      );
    }

    const plan = this.planRepo.create({
      id,
      name: dto.name.trim(),
      monthlyMessageLimit: dto.monthlyMessageLimit,
      creemProductId: this.normalizeNullableString(dto.creemProductId),
      webCrawlLimit: dto.webCrawlLimit,
      pdfUploadLimit: dto.pdfUploadLimit,
      imageUploadLimit: dto.imageUploadLimit
    });

    return this.planRepo.save(plan);
  }

  async updatePlan(id: number, dto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.loadPlan(id);

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException("name is required");

      const existing = await this.planRepo.findOneBy({ name });
      if (existing && existing.id !== id) {
        throw new BadRequestException("A plan with this name already exists.");
      }
      plan.name = name;
    }

    if (dto.monthlyMessageLimit !== undefined) {
      plan.monthlyMessageLimit = this.validateLimit(
        "monthlyMessageLimit",
        dto.monthlyMessageLimit
      );
    }
    if (dto.webCrawlLimit !== undefined) {
      plan.webCrawlLimit = this.validateLimit(
        "webCrawlLimit",
        dto.webCrawlLimit
      );
    }
    if (dto.pdfUploadLimit !== undefined) {
      plan.pdfUploadLimit = this.validateLimit(
        "pdfUploadLimit",
        dto.pdfUploadLimit
      );
    }
    if (dto.imageUploadLimit !== undefined) {
      plan.imageUploadLimit = this.validateLimit(
        "imageUploadLimit",
        dto.imageUploadLimit
      );
    }
    if (dto.csvUploadLimit !== undefined) {
      plan.csvUploadLimit = this.validateLimit(
        "csvUploadLimit",
        dto.csvUploadLimit
      );
    }
    if (dto.creemProductId !== undefined) {
      plan.creemProductId = this.normalizeNullableString(dto.creemProductId);
    }

    return this.planRepo.save(plan);
  }

  async removePlan(id: number): Promise<void> {
    if (id === 1) {
      throw new BadRequestException("The default free plan cannot be deleted.");
    }

    const plan = await this.loadPlan(id);
    const usageCount = await this.usageRepo.count({ where: { planId: id } });
    if (usageCount > 0) {
      throw new BadRequestException(
        "Plans with existing usage records cannot be deleted."
      );
    }

    await this.planRepo.remove(plan);
  }

  private today(): string {
    const now = new Date();
    return this.toDateString(now);
  }

  private periodFrom(dateString: string): {
    periodStart: string;
    periodEnd: string;
  } {
    const start = new Date(`${dateString}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 30);
    return {
      periodStart: this.toDateString(start),
      periodEnd: this.toDateString(end)
    };
  }

  private findActiveUsage(
    userId: string,
    today: string
  ): Promise<AiMessageUsage | null> {
    return this.usageRepo.findOne({
      where: {
        userId,
        periodStart: LessThanOrEqual(today),
        periodEnd: MoreThan(today)
      },
      order: { periodStart: "DESC" },
      relations: { plan: true }
    });
  }

  private toDateString(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private async loadPlan(planId: number): Promise<Plan> {
    const plan = await this.planRepo.findOneBy({ id: planId });
    if (!plan) {
      throw new NotFoundException(`Plan ${planId} not found.`);
    }
    return plan;
  }

  private async toSnapshot(usage: AiMessageUsage): Promise<MessageUsageSnapshot> {
    if (!usage.plan) {
      throw new Error(`Plan ${usage.planId} was not loaded.`);
    }

    const contentUsage = await this.getContentUsage(usage.userId, usage.plan);

    return {
      plan: {
        id: usage.plan.id,
        name: usage.plan.name,
        monthlyMessageLimit: usage.plan.monthlyMessageLimit,
        creemProductId: usage.plan.creemProductId ?? null,
        webCrawlLimit: usage.plan.webCrawlLimit,
        pdfUploadLimit: usage.plan.pdfUploadLimit,
        imageUploadLimit: usage.plan.imageUploadLimit,
        csvUploadLimit: usage.plan.csvUploadLimit
      },
      periodStart: usage.periodStart,
      periodEnd: usage.periodEnd,
      usedMessages: usage.usedMessages,
      remainingMessages: Math.max(
        usage.plan.monthlyMessageLimit - usage.usedMessages,
        0
      ),
      creemSubscriptionId: usage.creemSubscriptionId ?? null,
      subscriptionStatus:
        usage.subscriptionStatus === "active" ||
        usage.subscriptionStatus === "canceled"
          ? usage.subscriptionStatus
          : usage.creemSubscriptionId
            ? "active"
            : null,
      contentUsage
    };
  }

  private async getContentUsage(
    userId: string,
    plan: Plan
  ): Promise<ContentUsageSnapshot> {
    const [webPages, pdfs, images, csvs] = await Promise.all([
      this.countRows("web_pages", userId),
      this.countRows("pdfs", userId),
      this.countRows("images", userId),
      this.countRows("csvs", userId)
    ]);

    return {
      webPages: this.toContentQuota(webPages, plan.webCrawlLimit),
      pdfs: this.toContentQuota(pdfs, plan.pdfUploadLimit),
      images: this.toContentQuota(images, plan.imageUploadLimit),
      csvs: this.toContentQuota(csvs, plan.csvUploadLimit)
    };
  }

  private async countRows(tableName: string, userId: string): Promise<number> {
    const rows = (await this.dataSource.query(
      `SELECT COUNT(*)::int AS count FROM ${tableName} WHERE "userId" = $1`,
      [userId]
    )) as Array<{ count: number | string }>;

    return Number(rows[0]?.count ?? 0);
  }

  private toContentQuota(used: number, limit: number) {
    return {
      used,
      limit,
      remaining: Math.max(limit - used, 0)
    };
  }

  private buildContentLimitMessage(
    resource: ContentLimitResource,
    limit: number
  ): string {
    const label =
      resource === "webPages"
        ? "URLs"
        : resource === "pdfs"
          ? "PDFs"
          : "images";

    return `Your current plan allows up to ${limit.toLocaleString()} ${label}. Upgrade your plan or remove existing content to add more.`;
  }

  private validatePlanInput(dto: CreatePlanDto) {
    if (!dto.name?.trim()) throw new BadRequestException("name is required");
    if (dto.id !== undefined) this.validateLimit("id", dto.id);
    this.validateLimit("monthlyMessageLimit", dto.monthlyMessageLimit);
    this.validateLimit("webCrawlLimit", dto.webCrawlLimit);
    this.validateLimit("pdfUploadLimit", dto.pdfUploadLimit);
    this.validateLimit("imageUploadLimit", dto.imageUploadLimit);
  }

  private validateLimit(field: string, value: number): number {
    if (!Number.isInteger(value) || value < 0) {
      throw new BadRequestException(`${field} must be a non-negative integer.`);
    }
    return value;
  }

  private normalizeNullableString(
    value: string | null | undefined
  ): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private async nextPlanId(): Promise<number> {
    const result = await this.planRepo
      .createQueryBuilder("plan")
      .select("COALESCE(MAX(plan.id), 0)", "max")
      .getRawOne<{ max: string }>();

    return Number(result?.max ?? 0) + 1;
  }
}
