import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { EmployeeStatus, EmployeeType } from "@app/common";

@Entity("employees")
@Index(["userId"], { unique: true })
@Index(["entityId"])
@Index(["branchId"])
export class Employee {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column()
  entityId: string;

  @Column({ nullable: true })
  branchId?: string;

  @Column({ length: 100 })
  position: string;

  @Column({ type: "enum", enum: EmployeeType, default: EmployeeType.OTHER })
  employeeType: EmployeeType;

  @Column({
    type: "enum",
    enum: EmployeeStatus,
    default: EmployeeStatus.OFF_DUTY,
  })
  status: EmployeeStatus;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  totalTips: number;

  @Column({ type: "int", default: 0 })
  totalOrders: number;

  @Column({ type: "int", default: 0 })
  activeOrders: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  averageRating: number;

  @Column({ type: "int", default: 0 })
  totalRatings: number;

  @Column({ type: "jsonb", nullable: true })
  workingHours?: {
    monday?: { start: string; end: string };
    tuesday?: { start: string; end: string };
    wednesday?: { start: string; end: string };
    thursday?: { start: string; end: string };
    friday?: { start: string; end: string };
    saturday?: { start: string; end: string };
    sunday?: { start: string; end: string };
  };

  @Column({ type: "jsonb", nullable: true })
  performanceMetrics?: {
    averageOrderTime?: number;
    customerSatisfaction?: number;
    ordersPerShift?: number;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: "timestamp", nullable: true })
  lastActiveAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
