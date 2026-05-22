import { randomUUID } from 'crypto';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Plan } from './plan.entity';

@Entity('ai_message_usage')
@Index(['userId', 'periodStart'], { unique: true })
export class AiMessageUsage {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = randomUUID();
  }

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'period_start', type: 'date' })
  periodStart!: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd!: string;

  @Column({ name: 'used_messages', type: 'int', default: 0 })
  usedMessages!: number;

  @Column({ name: 'plan_id', type: 'int', default: 1 })
  planId!: number;

  @ManyToOne(() => Plan)
  @JoinColumn({ name: 'plan_id' })
  plan?: Plan;
}
