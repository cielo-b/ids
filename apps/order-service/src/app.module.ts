import { Module } from '@nestjs/common';
import { OrderController } from './app.controller';
import { OrderService } from './app.service';

@Module({
  imports: [],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
