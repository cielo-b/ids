import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("managers")
@Index(["userId"], { unique: true })
@Index(["entityId"])
@Index(["branchId"])
export class Manager {
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

  @Column({ type: "jsonb", nullable: true })
  permissions?: {
    manageEmployees?: boolean;
    manageOrders?: boolean;
    manageMenu?: boolean;
    managePayments?: boolean;
    viewReports?: boolean;
    approveRefunds?: boolean;
  };

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  totalRevenueManaged: number;

  @Column({ type: "int", default: 0 })
  totalEmployeesManaged: number;

  @Column({ type: "int", default: 0 })
  totalOrdersManaged: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  performanceScore: number;

  @Column({ type: "jsonb", nullable: true })
  metrics?: {
    dailyRevenue?: number;
    weeklyRevenue?: number;
    monthlyRevenue?: number;
    averageOrderValue?: number;
    customerSatisfaction?: number;
    employeeSatisfaction?: number;
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
