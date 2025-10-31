import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("receipts")
@Index(["orderId"])
@Index(["paymentId"])
@Index(["entityId"])
@Index(["customerId"])
export class Receipt {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  receiptNumber: string;

  @Column()
  orderId: string;

  @Column()
  paymentId: string;

  @Column()
  entityId: string;

  @Column({ nullable: true })
  branchId?: string;

  @Column()
  customerId: string;

  @Column({ type: "jsonb" })
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  tipAmount: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  total: number;

  @Column({ type: "text", nullable: true })
  qrCode?: string;

  @Column({ type: "jsonb", nullable: true })
  entityInfo?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string;
  };

  @Column({ type: "jsonb", nullable: true })
  customerInfo?: {
    name: string;
    email?: string;
    phone?: string;
  };

  @Column({ type: "jsonb", nullable: true })
  paymentInfo?: {
    method: string;
    transactionId?: string;
    cardLast4?: string;
    paidAt: Date;
  };

  @Column({ default: false })
  isRefunded: boolean;

  @Column({ nullable: true })
  refundReceiptId?: string;

  @Column({ type: "text", nullable: true })
  notes?: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
