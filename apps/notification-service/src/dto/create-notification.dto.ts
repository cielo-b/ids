import {
  IsEnum,
  IsString,
  IsUUID,
  IsNotEmpty,
  IsOptional,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { NotificationType } from "@app/common";

export class CreateNotificationDto {
  @ApiProperty({ description: "User ID to send notification to" })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ enum: NotificationType, description: "Type of notification" })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({ description: "Notification subject" })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: "Notification message" })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: "Recipient (email, phone, or device token)",
    required: false,
  })
  @IsString()
  @IsOptional()
  recipient?: string;
}
