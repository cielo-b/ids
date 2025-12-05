import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction } from '@app/common';

export class CreateAuditLogDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsString()
  userEmail?: string;

  @ApiProperty({ example: 'ENTITY_OWNER' })
  @IsString()
  @IsNotEmpty()
  userRole: string;

  @ApiProperty({ enum: AuditAction, example: AuditAction.CREATE })
  @IsEnum(AuditAction)
  @IsNotEmpty()
  action: AuditAction;

  @ApiProperty({ example: 'Order' })
  @IsString()
  @IsNotEmpty()
  resourceType: string;

  @ApiPropertyOptional({ example: 'order-uuid' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiProperty({ example: 'entity-uuid' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiPropertyOptional({ example: 'branch-uuid' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ example: 'Order created successfully' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: { status: 'INCOMING' } })
  @IsOptional()
  @IsObject()
  oldValues?: Record<string, any>;

  @ApiPropertyOptional({ example: { status: 'PREPARING' } })
  @IsOptional()
  @IsObject()
  newValues?: Record<string, any>;

  @ApiPropertyOptional({ example: { ipAddress: '127.0.0.1' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
