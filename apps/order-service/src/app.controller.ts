import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrderService } from './app.service';

@Controller()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @MessagePattern('order.create')
  async createOrder(@Payload() data: any) {
    return this.orderService.createOrder(data);
  }

  @MessagePattern('order.get')
  async getOrder(@Payload() data: any) {
    return this.orderService.getOrder(data.id);
  }

  @MessagePattern('order.update')
  async updateOrder(@Payload() data: any) {
    return this.orderService.updateOrder(data.id, data.updateData);
  }

  @MessagePattern('order.list')
  async listOrders(@Payload() data: any) {
    return this.orderService.listOrders(data.entityId, data.filters);
  }

  @MessagePattern('order.process')
  async processOrder(@Payload() data: any) {
    return this.orderService.processOrder(data.id);
  }
}
