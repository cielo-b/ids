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
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { SplitBillDto } from './dto/split-bill.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  OrderStatus,
  JwtAuthGuard,
  RolesGuard,
  Roles,
  UserRole,
  EntityGuard,
  BranchGuard,
  EntityAccess,
  BranchAccess,
  CurrentUser,
  JwtPayload,
} from '@app/common';

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ENTITY_OWNER,
    UserRole.MANAGER,
    UserRole.EMPLOYEE,
  )
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.orderService.create(createOrderDto, currentUser);
  }

  @Get()
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all orders' })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  findAll(
    @Query('entityId') entityId?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: OrderStatus,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.orderService.findAll(entityId, branchId, status, currentUser);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order statistics' })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  getStats(
    @Query('entityId') entityId?: string,
    @Query('employeeId') employeeId?: string,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.orderService.getOrderStats(entityId, employeeId, currentUser);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(@Param('id') id: string, @CurrentUser() currentUser?: JwtPayload) {
    return this.orderService.findOne(id, currentUser);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ENTITY_OWNER,
    UserRole.MANAGER,
    UserRole.EMPLOYEE,
  )
  @EntityAccess()
  @BranchAccess()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({
    status: 200,
    description: 'Order status updated successfully',
  })
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.orderService.updateStatus(id, updateStatusDto, currentUser);
  }

  @Post(':id/split')
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ENTITY_OWNER,
    UserRole.MANAGER,
    UserRole.EMPLOYEE,
  )
  @EntityAccess()
  @BranchAccess()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Split bill among participants' })
  @ApiResponse({ status: 200, description: 'Bill split successfully' })
  splitBill(
    @Param('id') id: string,
    @Body() splitBillDto: SplitBillDto,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.orderService.splitBill(id, splitBillDto, currentUser);
  }

  @Patch(':id/split/:userId/paid')
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark split payment as paid' })
  @ApiResponse({ status: 200, description: 'Payment recorded successfully' })
  markSplitPaid(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.orderService.markSplitPaid(id, userId, currentUser);
  }

  @Patch(':id/tip/:amount')
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add tip to order' })
  @ApiResponse({ status: 200, description: 'Tip added successfully' })
  addTip(
    @Param('id') id: string,
    @Param('amount', ParseFloatPipe) amount: number,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.orderService.addTip(id, amount, currentUser);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @EntityAccess()
  @BranchAccess()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  cancel(
    @Param('id') id: string,
    @Body() body: { reason: string; cancelledBy: string },
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.orderService.cancel(
      id,
      body.reason,
      body.cancelledBy || currentUser?.sub || '',
      currentUser,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER)
  @EntityAccess()
  @BranchAccess()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete order' })
  @ApiResponse({ status: 200, description: 'Order deleted successfully' })
  remove(@Param('id') id: string, @CurrentUser() currentUser?: JwtPayload) {
    return this.orderService.remove(id, currentUser);
  }
}
