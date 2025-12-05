import { PartialType } from '@nestjs/swagger';
import { CreatePumpDto } from './create-pump.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePumpDto extends PartialType(CreatePumpDto) {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
