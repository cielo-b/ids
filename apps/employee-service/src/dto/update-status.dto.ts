import { IsEnum, IsNotEmpty } from 'class-validator';
import { EmployeeStatus } from '@app/common';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStatusDto {
  @ApiProperty({ enum: EmployeeStatus, example: EmployeeStatus.AVAILABLE })
  @IsEnum(EmployeeStatus)
  @IsNotEmpty()
  status: EmployeeStatus;
}

