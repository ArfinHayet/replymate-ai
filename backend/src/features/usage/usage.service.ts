import { HttpException, HttpStatus, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { AiMessageUsage } from './ai-message-usage.entity';
import { Plan } from './plan.entity';

export type MessageUsageSnapshot = {
  plan: {
    id: number;
    name: string;
    monthlyLimit: number;
  };
  periodStart: string;
  periodEnd: string;
  usedMessages: number;
  remainingMessages: number;
};

const DEFAULT_PLANS = [
  { id: 1, name: 'free', monthlyLimit: 50 },
  { id: 2, name: 'premium', monthlyLimit: 2000 },
];

@Injectable()
export class UsageService implements OnModuleInit {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(AiMessageUsage)
    private readonly usageRepo: Repository<AiMessageUsage>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.planRepo.upsert(DEFAULT_PLANS, ['id']);
  }

  async ensureCurrentUsage(userId: string): Promise<MessageUsageSnapshot> {
    const period = this.currentPeriod();
    let usage = await this.usageRepo.findOne({
      where: { userId, periodStart: period.periodStart },
      relations: { plan: true },
    });

    if (!usage) {
      usage = this.usageRepo.create({
        userId,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        usedMessages: 0,
        planId: 1,
      });
      usage = await this.usageRepo.save(usage);
      usage.plan = await this.loadPlan(usage.planId);
    }

    return this.toSnapshot(usage);
  }

  async incrementOrThrow(userId: string): Promise<MessageUsageSnapshot> {
    const period = this.currentPeriod();

    return this.dataSource.transaction(async (manager) => {
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
          planId: 1,
        })
        .orIgnore()
        .execute();

      const usage = await manager.findOne(AiMessageUsage, {
        where: { userId, periodStart: period.periodStart },
        lock: { mode: 'pessimistic_write' },
      });

      if (!usage) {
        throw new Error('Unable to load message usage for this user.');
      }

      const plan = await manager.findOneBy(Plan, { id: usage.planId });
      if (!plan) {
        throw new Error(`Plan ${usage.planId} not found.`);
      }

      if (usage.usedMessages >= plan.monthlyLimit) {
        throw new HttpException(
          `Monthly AI message limit reached for the ${plan.name} plan.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      usage.usedMessages += 1;
      await manager.save(usage);
      usage.plan = plan;

      return this.toSnapshot(usage);
    });
  }

  private currentPeriod(): { periodStart: string; periodEnd: string } {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    return {
      periodStart: this.toDateString(start),
      periodEnd: this.toDateString(end),
    };
  }

  private toDateString(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private async loadPlan(planId: number): Promise<Plan> {
    const plan = await this.planRepo.findOneBy({ id: planId });
    if (!plan) {
      throw new Error(`Plan ${planId} not found.`);
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
        monthlyLimit: usage.plan.monthlyLimit,
      },
      periodStart: usage.periodStart,
      periodEnd: usage.periodEnd,
      usedMessages: usage.usedMessages,
      remainingMessages: Math.max(usage.plan.monthlyLimit - usage.usedMessages, 0),
    };
  }
}
