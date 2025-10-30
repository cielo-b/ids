import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuthDocument = AuthCredential & Document;

@Schema({ timestamps: true })
export class AuthCredential {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ default: null })
  refreshToken: string;

  @Prop({ default: null })
  twoFactorSecret: string;

  @Prop({ default: false })
  twoFactorEnabled: boolean;

  @Prop({ type: Object, default: {} })
  loginAttempts: {
    count: number;
    lastAttempt: Date;
    locked: boolean;
    lockedUntil: Date;
  };

  @Prop({ type: [Date], default: [] })
  passwordHistory: Date[];

  @Prop({ default: true })
  isActive: boolean;
}

export const AuthCredentialSchema =
  SchemaFactory.createForClass(AuthCredential);
