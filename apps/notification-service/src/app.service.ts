import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationService {
  async sendNotification(data: any) {
    return { message: 'Send notification endpoint', data };
  }

  async sendBulkNotification(data: any) {
    return { message: 'Send bulk notification endpoint', data };
  }

  async notificationHistory(entityId: string, filters: any) {
    return { message: 'Notification history endpoint', entityId, filters };
  }
}
