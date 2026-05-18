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

export type WhatsappMessageEventStatus = 'received' | 'processed' | 'failed' | 'ignored';

@Entity('whatsapp_message_events')
export class WhatsappMessageEvent {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = randomUUID();
  }

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  metaMessageId!: string;

  @Index()
  @Column({ type: 'varchar' })
  phoneNumberId!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar' })
  status!: WhatsappMessageEventStatus;

  @Column({ type: 'text', nullable: true })
  error?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
