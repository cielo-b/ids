import { Module } from '@nestjs/common';
import { PaymentController } from './app.controller';
import { PaymentService } from './app.service';

@Module({
  imports: [],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
