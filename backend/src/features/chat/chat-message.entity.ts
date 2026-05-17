import { Entity, PrimaryColumn, Column, CreateDateColumn, Index, BeforeInsert } from 'typeorm';
import { randomUUID } from 'crypto';

export type MessageRole = 'user' | 'assistant';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryColumn({ type: 'uuid' })
  id?: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = randomUUID();
  }

  @Index()
  @Column({ type: 'varchar' })
  sessionId?: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'varchar' })
  role?: MessageRole;

  @Column({ type: 'text' })
  content?: string;

  @CreateDateColumn()
  createdAt?: Date;
}
