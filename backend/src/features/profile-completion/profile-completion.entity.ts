import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('profile_complition')
export class ProfileCompletion {
  @PrimaryColumn({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'boolean', default: false })
  hasCompanyInfo!: boolean;

  @Column({ type: 'boolean', default: false })
  hasContentSource!: boolean;

  @Column({ type: 'int', default: 0 })
  companyCount!: number;

  @Column({ type: 'int', default: 0 })
  pdfCount!: number;

  @Column({ type: 'int', default: 0 })
  webPageCount!: number;

  @Column({ type: 'int', default: 0 })
  completionPercent!: number;

  @Column({ type: 'boolean', default: false })
  isComplete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
