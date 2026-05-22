import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('plan')
export class Plan {
  @PrimaryColumn({ type: 'int' })
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column({ name: 'monthly_limit', type: 'int' })
  monthlyLimit!: number;
}
