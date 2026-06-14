import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';
import { randomUUID } from 'crypto';

export type CrawlJobStatus = 'pending' | 'running' | 'completed' | 'failed';

@Entity('crawl_jobs')
export class CrawlJobEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = randomUUID();
  }

  @Column({ type: 'text' })
  domain!: string;

  @Column({ type: 'text' })
  startUrl!: string;

  @Column({ type: 'text', default: 'pending' })
  status!: CrawlJobStatus;

  @Column({ type: 'int', default: 0 })
  pagesFound!: number;

  @Column({ type: 'int', default: 0 })
  pagesIngested!: number;

  @Column({ type: 'int', default: 0 })
  totalChunks!: number;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
