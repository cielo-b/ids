import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseFloatPipe,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { SplitBillDto } from './dto/split-bill.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { OrderStatus } from '@app/common';

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  findAll(
    @Query('entityId') entityId?: string,
    @Query('customerId') customerId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: OrderStatus,
  ) {
    return this.orderService.findAll(entityId, customerId, employeeId, status);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get order statistics' })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  getStats(
    @Query('entityId') entityId?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.orderService.getOrderStats(entityId, employeeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({
    status: 200,
    description: 'Order status updated successfully',
  })
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatus(id, updateStatusDto);
  }

  @Post(':id/split')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Split bill among participants' })
  @ApiResponse({ status: 200, description: 'Bill split successfully' })
  splitBill(@Param('id') id: string, @Body() splitBillDto: SplitBillDto) {
    return this.orderService.splitBill(id, splitBillDto);
  }

  @Patch(':id/split/:userId/paid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark split payment as paid' })
  @ApiResponse({ status: 200, description: 'Payment recorded successfully' })
  markSplitPaid(@Param('id') id: string, @Param('userId') userId: string) {
    return this.orderService.markSplitPaid(id, userId);
  }

  @Patch(':id/tip/:amount')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add tip to order' })
  @ApiResponse({ status: 200, description: 'Tip added successfully' })
  addTip(
    @Param('id') id: string,
    @Param('amount', ParseFloatPipe) amount: number,
  ) {
    return this.orderService.addTip(id, amount);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  cancel(
    @Param('id') id: string,
    @Body() body: { reason: string; cancelledBy: string },
  ) {
    return this.orderService.cancel(id, body.reason, body.cancelledBy);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete order' })
  @ApiResponse({ status: 200, description: 'Order deleted successfully' })
  remove(@Param('id') id: string) {
    return this.orderService.remove(id);
  }
}
