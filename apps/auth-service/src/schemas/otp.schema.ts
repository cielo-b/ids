import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OTPDocument = OTP & Document;

@Schema({ timestamps: true })
export class OTP {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true, enum: ['EMAIL', 'PHONE', '2FA'] })
  type: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  used: boolean;

  @Prop({ default: 0 })
  attempts: number;
}

export const OTPSchema = SchemaFactory.createForClass(OTP);

// Index for automatic deletion
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
