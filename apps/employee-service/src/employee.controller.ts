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
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { EmployeeStatus } from '@app/common';

@ApiTags('Employees')
@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new employee' })
  @ApiResponse({ status: 201, description: 'Employee created successfully' })
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeeService.create(createEmployeeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all employees' })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: EmployeeStatus })
  findAll(
    @Query('entityId') entityId?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: EmployeeStatus,
  ) {
    return this.employeeService.findAll(entityId, branchId, status);
  }

  @Get('available/:entityId')
  @ApiOperation({ summary: 'Get available employees' })
  @ApiQuery({ name: 'branchId', required: false })
  getAvailable(
    @Param('entityId') entityId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.employeeService.getAvailableEmployees(entityId, branchId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get employee statistics' })
  @ApiQuery({ name: 'entityId', required: false })
  getStats(@Query('entityId') entityId?: string) {
    return this.employeeService.getStats(entityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by ID' })
  findOne(@Param('id') id: string) {
    return this.employeeService.findOne(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get employee by user ID' })
  findByUserId(@Param('userId') userId: string) {
    return this.employeeService.findByUserId(userId);
  }

  @Get(':id/performance')
  @ApiOperation({ summary: 'Get employee performance metrics' })
  getPerformance(@Param('id') id: string) {
    return this.employeeService.getPerformance(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update employee' })
  update(@Param('id') id: string, @Body() updateEmployeeDto: UpdateEmployeeDto) {
    return this.employeeService.update(id, updateEmployeeDto);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update employee status' })
  updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateStatusDto) {
    return this.employeeService.updateStatus(id, updateStatusDto);
  }

  @Patch(':id/increment-orders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Increment active orders count' })
  incrementActiveOrders(@Param('id') id: string) {
    return this.employeeService.incrementActiveOrders(id);
  }

  @Patch(':id/decrement-orders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decrement active orders count' })
  decrementActiveOrders(@Param('id') id: string) {
    return this.employeeService.decrementActiveOrders(id);
  }

  @Patch(':id/revenue/:amount')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update employee revenue' })
  updateRevenue(@Param('id') id: string, @Param('amount') amount: number) {
    return this.employeeService.updateRevenue(id, amount);
  }

  @Patch(':id/tip/:amount')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add tip to employee' })
  addTip(@Param('id') id: string, @Param('amount') amount: number) {
    return this.employeeService.addTip(id, amount);
  }

  @Patch(':id/rating/:rating')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update employee rating' })
  updateRating(@Param('id') id: string, @Param('rating') rating: number) {
    return this.employeeService.updateRating(id, rating);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete employee' })
  remove(@Param('id') id: string) {
    return this.employeeService.remove(id);
  }
}

