import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from "class-validator";
import { UserRole, Language, EmployeeType } from "@app/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateUserDto {
  @ApiProperty({ example: "John" })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: "john.doe@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: "+250788123456" })
  @IsPhoneNumber()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ enum: UserRole, example: UserRole.CUSTOMER })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiPropertyOptional({ example: "uuid-entity-id" })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ enum: Language, example: Language.ENGLISH })
  @IsOptional()
  @IsEnum(Language)
  preferredLanguage?: Language;

  @ApiPropertyOptional({ example: "123 Main St, Kigali" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: "Kigali" })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: "Rwanda" })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    example: "branch-uuid",
    description: "Required for MANAGER and EMPLOYEE roles",
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({
    enum: EmployeeType,
    description:
      "Required for EMPLOYEE role. Auto-assigned based on entity category if not provided.",
  })
  @IsOptional()
  @IsEnum(EmployeeType)
  employeeType?: EmployeeType;

  @ApiPropertyOptional({
    example: "Waiter",
    description: "Position/title for MANAGER or EMPLOYEE",
  })
  @IsOptional()
  @IsString()
  position?: string;
}
