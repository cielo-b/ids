import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  IsDate,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePromotionDto {
  @ApiProperty({ example: 'entity-uuid' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({ example: 'Summer Special' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '20% off on all items' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'PERCENTAGE', enum: ['PERCENTAGE', 'FIXED_AMOUNT', 'BUY_X_GET_Y'] })
  @IsEnum(['PERCENTAGE', 'FIXED_AMOUNT', 'BUY_X_GET_Y'])
  @IsNotEmpty()
  discountType: string;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  discountValue: number;

  @ApiPropertyOptional({ example: ['item-uuid-1', 'item-uuid-2'] })
  @IsOptional()
  @IsArray()
  applicableItems?: string[];

  @ApiPropertyOptional({ example: ['category-uuid-1'] })
  @IsOptional()
  @IsArray()
  applicableCategories?: string[];

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  minimumOrderAmount?: number;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  endDate: Date;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  usageLimit?: number;
}

