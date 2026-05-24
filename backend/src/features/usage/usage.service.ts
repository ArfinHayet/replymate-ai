import {
  BadRequestException,
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
  };
  periodStart: string;
  periodEnd: string;
  usedMessages: number;
  remainingMessages: number;
  creemSubscriptionId: string | null;
};

const DEFAULT_PLANS = [
  {
    id: 1,
    name: "free",
    monthlyMessageLimit: 50,
    creemProductId: null,
    webCrawlLimit: 1,
    pdfUploadLimit: 10,
    imageUploadLimit: 10
  },
  {
    id: 2,
    name: "premium",
    monthlyMessageLimit: 2000,
    creemProductId: "prod_35bC6WQHnFraq8HmtyE4YI",
    webCrawlLimit: 10,
    pdfUploadLimit: 100,
    imageUploadLimit: 200
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
    options: { creemSubscriptionId?: string | null } = {}
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
        creemSubscriptionId: options.creemSubscriptionId ?? null
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
              : usage.creemSubscriptionId
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

  private toSnapshot(usage: AiMessageUsage): MessageUsageSnapshot {
    if (!usage.plan) {
      throw new Error(`Plan ${usage.planId} was not loaded.`);
    }

    return {
      plan: {
        id: usage.plan.id,
        name: usage.plan.name,
        monthlyMessageLimit: usage.plan.monthlyMessageLimit,
        creemProductId: usage.plan.creemProductId ?? null,
        webCrawlLimit: usage.plan.webCrawlLimit,
        pdfUploadLimit: usage.plan.pdfUploadLimit,
        imageUploadLimit: usage.plan.imageUploadLimit
      },
      periodStart: usage.periodStart,
      periodEnd: usage.periodEnd,
      usedMessages: usage.usedMessages,
      remainingMessages: Math.max(
        usage.plan.monthlyMessageLimit - usage.usedMessages,
        0
      ),
      creemSubscriptionId: usage.creemSubscriptionId ?? null
    };
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
