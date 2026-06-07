import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { randomUUID } from 'crypto';
import type { KnowledgeSourceType } from './knowledge-entity-mention.entity';

@Entity('knowledge_relations')
@Index(['userId', 'fromEntityId', 'relationType'])
@Index(['userId', 'toEntityId', 'relationType'])
@Index(['userId', 'sourceType', 'sourceId'])
export class KnowledgeRelation {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = randomUUID();
  }

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  fromEntityId!: string;

  @Column({ type: 'uuid' })
  toEntityId!: string;

  @Column({ type: 'varchar' })
  relationType!: string;

  @Column({ type: 'text' })
  evidenceText!: string;

  @Column({ type: 'varchar' })
  sourceType!: KnowledgeSourceType;

  @Column({ type: 'uuid' })
  sourceId!: string;

  @Column({ type: 'uuid', nullable: true })
  sourceChunkId?: string | null;

  @Column({ type: 'float', default: 0.5 })
  confidence!: number;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;
}
