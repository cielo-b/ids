import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address or phone number (10 digits)',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;
}
