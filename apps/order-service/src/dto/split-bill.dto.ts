import {
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsNumber,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SplitDetailDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 25.5 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;
}

export class SplitBillDto {
  @ApiProperty({ type: [SplitDetailDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitDetailDto)
  splitDetails: SplitDetailDto[];
}
