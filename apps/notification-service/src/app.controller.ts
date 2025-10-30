import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './app.service';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @MessagePattern('notification.send')
  async sendNotification(@Payload() data: any) {
    return this.notificationService.sendNotification(data);
  }

  @MessagePattern('notification.bulk')
  async sendBulkNotification(@Payload() data: any) {
    return this.notificationService.sendBulkNotification(data);
  }

  @MessagePattern('notification.history')
  async notificationHistory(@Payload() data: any) {
    return this.notificationService.notificationHistory(data.entityId, data.filters);
  }
}
