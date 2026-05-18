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

@Entity('whatsapp_integrations')
export class WhatsappIntegration {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = randomUUID();
  }

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  phoneNumberId!: string;

  @Column({ type: 'varchar' })
  wabaId!: string;

  @Column({ type: 'text', nullable: true })
  businessName?: string | null;

  @Column({ type: 'text' })
  encryptedAccessToken!: string;

  @Column({ type: 'text' })
  encryptedAppSecret!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  verifyTokenHash!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastWebhookAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
