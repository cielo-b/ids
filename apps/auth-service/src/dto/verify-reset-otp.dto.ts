import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyResetOTPDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address or phone number used in forgot password',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({
    example: '1234',
    description: '4-digit OTP code',
  })
  @IsString()
  @IsNotEmpty()
  @Length(4, 4, { message: 'OTP must be exactly 4 digits' })
  otp: string;
}
