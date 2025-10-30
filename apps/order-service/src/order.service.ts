import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { SplitBillDto } from './dto/split-bill.dto';
import { ResponseUtil, QRCodeUtil, OrderStatus } from '@app/common';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    // Generate unique order number
    const orderNumber = await this.generateOrderNumber();

    // Calculate totals
    let subtotal = 0;
    const orderItems: OrderItem[] = [];

    for (const item of createOrderDto.items) {
      const totalPrice = item.price * item.quantity;
      subtotal += totalPrice;

      const orderItem = this.orderItemRepository.create({
        menuItemId: item.menuItemId,
        menuItemName: item.menuItemName,
        price: item.price,
        quantity: item.quantity,
        totalPrice,
        specialInstructions: item.specialInstructions,
        addedBy: item.addedBy || createOrderDto.customerId,
      });

      orderItems.push(orderItem);
    }

    const tipAmount = createOrderDto.tipAmount || 0;
    const discount = 0; // Will be calculated if promotion applied
    const tax = 0; // Tax calculation logic can be added
    const total = subtotal - discount + tax + tipAmount;

    // Create order
    const order = this.orderRepository.create({
      orderNumber,
      entityId: createOrderDto.entityId,
      branchId: createOrderDto.branchId,
      customerId: createOrderDto.customerId,
      employeeId: createOrderDto.employeeId,
      tableNumber: createOrderDto.tableNumber,
      stationNumber: createOrderDto.stationNumber,
      items: orderItems,
      subtotal,
      discount,
      tax,
      tipAmount,
      total,
      status: OrderStatus.INCOMING,
      specialInstructions: createOrderDto.specialInstructions,
      isBulkOrder: createOrderDto.isBulkOrder || false,
      bulkOrderInitiatorId: createOrderDto.bulkOrderInitiatorId,
    });

    // Generate QR code for order tracking
    const qrData = JSON.stringify({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
    });
    order.qrCode = await QRCodeUtil.generate(qrData);

    const savedOrder = await this.orderRepository.save(order);

    return ResponseUtil.success(savedOrder, 'Order created successfully');
  }

  async findAll(
    entityId?: string,
    customerId?: string,
    employeeId?: string,
    status?: OrderStatus,
  ) {
    const queryBuilder = this.orderRepository.createQueryBuilder('order');

    if (entityId) {
      queryBuilder.andWhere('order.entityId = :entityId', { entityId });
    }

    if (customerId) {
      queryBuilder.andWhere('order.customerId = :customerId', { customerId });
    }

    if (employeeId) {
      queryBuilder.andWhere('order.employeeId = :employeeId', { employeeId });
    }

    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    const orders = await queryBuilder
      .orderBy('order.createdAt', 'DESC')
      .getMany();

    return ResponseUtil.success(orders);
  }

  async findOne(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return ResponseUtil.success(order);
  }

  async updateStatus(id: string, updateStatusDto: UpdateOrderStatusDto) {
    const order = await this.orderRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const oldStatus = order.status;
    order.status = updateStatusDto.status;

    // Update timestamps based on status
    switch (updateStatusDto.status) {
      case OrderStatus.PROCESSING:
        order.acceptedAt = new Date();
        order.preparingAt = new Date();
        break;
      case OrderStatus.SERVED:
        order.servedAt = new Date();
        break;
      case OrderStatus.PAID:
        order.paidAt = new Date();
        break;
      case OrderStatus.CANCELLED:
        order.cancelledAt = new Date();
        order.cancelReason = updateStatusDto.cancelReason;
        order.cancelledBy = updateStatusDto.cancelledBy;
        break;
    }

    // Regenerate QR code with updated status
    const qrData = JSON.stringify({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
    });
    order.qrCode = await QRCodeUtil.generate(qrData);

    const updatedOrder = await this.orderRepository.save(order);

    return ResponseUtil.success(
      updatedOrder,
      'Order status updated successfully',
    );
  }

  async splitBill(id: string, splitBillDto: SplitBillDto) {
    const order = await this.orderRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.PAID) {
      throw new ConflictException('Order is already paid');
    }

    // Validate split amounts
    const totalSplit = splitBillDto.splitDetails.reduce(
      (sum, detail) => sum + detail.amount,
      0,
    );

    if (Math.abs(totalSplit - parseFloat(order.total.toString())) > 0.01) {
      throw new BadRequestException('Split amounts do not match order total');
    }

    order.isSplitBill = true;
    order.splitDetails = splitBillDto.splitDetails.map((detail) => ({
      userId: detail.userId,
      amount: detail.amount,
      paid: false,
    }));

    const updatedOrder = await this.orderRepository.save(order);

    return ResponseUtil.success(updatedOrder, 'Bill split successfully');
  }

  async markSplitPaid(id: string, userId: string) {
    const order = await this.orderRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!order.isSplitBill || !order.splitDetails) {
      throw new BadRequestException('Order is not split');
    }

    const splitDetail = order.splitDetails.find((d) => d.userId === userId);

    if (!splitDetail) {
      throw new NotFoundException('User not found in split bill');
    }

    if (splitDetail.paid) {
      throw new ConflictException('User has already paid');
    }

    splitDetail.paid = true;

    // Check if all participants have paid
    const allPaid = order.splitDetails.every((d) => d.paid);

    if (allPaid) {
      order.status = OrderStatus.PAID;
      order.paidAt = new Date();
    }

    const updatedOrder = await this.orderRepository.save(order);

    return ResponseUtil.success(updatedOrder, 'Payment recorded successfully');
  }

  async addTip(id: string, tipAmount: number) {
    const order = await this.orderRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    order.tipAmount = tipAmount;
    order.total =
      parseFloat(order.subtotal.toString()) -
      parseFloat(order.discount.toString()) +
      parseFloat(order.tax.toString()) +
      tipAmount;

    const updatedOrder = await this.orderRepository.save(order);

    return ResponseUtil.success(updatedOrder, 'Tip added successfully');
  }

  async cancel(id: string, reason: string, cancelledBy: string) {
    const order = await this.orderRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.PAID) {
      throw new ConflictException('Cannot cancel a paid order');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new ConflictException('Order is already cancelled');
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();
    order.cancelReason = reason;
    order.cancelledBy = cancelledBy;

    const updatedOrder = await this.orderRepository.save(order);

    return ResponseUtil.success(updatedOrder, 'Order cancelled successfully');
  }

  async getOrdersByTimeRange(entityId: string, startDate: Date, endDate: Date) {
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.entityId = :entityId', { entityId })
      .andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getMany();

    return ResponseUtil.success(orders);
  }

  async getOrderStats(entityId?: string, employeeId?: string) {
    const queryBuilder = this.orderRepository.createQueryBuilder('order');

    if (entityId) {
      queryBuilder.where('order.entityId = :entityId', { entityId });
    }

    if (employeeId) {
      queryBuilder.andWhere('order.employeeId = :employeeId', { employeeId });
    }

    const totalOrders = await queryBuilder.getCount();

    const paidOrders = await queryBuilder
      .clone()
      .andWhere('order.status = :status', { status: OrderStatus.PAID })
      .getCount();

    const activeOrders = await queryBuilder
      .clone()
      .andWhere('order.status IN (:...statuses)', {
        statuses: [
          OrderStatus.INCOMING,
          OrderStatus.PROCESSING,
          OrderStatus.SERVED,
        ],
      })
      .getCount();

    const cancelledOrders = await queryBuilder
      .clone()
      .andWhere('order.status = :status', { status: OrderStatus.CANCELLED })
      .getCount();

    const totalRevenue = await queryBuilder
      .clone()
      .andWhere('order.status = :status', { status: OrderStatus.PAID })
      .select('SUM(order.total)', 'total')
      .getRawOne();

    return ResponseUtil.success({
      totalOrders,
      paidOrders,
      activeOrders,
      cancelledOrders,
      totalRevenue: totalRevenue?.total || 0,
    });
  }

  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const count = await this.orderRepository.count();
    const sequence = String(count + 1).padStart(6, '0');

    return `ORD-${year}${month}${day}-${sequence}`;
  }

  async remove(id: string) {
    const order = await this.orderRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.orderRepository.remove(order);

    return ResponseUtil.success(null, 'Order deleted successfully');
  }
}
