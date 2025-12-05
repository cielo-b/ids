import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { NotificationType } from "@app/common";

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  userId: string;

  @Column({
    type: "enum",
    enum: NotificationType,
  })
  type: NotificationType;

  @Column()
  subject: string;

  @Column({ type: "text" })
  message: string;

  @Column({ nullable: true })
  recipient: string; // Email, phone number, or device token

  @Column({ default: "PENDING" })
  status: string; // PENDING, SENT, FAILED

  @Column({ nullable: true, type: "timestamp" })
  sentAt: Date;

  @Column({ nullable: true, type: "text" })
  error: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
