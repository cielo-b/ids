import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderAddonDto {
  @ApiProperty({ example: 'addon-uuid' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 'Extra Cheese' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 2.5 })
  @IsNumber()
  @Min(0)
  price: number;
}

export class OrderItemDto {
  @ApiProperty({ example: 'menu-item-uuid' })
  @IsString()
  @IsNotEmpty()
  menuItemId: string;

  @ApiProperty({ example: 'Grilled Chicken' })
  @IsString()
  @IsNotEmpty()
  menuItemName: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 15.99 })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ type: [OrderAddonDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderAddonDto)
  addons?: OrderAddonDto[];

  @ApiPropertyOptional({ example: 'No onions' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class OrderCustomerDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsString()
  email?: string;
}

export class OrderAssignmentDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  @IsNotEmpty()
  createdByUserId: string;

  @ApiProperty({ example: 'MANAGER' })
  @IsString()
  @IsNotEmpty()
  createdByRole: string;

  @ApiPropertyOptional({ example: 'employee-uuid' })
  @IsOptional()
  @IsString()
  assignedEmployeeId?: string;

  @ApiPropertyOptional({ example: 'John Employee' })
  @IsOptional()
  @IsString()
  assignedEmployeeName?: string;

  @ApiPropertyOptional({ example: 'branch-uuid' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ example: 'Main Branch' })
  @IsOptional()
  @IsString()
  branchName?: string;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'entity-uuid' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiPropertyOptional({ example: 'branch-uuid' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ example: 'Main Branch' })
  @IsOptional()
  @IsString()
  branchName?: string;

  @ApiProperty({ type: OrderCustomerDto })
  @ValidateNested()
  @Type(() => OrderCustomerDto)
  customer: OrderCustomerDto;

  @ApiProperty({ type: OrderAssignmentDto })
  @ValidateNested()
  @Type(() => OrderAssignmentDto)
  assignment: OrderAssignmentDto;

  @ApiPropertyOptional({ example: 'table-uuid' })
  @IsOptional()
  @IsString()
  tableId?: string;

  @ApiPropertyOptional({ example: 'Table 1' })
  @IsOptional()
  @IsString()
  tableName?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ example: 5.0 })
  @IsOptional()
  @IsNumber()
  tipAmount?: number;

  @ApiPropertyOptional({ example: 'promotion-uuid' })
  @IsOptional()
  @IsString()
  promotionId?: string;

  @ApiPropertyOptional({ example: 'Please deliver quickly' })
  @IsOptional()
  @IsString()
  notes?: string;
}
