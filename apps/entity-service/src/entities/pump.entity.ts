import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PumpStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  OUT_OF_ORDER = 'out_of_order',
  MAINTENANCE = 'maintenance',
}

@Entity('pumps')
@Index(['entityId'])
@Index(['branchId'])
@Index(['status'])
export class Pump {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entityId: string;

  @Column()
  branchId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50 })
  pumpNumber: string; // e.g., "P-01", "P-02"

  @Column({ type: 'enum', enum: PumpStatus, default: PumpStatus.AVAILABLE })
  status: PumpStatus;

  @Column({ type: 'text', nullable: true })
  fuelType?: string; // e.g., "Petrol", "Diesel", "Premium"

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  currentPrice?: number; // Price per liter/gallon

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
