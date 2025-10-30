import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum OTPType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  TWO_FA = '2FA',
}

@Entity('otps')
@Index(['userId'])
export class OTP {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  code: string;

  @Column({ type: 'enum', enum: OTPType })
  type: OTPType;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
