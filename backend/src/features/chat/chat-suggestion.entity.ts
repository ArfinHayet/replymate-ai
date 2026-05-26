import { randomUUID } from 'crypto';
import { BeforeInsert, Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('chat_suggestions')
export class ChatSuggestion {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = randomUUID();
  }

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  suggestions!: string[];

  @UpdateDateColumn()
  updatedAt!: Date;
}
