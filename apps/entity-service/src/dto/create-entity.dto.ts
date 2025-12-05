import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsEmail,
  IsPhoneNumber,
  IsObject,
  IsNumber,
} from 'class-validator';
import { EntityCategory } from '@app/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEntityDto {
  @ApiProperty({ example: 'La Belle Restaurant' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'Fine dining restaurant in downtown Kigali',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: EntityCategory, example: EntityCategory.RESTAURANT })
  @IsEnum(EntityCategory)
  @IsNotEmpty()
  category: EntityCategory;

  @ApiPropertyOptional({
    example: 'owner-uuid',
    description: 'Optional. Can be set later when creating entity owner user.',
  })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ example: 'contact@labellerestaurant.rw' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+250788123456' })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({ example: 'KN 4 Ave, Kigali' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Kigali' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Rwanda' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: -1.9441 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 30.0619 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  workingHours?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: any;
}
