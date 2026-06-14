import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  BeforeInsert,
  OneToMany,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { CsvChunk } from './csv-chunk.entity';

@Entity('csvs')
export class Csv {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = randomUUID();
  }

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'text' })
  fileName!: string;

  @Column({ type: 'int', default: 0 })
  rowCount!: number;

  @Column({ type: 'text', array: true, default: '{}' })
  headers!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => CsvChunk, (chunk) => chunk.csv, { cascade: true })
  chunks!: CsvChunk[];
}
