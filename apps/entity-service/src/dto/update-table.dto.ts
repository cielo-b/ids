import { PartialType } from '@nestjs/swagger';
import { CreateTableDto } from './create-table.dto';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTableDto extends PartialType(CreateTableDto) {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
