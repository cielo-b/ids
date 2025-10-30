import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BusinessEntity } from './entity.entity';

@Entity('branches')
@Index(['entityId'])
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => BusinessEntity, (entity) => entity.branches, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'entityId' })
  entity: BusinessEntity;

  @Column()
  entityId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  managerId?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'text' })
  address: string;

  @Column()
  city: string;

  @Column()
  country: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude?: number;

  @Column({ type: 'jsonb', nullable: true })
  workingHours?: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  };

  @Column({ type: 'int', default: 0 })
  totalTables?: number; // For restaurants

  @Column({ type: 'int', default: 0 })
  totalPumps?: number; // For gas stations

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
