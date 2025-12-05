import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  orderId: string;

  @Column()
  menuItemId: string;

  @Column()
  menuItemName: string;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'jsonb', nullable: true })
  addons?: Array<{
    id: string;
    name: string;
    price: number;
  }>;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ nullable: true })
  addedBy?: string; // For bulk orders

  @CreateDateColumn()
  createdAt: Date;
}
