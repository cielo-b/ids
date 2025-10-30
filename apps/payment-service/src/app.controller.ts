import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PaymentService } from './app.service';

@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @MessagePattern('payment.process')
  async processPayment(@Payload() data: any) {
    return this.paymentService.processPayment(data);
  }

  @MessagePattern('payment.verify')
  async verifyPayment(@Payload() data: any) {
    return this.paymentService.verifyPayment(data.paymentId);
  }

  @MessagePattern('payment.refund')
  async refundPayment(@Payload() data: any) {
    return this.paymentService.refundPayment(data.paymentId);
  }

  @MessagePattern('payment.history')
  async paymentHistory(@Payload() data: any) {
    return this.paymentService.paymentHistory(data.entityId, data.filters);
  }
}
