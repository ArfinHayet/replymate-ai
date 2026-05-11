import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  BeforeInsert,
  OneToMany,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { DocumentChunk } from './document-chunk.entity';

@Entity('pdfs')
export class Pdf {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = randomUUID();
  }

  @Column({ type: 'text' })
  fileName!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => DocumentChunk, (chunk) => chunk.pdf, { cascade: true })
  chunks!: DocumentChunk[];
}
