import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyOTPDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetOTPDto } from './dto/verify-reset-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateSuperAdminDto } from './dto/create-superadmin.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  UserRole,
  CurrentUser,
  JwtPayload,
  JwtPayloadWithRole,
} from '@app/common';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  logout(@Param('userId') userId: string) {
    return this.authService.logout(userId);
  }

  @Patch('change-password/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid current password' })
  changePassword(
    @Param('userId') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, changePasswordDto);
  }

  @Post('generate-otp/:userId/:type')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate OTP for verification' })
  @ApiResponse({ status: 200, description: 'OTP generated successfully' })
  generateOTP(@Param('userId') userId: string, @Param('type') type: string) {
    return this.authService.generateOTP(userId, type);
  }

  @Post('verify-otp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  verifyOTP(@Body() verifyOTPDto: VerifyOTPDto) {
    return this.authService.verifyOTP(verifyOTPDto);
  }

  @Post('2fa/enable/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable 2FA' })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  enable2FA(@Param('userId') userId: string) {
    return this.authService.enable2FA(userId);
  }

  @Post('2fa/disable/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  disable2FA(@Param('userId') userId: string) {
    return this.authService.disable2FA(userId);
  }

  @Get('sessions/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user sessions' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
  getSessions(@Param('userId') userId: string) {
    return this.authService.getSessions(userId);
  }

  @Post('sessions/revoke/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke session' })
  @ApiResponse({ status: 200, description: 'Session revoked successfully' })
  revokeSession(@Param('sessionId') sessionId: string) {
    return this.authService.revokeSession(sessionId);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiResponse({
    status: 200,
    description: 'If the identifier exists, an OTP has been sent',
  })
  @ApiResponse({ status: 400, description: 'Invalid identifier format' })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('verify-reset-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP for password reset' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 404, description: 'User or OTP not found' })
  verifyResetOTP(@Body() verifyResetOTPDto: VerifyResetOTPDto) {
    return this.authService.verifyResetOTP(verifyResetOTPDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid OTP or passwords do not match',
  })
  @ApiResponse({ status: 404, description: 'User or OTP not found' })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('create-superadmin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a super admin user (requires SUPER_ADMIN_KEY)',
    description:
      'Creates a super admin user. Requires SUPER_ADMIN_KEY environment variable to match the provided adminKey.',
  })
  @ApiResponse({
    status: 201,
    description: 'Super admin created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid admin key or user already exists',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Invalid admin key',
  })
  createSuperAdmin(@Body() createSuperAdminDto: CreateSuperAdminDto) {
    return this.authService.createSuperAdmin(createSuperAdminDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCurrentUser(@CurrentUser() currentUser?: JwtPayloadWithRole) {
    return this.authService.getCurrentUser(currentUser);
  }
}
