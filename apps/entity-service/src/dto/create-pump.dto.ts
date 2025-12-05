import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PumpStatus } from '../entities/pump.entity';

export class CreatePumpDto {
  @ApiProperty({ example: 'entity-uuid' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({ example: 'branch-uuid' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: 'Pump 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'P-01' })
  @IsString()
  @IsNotEmpty()
  pumpNumber: string;

  @ApiPropertyOptional({ enum: PumpStatus, example: PumpStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(PumpStatus)
  status?: PumpStatus;

  @ApiPropertyOptional({ example: 'Petrol' })
  @IsOptional()
  @IsString()
  fuelType?: string;

  @ApiPropertyOptional({ example: 1500.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentPrice?: number;

  @ApiPropertyOptional({ example: 'Main pump for premium fuel' })
  @IsOptional()
  @IsString()
  notes?: string;
}
