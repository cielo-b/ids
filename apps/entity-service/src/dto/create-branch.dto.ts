import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  IsPhoneNumber,
  IsObject,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBranchDto {
  @ApiProperty({ example: 'entity-uuid' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({ example: 'La Belle - Downtown' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Our flagship location' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'manager-uuid' })
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiPropertyOptional({ example: 'downtown@labellerestaurant.rw' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+250788123456' })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiProperty({ example: 'KN 4 Ave, Kigali' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Kigali' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Rwanda' })
  @IsString()
  @IsNotEmpty()
  country: string;

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

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalTables?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPumps?: number;
}
