import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsBoolean,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class PermissionsDto {
  @IsOptional()
  @IsBoolean()
  manageEmployees?: boolean;

  @IsOptional()
  @IsBoolean()
  manageOrders?: boolean;

  @IsOptional()
  @IsBoolean()
  manageMenu?: boolean;

  @IsOptional()
  @IsBoolean()
  managePayments?: boolean;

  @IsOptional()
  @IsBoolean()
  viewReports?: boolean;

  @IsOptional()
  @IsBoolean()
  approveRefunds?: boolean;
}

export class CreateManagerDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsNotEmpty()
  position: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PermissionsDto)
  permissions?: PermissionsDto;
}
