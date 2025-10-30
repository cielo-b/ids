import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('menu_items')
@Index(['entityId'])
@Index(['category'])
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entityId: string;

  @Column({ nullable: true })
  branchId?: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  categoryId?: string;

  @Column({ length: 100 })
  category: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountedPrice?: number;

  @Column({ nullable: true })
  image?: string;

  @Column({ unique: true, nullable: true })
  sku?: string;

  @Column({ unique: true, nullable: true })
  barcode?: string;

  @Column({ type: 'text', nullable: true })
  qrCode?: string;

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ default: true })
  inStock: boolean;

  @Column({ type: 'int', default: 0 })
  stockQuantity: number;

  @Column({ type: 'int', default: 0 })
  lowStockThreshold: number;

  @Column({ type: 'jsonb', nullable: true })
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  allergens?: string[];

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[];

  @Column({ type: 'int', default: 0 })
  preparationTime?: number; // in minutes

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  totalRatings: number;

  @Column({ type: 'int', default: 0 })
  totalOrders: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

