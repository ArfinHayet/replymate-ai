import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { randomUUID } from 'crypto';

export type KnowledgeSourceType = 'document' | 'web_page' | 'image';

@Entity('knowledge_entity_mentions')
@Index(['userId', 'entityId'])
@Index(['userId', 'sourceType', 'sourceId'])
export class KnowledgeEntityMention {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = randomUUID();
  }

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  entityId!: string;

  @Column({ type: 'varchar' })
  sourceType!: KnowledgeSourceType;

  @Column({ type: 'uuid' })
  sourceId!: string;

  @Column({ type: 'uuid', nullable: true })
  sourceChunkId?: string | null;

  @Column({ type: 'text' })
  matchedText!: string;

  @Column({ type: 'text', default: '' })
  context!: string;

  @Column({ type: 'float', default: 0.5 })
  confidence!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
