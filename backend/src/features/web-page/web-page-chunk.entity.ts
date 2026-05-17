import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  BeforeInsert,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { WebPage } from './web-page.entity';

@Entity('web_page_chunks')
export class WebPageChunk {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = randomUUID();
  }

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'uuid', nullable: true })
  webPageId?: string;

  @ManyToOne(() => WebPage, (page) => page.chunks, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'webPageId' })
  webPage?: WebPage;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'text' })
  url!: string;

  @Column({ type: 'int' })
  chunkIndex!: number;

  /**
   * Float array stored as JSON text: "[0.12, -0.34, ...]".
   * Cast to ::vector inline in raw SQL queries.
   */
  @Column({ type: 'text' })
  embedding!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
