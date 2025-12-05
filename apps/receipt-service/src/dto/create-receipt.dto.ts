import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  IsDateString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ReceiptPaymentMethod, ReceiptStatus } from "@app/common";

export class CreateReceiptDto {
  @ApiProperty({ example: "order-uuid" })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ example: "DI104" })
  @IsString()
  @IsNotEmpty()
  orderCode: string;

  @ApiProperty({ example: "entity-uuid" })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiPropertyOptional({ example: "branch-uuid" })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ example: "Main Branch" })
  @IsOptional()
  @IsString()
  branchName?: string;

  @ApiProperty({ example: "John Doe" })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiPropertyOptional({ example: "user-uuid" })
  @IsOptional()
  @IsString()
  handledById?: string;

  @ApiPropertyOptional({ example: "John Employee" })
  @IsOptional()
  @IsString()
  handledByName?: string;

  @ApiProperty({
    enum: ReceiptPaymentMethod,
    example: ReceiptPaymentMethod.CASH,
  })
  @IsEnum(ReceiptPaymentMethod)
  @IsNotEmpty()
  paymentMethod: ReceiptPaymentMethod;

  @ApiProperty({ example: 45000 })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiProperty({ example: 5400 })
  @IsNumber()
  @Min(0)
  tax: number;

  @ApiProperty({ example: 50400 })
  @IsNumber()
  @Min(0)
  amountPaid: number;

  @ApiPropertyOptional({ example: "FRW", default: "FRW" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: "2024-11-24T09:05:00Z" })
  @IsDateString()
  @IsNotEmpty()
  servedAt: string;

  @ApiPropertyOptional({ enum: ReceiptStatus, default: ReceiptStatus.ISSUED })
  @IsOptional()
  @IsEnum(ReceiptStatus)
  status?: ReceiptStatus;
}
