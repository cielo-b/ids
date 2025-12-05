import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TableStatus } from '../entities/table.entity';

export class CreateTableDto {
  @ApiProperty({ example: 'entity-uuid' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({ example: 'branch-uuid' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: 'Table 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  @Max(20)
  capacity: number;

  @ApiPropertyOptional({ enum: TableStatus, example: TableStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(TableStatus)
  status?: TableStatus;

  @ApiPropertyOptional({ example: 'Window seat' })
  @IsOptional()
  @IsString()
  notes?: string;
}
