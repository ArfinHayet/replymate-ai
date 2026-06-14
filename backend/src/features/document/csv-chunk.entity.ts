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
import { Csv } from './csv.entity';

@Entity('csv_chunks')
export class CsvChunk {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = randomUUID();
  }

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'uuid', nullable: true })
  csvId?: string;

  @ManyToOne(() => Csv, (csv) => csv.chunks, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'csvId' })
  csv?: Csv;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'text' })
  fileName!: string;

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
