import { Module } from '@nestjs/common';
import { NotificationController } from './app.controller';
import { NotificationService } from './app.service';

@Module({
  imports: [],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule {}
