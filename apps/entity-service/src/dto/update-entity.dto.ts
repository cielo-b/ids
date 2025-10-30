import { PartialType } from '@nestjs/swagger';
import { CreateEntityDto } from './create-entity.dto';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEntityDto extends PartialType(CreateEntityDto) {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ example: 'subscription-uuid' })
  @IsOptional()
  @IsString()
  subscriptionId?: string;
}
