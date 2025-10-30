import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SubscriptionService } from './app.service';

@Controller()
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @MessagePattern('subscription.create')
  async createSubscription(@Payload() data: any) {
    return this.subscriptionService.createSubscription(data);
  }

  @MessagePattern('subscription.get')
  async getSubscription(@Payload() data: any) {
    return this.subscriptionService.getSubscription(data.id);
  }

  @MessagePattern('subscription.update')
  async updateSubscription(@Payload() data: any) {
    return this.subscriptionService.updateSubscription(data.id, data.updateData);
  }

  @MessagePattern('subscription.cancel')
  async cancelSubscription(@Payload() data: any) {
    return this.subscriptionService.cancelSubscription(data.id);
  }

  @MessagePattern('subscription.validate')
  async validateSubscription(@Payload() data: any) {
    return this.subscriptionService.validateSubscription(data.entityId);
  }
}
