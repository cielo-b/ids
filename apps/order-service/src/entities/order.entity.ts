import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { OrderStatus } from '@app/common';
import { OrderItem } from './order-item.entity';

@Entity('orders')
@Index(['entityId'])
@Index(['customerId'])
@Index(['employeeId'])
@Index(['status'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderNumber: string;

  @Column()
  entityId: string;

  @Column({ nullable: true })
  branchId?: string;

  @Column()
  customerId: string;

  @Column()
  employeeId: string;

  @Column({ nullable: true })
  tableNumber?: string;

  @Column({ nullable: true })
  stationNumber?: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.INCOMING })
  status: OrderStatus;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tipAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'text', nullable: true })
  qrCode?: string;

  @Column({ default: false })
  isBulkOrder: boolean;

  @Column({ nullable: true })
  bulkOrderInitiatorId?: string;

  @Column({ type: 'jsonb', nullable: true })
  participants?: Array<{
    userId: string;
    items: string[];
    amount: number;
  }>;

  @Column({ default: false })
  isSplitBill: boolean;

  @Column({ type: 'jsonb', nullable: true })
  splitDetails?: Array<{
    userId: string;
    amount: number;
    paid: boolean;
  }>;

  @Column({ nullable: true })
  promotionId?: string;

  @Column({ type: 'text', nullable: true })
  specialInstructions?: string;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  preparingAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  servedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ nullable: true })
  cancelReason?: string;

  @Column({ nullable: true })
  cancelledBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
