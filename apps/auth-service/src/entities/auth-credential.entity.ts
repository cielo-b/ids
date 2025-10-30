import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('auth_credentials')
@Index(['userId'], { unique: true })
@Index(['email'], { unique: true })
export class AuthCredential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ type: 'text' })
  passwordHash: string;

  @Column({ type: 'text', nullable: true })
  refreshToken?: string;

  @Column({ type: 'text', nullable: true })
  twoFactorSecret?: string;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  loginAttempts?: {
    count: number;
    lastAttempt: Date;
    locked: boolean;
    lockedUntil: Date;
  };

  @Column({ type: 'jsonb', nullable: true })
  passwordHistory?: Date[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
