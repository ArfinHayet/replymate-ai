import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { randomUUID } from 'crypto';

@Entity('knowledge_entities')
@Index(['userId', 'type', 'canonicalName'], { unique: true })
export class KnowledgeEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = randomUUID();
  }

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar' })
  type!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
  canonicalName!: string;

  @Column({ type: 'jsonb', default: [] })
  aliases!: string[];

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'text', nullable: true })
  embedding?: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
