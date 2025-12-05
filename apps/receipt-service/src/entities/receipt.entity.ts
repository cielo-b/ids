import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { ReceiptStatus, ReceiptPaymentMethod } from "@app/common";

@Entity("receipts")
@Index(["orderId"])
@Index(["entityId"])
@Index(["branchId"])
@Index(["status"])
export class Receipt {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  orderId: string;

  @Column()
  orderCode: string; // Order code like "DI104"

  @Column()
  entityId: string;

  @Column({ nullable: true })
  branchId?: string;

  @Column({ nullable: true })
  branchName?: string;

  @Column()
  customerName: string;

  @Column({ nullable: true })
  handledById?: string;

  @Column({ nullable: true })
  handledByName?: string;

  @Column({ type: "enum", enum: ReceiptPaymentMethod })
  paymentMethod: ReceiptPaymentMethod;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amountPaid: number;

  @Column({ default: "FRW" })
  currency: string;

  @Column({ type: "enum", enum: ReceiptStatus, default: ReceiptStatus.ISSUED })
  status: ReceiptStatus;

  @Column({ type: "text" })
  qrPayload: string;

  @Column({ type: "timestamp" })
  servedAt: Date;

  @Column({ type: "timestamp" })
  generatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
