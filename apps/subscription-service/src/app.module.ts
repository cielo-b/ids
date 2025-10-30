import { Module } from '@nestjs/common';
import { SubscriptionController } from './app.controller';
import { SubscriptionService } from './app.service';

@Module({
  imports: [],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
})
export class SubscriptionModule {}
