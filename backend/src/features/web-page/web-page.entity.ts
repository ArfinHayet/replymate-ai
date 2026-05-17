import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  OneToMany,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { WebPageChunk } from './web-page-chunk.entity';

@Entity('web_pages')
export class WebPage {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = randomUUID();
  }

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'text' })
  url!: string;

  @Column({ type: 'text', default: '' })
  title!: string;

  @Column({ type: 'int', default: 0 })
  chunksCreated!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => WebPageChunk, (chunk) => chunk.webPage, { cascade: true })
  chunks!: WebPageChunk[];
}
