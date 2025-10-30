import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { EmployeeStatus } from '@app/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'entity-uuid' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiPropertyOptional({ example: 'branch-uuid' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ example: 'Waiter' })
  @IsString()
  @IsNotEmpty()
  position: string;

  @ApiPropertyOptional({ enum: EmployeeStatus, example: EmployeeStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;
}

