import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { AuditAction } from '@app/common';

@Entity('audit_logs')
@Index(['entityId'])
@Index(['branchId'])
@Index(['userId'])
@Index(['action'])
@Index(['resourceType'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  userEmail?: string;

  @Column()
  userRole: string;

  @Column()
  action: AuditAction;

  @Column()
  resourceType: string; // e.g., 'Order', 'Receipt', 'User', 'Entity', etc.

  @Column({ nullable: true })
  resourceId?: string;

  @Column()
  entityId: string;

  @Column({ nullable: true })
  branchId?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  oldValues?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  newValues?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>; // IP address, user agent, etc.

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @CreateDateColumn()
  createdAt: Date;
}
