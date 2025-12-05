import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { SplitBillDto } from './dto/split-bill.dto';
import {
  ResponseUtil,
  QRCodeUtil,
  OrderStatus,
  UserRole,
  JwtPayload,
  JwtPayloadWithRole,
  QueryFilterUtil,
  EventService,
  EventType,
} from '@app/common';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly eventService: EventService,
  ) {}

  async create(
    createOrderDto: CreateOrderDto,
    currentUser?: JwtPayloadWithRole,
  ) {
    // Check access permissions
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        if (createOrderDto.entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            'Access denied: Cannot create orders for other entities',
          );
        }
      } else if (
        currentUser.role === UserRole.MANAGER ||
        currentUser.role === UserRole.EMPLOYEE
      ) {
        if (createOrderDto.entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            'Access denied: Cannot create orders for other entities',
          );
        }
        if (
          createOrderDto.branchId &&
          createOrderDto.branchId !== currentUser.branchId
        ) {
          throw new ForbiddenException(
            'Access denied: Cannot create orders for other branches',
          );
        }
      }
    }

    // Generate unique order number and code
    const orderNumber = await this.generateOrderNumber();
    const orderCode = await this.generateOrderCode(createOrderDto.entityId);

    // Calculate totals
    let subtotal = 0;
    const orderItems: OrderItem[] = [];

    for (const item of createOrderDto.items) {
      // Calculate item total including addons
      let itemTotal = item.basePrice * item.quantity;
      if (item.addons && item.addons.length > 0) {
        const addonsTotal = item.addons.reduce(
          (sum, addon) => sum + addon.price,
          0,
        );
        itemTotal += addonsTotal * item.quantity;
      }
      subtotal += itemTotal;

      const orderItem = this.orderItemRepository.create({
        menuItemId: item.menuItemId,
        menuItemName: item.menuItemName,
        imageUrl: item.imageUrl,
        basePrice: item.basePrice,
        quantity: item.quantity,
        addons: item.addons,
        notes: item.notes,
      });

      orderItems.push(orderItem);
    }

    const tipAmount = createOrderDto.tipAmount || 0;
    const discount = 0; // Will be calculated if promotion applied
    const tax = subtotal * 0.12; // 12% tax (can be made configurable)
    const total = subtotal - discount + tax + tipAmount;

    // Calculate progress (0% for incoming)
    const progress = this.calculateProgress(OrderStatus.INCOMING);

    // Create timeline entry
    const timeline = [
      {
        status: OrderStatus.INCOMING,
        timestamp: new Date(),
        userId: currentUser?.sub,
        notes: 'Order created from POS',
      },
    ];

    // Create order
    const order = this.orderRepository.create({
      orderNumber,
      code: orderCode,
      entityId: createOrderDto.entityId,
      branchId: createOrderDto.branchId,
      branchName: createOrderDto.branchName,
      customer: createOrderDto.customer,
      assignment: createOrderDto.assignment,
      tableId: createOrderDto.tableId,
      tableName: createOrderDto.tableName,
      items: orderItems,
      subtotal,
      discount,
      tax,
      tipAmount,
      total,
      status: OrderStatus.INCOMING,
      progress,
      notes: createOrderDto.notes,
      timeline,
    });

    // Generate QR code for order tracking
    const qrData = JSON.stringify({
      orderId: order.id,
      orderCode: order.code,
      status: order.status,
    });
    order.qrCode = await QRCodeUtil.generate(qrData);

    const savedOrder = await this.orderRepository.save(order);

    // Emit order created event
    this.eventService.emitOrderCreated({
      orderId: savedOrder.id,
      orderCode: savedOrder.code,
      entityId: savedOrder.entityId,
      branchId: savedOrder.branchId,
      userId: currentUser?.sub,
      customerName: (savedOrder.customer as any)?.name,
      status: savedOrder.status,
    } as any);

    return ResponseUtil.success(savedOrder, 'Order created successfully');
  }

  async findAll(
    entityId?: string,
    branchId?: string,
    status?: OrderStatus,
    currentUser?: JwtPayloadWithRole,
  ) {
    const queryBuilder = this.orderRepository.createQueryBuilder('order');

    // Apply data isolation
    if (currentUser) {
      QueryFilterUtil.applyEntityFilter(
        queryBuilder,
        currentUser,
        'order.entityId',
      );

      // Managers can only see orders in their branch
      if (currentUser.role === UserRole.MANAGER) {
        QueryFilterUtil.applyBranchFilter(
          queryBuilder,
          currentUser,
          'order.branchId',
        );
      } else if (currentUser.role === UserRole.EMPLOYEE) {
        // Employees can only see orders assigned to them or created by them
        queryBuilder.andWhere(
          "(order.assignment->>'assignedEmployeeId' = :employeeId OR order.assignment->>'createdByUserId' = :userId)",
          { employeeId: currentUser.sub, userId: currentUser.sub },
        );
      } else if (currentUser.role === UserRole.CUSTOMER) {
        // Customers can only see their own orders
        queryBuilder.andWhere("order.customer->>'name' = :customerName", {
          customerName: currentUser.email, // Using email as identifier, adjust as needed
        });
      }
    }

    if (entityId) {
      queryBuilder.andWhere('order.entityId = :entityId', { entityId });
    }

    if (branchId) {
      queryBuilder.andWhere('order.branchId = :branchId', { branchId });
    }

    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    const orders = await queryBuilder
      .orderBy('order.createdAt', 'DESC')
      .getMany();

    return ResponseUtil.success(orders);
  }

  async findOne(id: string, currentUser?: JwtPayloadWithRole) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check access permissions
    if (currentUser) {
      if (!QueryFilterUtil.canAccessEntity(currentUser, order.entityId)) {
        throw new ForbiddenException(
          'Access denied: Cannot access order from another entity',
        );
      }

      // Managers can only access orders in their branch
      if (currentUser.role === UserRole.MANAGER) {
        if (
          !QueryFilterUtil.canAccessBranch(
            currentUser,
            order.branchId || '',
            order.entityId,
          )
        ) {
          throw new ForbiddenException(
            'Access denied: Cannot access order from another branch',
          );
        }
      } else if (currentUser.role === UserRole.EMPLOYEE) {
        // Employees can only access orders assigned to them or created by them
        const assignment = order.assignment as any;
        if (
          assignment?.assignedEmployeeId !== currentUser.sub &&
          assignment?.createdByUserId !== currentUser.sub
        ) {
          throw new ForbiddenException(
            'Access denied: Cannot access order not assigned to you',
          );
        }
      } else if (currentUser.role === UserRole.CUSTOMER) {
        // Customers can only access their own orders
        const customer = order.customer as any;
        if (customer?.email !== currentUser.email) {
          throw new ForbiddenException(
            "Access denied: Cannot access other customers' orders",
          );
        }
      }
    }

    return ResponseUtil.success(order);
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateOrderStatusDto,
    currentUser?: JwtPayloadWithRole,
  ) {
    const order = await this.orderRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check access permissions
    if (currentUser) {
      if (!QueryFilterUtil.canAccessEntity(currentUser, order.entityId)) {
        throw new ForbiddenException(
          'Access denied: Cannot update order from another entity',
        );
      }

      // Managers can only update orders in their branch
      if (currentUser.role === UserRole.MANAGER) {
        if (
          !QueryFilterUtil.canAccessBranch(
            currentUser,
            order.branchId || '',
            order.entityId,
          )
        ) {
          throw new ForbiddenException(
            'Access denied: Cannot update order from another branch',
          );
        }
      } else if (currentUser.role === UserRole.EMPLOYEE) {
        // Employees can only update orders assigned to them
        const assignment = order.assignment as any;
        if (assignment?.assignedEmployeeId !== currentUser.sub) {
          throw new ForbiddenException(
            'Access denied: Cannot update order not assigned to you',
          );
        }
      }
    }

    const oldStatus = order.status;
    order.status = updateStatusDto.status;
    order.progress = this.calculateProgress(updateStatusDto.status);

    // Update timestamps based on status
    const now = new Date();
    switch (updateStatusDto.status) {
      case OrderStatus.PREPARING:
        order.preparingAt = now;
        break;
      case OrderStatus.READY:
        // Ready status
        break;
      case OrderStatus.SERVED:
        order.servedAt = now;
        break;
      case OrderStatus.COMPLETED:
        order.paidAt = now;
        break;
      case OrderStatus.CANCELLED:
        order.cancelledAt = now;
        order.cancelReason = updateStatusDto.cancelReason;
        order.cancelledBy = updateStatusDto.cancelledBy || currentUser?.sub;
        break;
    }

    // Update timeline
    const timeline = order.timeline || [];
    timeline.push({
      status: updateStatusDto.status,
      timestamp: now,
      userId: currentUser?.sub,
      notes: updateStatusDto.notes,
    });
    order.timeline = timeline;

    // Regenerate QR code with updated status
    const qrData = JSON.stringify({
      orderId: order.id,
      orderCode: order.code,
      status: order.status,
    });
    order.qrCode = await QRCodeUtil.generate(qrData);

    const updatedOrder = await this.orderRepository.save(order);

    // Emit order status changed event
    this.eventService.emitOrderStatusChanged({
      orderId: updatedOrder.id,
      orderCode: updatedOrder.code,
      entityId: updatedOrder.entityId,
      branchId: updatedOrder.branchId,
      userId: currentUser?.sub,
      status: updatedOrder.status,
      customerName: (updatedOrder.customer as any)?.name,
    } as any);

    // Also emit order updated event
    this.eventService.emitOrderUpdated({
      orderId: updatedOrder.id,
      orderCode: updatedOrder.code,
      entityId: updatedOrder.entityId,
      branchId: updatedOrder.branchId,
      userId: currentUser?.sub,
      status: updatedOrder.status,
    } as any);

    return ResponseUtil.success(
      updatedOrder,
      'Order status updated successfully',
    );
  }

  async splitBill(
    id: string,
    splitBillDto: SplitBillDto,
    currentUser?: JwtPayloadWithRole,
  ) {
    const order = await this.orderRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check access permissions
    if (currentUser) {
      if (!QueryFilterUtil.canAccessEntity(currentUser, order.entityId)) {
        throw new ForbiddenException(
          'Access denied: Cannot split bill for order from another entity',
        );
      }

      // Managers can only split bills for orders in their branch
      if (currentUser.role === UserRole.MANAGER) {
        if (
          !QueryFilterUtil.canAccessBranch(
            currentUser,
            order.branchId || '',
            order.entityId,
          )
        ) {
          throw new ForbiddenException(
            'Access denied: Cannot split bill for order from another branch',
          );
        }
      }
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new ConflictException('Order is already completed');
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

  async markSplitPaid(
    id: string,
    userId: string,
    currentUser?: JwtPayloadWithRole,
  ) {
    const order = await this.orderRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check access permissions
    if (currentUser) {
      if (!QueryFilterUtil.canAccessEntity(currentUser, order.entityId)) {
        throw new ForbiddenException(
          'Access denied: Cannot mark split payment for order from another entity',
        );
      }
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
      order.status = OrderStatus.COMPLETED;
      order.paidAt = new Date();
      order.progress = 100;

      // Emit order completed event
      this.eventService.emit(EventType.ORDER_COMPLETED, {
        orderId: order.id,
        orderCode: order.code,
        entityId: order.entityId,
        branchId: order.branchId,
        userId: currentUser?.sub,
        status: order.status,
        customerName: (order.customer as any)?.name,
        eventType: EventType.ORDER_COMPLETED,
        timestamp: new Date(),
      } as any);
    }

    const updatedOrder = await this.orderRepository.save(order);

    return ResponseUtil.success(updatedOrder, 'Payment recorded successfully');
  }

  async addTip(
    id: string,
    tipAmount: number,
    currentUser?: JwtPayloadWithRole,
  ) {
    const order = await this.orderRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check access permissions
    if (currentUser) {
      if (!QueryFilterUtil.canAccessEntity(currentUser, order.entityId)) {
        throw new ForbiddenException(
          'Access denied: Cannot add tip to order from another entity',
        );
      }
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

  async cancel(
    id: string,
    reason: string,
    cancelledBy: string,
    currentUser?: JwtPayloadWithRole,
  ) {
    const order = await this.orderRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check access permissions
    if (currentUser) {
      if (!QueryFilterUtil.canAccessEntity(currentUser, order.entityId)) {
        throw new ForbiddenException(
          'Access denied: Cannot cancel order from another entity',
        );
      }

      // Managers can only cancel orders in their branch
      if (currentUser.role === UserRole.MANAGER) {
        if (
          !QueryFilterUtil.canAccessBranch(
            currentUser,
            order.branchId || '',
            order.entityId,
          )
        ) {
          throw new ForbiddenException(
            'Access denied: Cannot cancel order from another branch',
          );
        }
      }
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new ConflictException('Cannot cancel a completed order');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new ConflictException('Order is already cancelled');
    }

    order.status = OrderStatus.CANCELLED;
    order.progress = 0;
    order.cancelledAt = new Date();
    order.cancelReason = reason;
    order.cancelledBy = cancelledBy;

    // Update timeline
    const timeline = order.timeline || [];
    timeline.push({
      status: OrderStatus.CANCELLED,
      timestamp: new Date(),
      userId: currentUser?.sub,
      notes: reason,
    });
    order.timeline = timeline;

    const updatedOrder = await this.orderRepository.save(order);

    // Emit order cancelled event
    this.eventService.emit(EventType.ORDER_CANCELLED, {
      orderId: updatedOrder.id,
      orderCode: updatedOrder.code,
      entityId: updatedOrder.entityId,
      branchId: updatedOrder.branchId,
      userId: currentUser?.sub,
      status: updatedOrder.status,
      customerName: (updatedOrder.customer as any)?.name,
      eventType: EventType.ORDER_CANCELLED,
      timestamp: new Date(),
    } as any);

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

  async getOrderStats(
    entityId?: string,
    employeeId?: string,
    currentUser?: JwtPayloadWithRole,
  ) {
    const queryBuilder = this.orderRepository.createQueryBuilder('order');

    // Apply data isolation
    if (currentUser) {
      QueryFilterUtil.applyEntityFilter(
        queryBuilder,
        currentUser,
        'order.entityId',
      );

      // Managers can only see stats for their branch
      if (currentUser.role === UserRole.MANAGER) {
        QueryFilterUtil.applyBranchFilter(
          queryBuilder,
          currentUser,
          'order.branchId',
        );
      } else if (currentUser.role === UserRole.EMPLOYEE) {
        // Employees can only see stats for orders assigned to them
        queryBuilder.andWhere(
          "order.assignment->>'assignedEmployeeId' = :employeeId",
          { employeeId: currentUser.sub },
        );
      }
    }

    if (entityId) {
      queryBuilder.andWhere('order.entityId = :entityId', { entityId });
    }

    if (employeeId) {
      queryBuilder.andWhere(
        "order.assignment->>'assignedEmployeeId' = :employeeId",
        { employeeId },
      );
    }

    const totalOrders = await queryBuilder.getCount();

    const completedOrders = await queryBuilder
      .clone()
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .getCount();

    const activeOrders = await queryBuilder
      .clone()
      .andWhere('order.status IN (:...statuses)', {
        statuses: [
          OrderStatus.INCOMING,
          OrderStatus.PREPARING,
          OrderStatus.READY,
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
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .select('SUM(order.total)', 'total')
      .getRawOne();

    return ResponseUtil.success({
      totalOrders,
      completedOrders,
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

  private async generateOrderCode(entityId: string): Promise<string> {
    // Generate order code like "DI104"
    // Format: Prefix (2 letters) + Number (3 digits)
    const prefix = 'DI'; // Can be made configurable per entity
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const count = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.entityId = :entityId', { entityId })
      .andWhere('order.createdAt BETWEEN :startOfDay AND :endOfDay', {
        startOfDay,
        endOfDay,
      })
      .getCount();

    const sequence = String(count + 1).padStart(3, '0');
    return `${prefix}${sequence}`;
  }

  private calculateProgress(status: OrderStatus): number {
    switch (status) {
      case OrderStatus.INCOMING:
        return 0;
      case OrderStatus.PREPARING:
        return 25;
      case OrderStatus.READY:
        return 50;
      case OrderStatus.SERVED:
        return 75;
      case OrderStatus.COMPLETED:
        return 100;
      case OrderStatus.CANCELLED:
        return 0;
      default:
        return 0;
    }
  }

  async remove(id: string, currentUser?: JwtPayloadWithRole) {
    const order = await this.orderRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check access permissions - only superadmin and entity owners can delete orders
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        if (order.entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            'Access denied: Cannot delete order from another entity',
          );
        }
      } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          'Access denied: Only superadmin and entity owners can delete orders',
        );
      }
    }

    await this.orderRepository.remove(order);

    return ResponseUtil.success(null, 'Order deleted successfully');
  }
}
