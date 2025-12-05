import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '@app/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PREPARING })
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status: OrderStatus;

  @ApiPropertyOptional({ example: 'Customer changed mind' })
  @IsOptional()
  @IsString()
  cancelReason?: string;

  @ApiPropertyOptional({ example: 'manager-uuid' })
  @IsOptional()
  @IsString()
  cancelledBy?: string;

  @ApiPropertyOptional({ example: 'Additional notes about status change' })
  @IsOptional()
  @IsString()
  notes?: string;
}
