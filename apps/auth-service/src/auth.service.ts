import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AuthCredential, AuthDocument } from './schemas/auth.schema';
import { OTP, OTPDocument } from './schemas/otp.schema';
import { Session, SessionDocument } from './schemas/session.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyOTPDto } from './dto/verify-otp.dto';
import { HashUtil, OTPUtil, ResponseUtil, JwtPayload } from '@app/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCK_TIME = 15 * 60 * 1000; // 15 minutes

  constructor(
    @InjectModel(AuthCredential.name)
    private authModel: Model<AuthDocument>,
    @InjectModel(OTP.name)
    private otpModel: Model<OTPDocument>,
    @InjectModel(Session.name)
    private sessionModel: Model<SessionDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user already exists in auth service
    const existingAuth = await this.authModel.findOne({
      email: registerDto.email,
    });

    if (existingAuth) {
      throw new ConflictException('User with this email already exists');
    }

    try {
      // Create user in user service
      const userServiceUrl = this.configService.get(
        'USER_SERVICE_URL',
        'http://user-service:3002',
      );
      const userResponse = await firstValueFrom(
        this.httpService.post(`${userServiceUrl}/api/v1/users`, {
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          email: registerDto.email,
          phoneNumber: registerDto.phoneNumber,
          role: registerDto.role,
        }),
      );

      const user = userResponse.data.data;

      // Hash password
      const passwordHash = await HashUtil.hash(registerDto.password);

      // Create auth credentials
      const authCredential = new this.authModel({
        userId: user.id,
        email: registerDto.email,
        passwordHash,
        loginAttempts: {
          count: 0,
          lastAttempt: null,
          locked: false,
          lockedUntil: null,
        },
      });

      await authCredential.save();

      // Generate email verification OTP
      await this.generateOTP(user.id, 'EMAIL');

      return ResponseUtil.success(
        { userId: user.id },
        'Registration successful. Please verify your email.',
      );
    } catch (error) {
      if (error.response?.data) {
        throw new BadRequestException(error.response.data.message);
      }
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    const authCredential = await this.authModel.findOne({
      email: loginDto.email,
    });

    if (!authCredential) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (authCredential.loginAttempts.locked) {
      const now = new Date();
      if (now < authCredential.loginAttempts.lockedUntil) {
        throw new UnauthorizedException(`Account is locked. Try again later.`);
      } else {
        // Unlock account
        authCredential.loginAttempts.locked = false;
        authCredential.loginAttempts.count = 0;
      }
    }

    // Verify password
    const isPasswordValid = await HashUtil.compare(
      loginDto.password,
      authCredential.passwordHash,
    );

    if (!isPasswordValid) {
      // Increment login attempts
      authCredential.loginAttempts.count += 1;
      authCredential.loginAttempts.lastAttempt = new Date();

      if (authCredential.loginAttempts.count >= this.MAX_LOGIN_ATTEMPTS) {
        authCredential.loginAttempts.locked = true;
        authCredential.loginAttempts.lockedUntil = new Date(
          Date.now() + this.LOCK_TIME,
        );
      }

      await authCredential.save();
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check 2FA
    if (authCredential.twoFactorEnabled) {
      if (!loginDto.twoFactorCode) {
        return ResponseUtil.success({ requires2FA: true }, '2FA code required');
      }

      const isValid = OTPUtil.verify(
        loginDto.twoFactorCode,
        authCredential.twoFactorSecret,
      );

      if (!isValid) {
        throw new UnauthorizedException('Invalid 2FA code');
      }
    }

    // Reset login attempts
    authCredential.loginAttempts.count = 0;
    authCredential.loginAttempts.locked = false;

    // Get user details
    const userServiceUrl = this.configService.get(
      'USER_SERVICE_URL',
      'http://user-service:3002',
    );
    const userResponse = await firstValueFrom(
      this.httpService.get(
        `${userServiceUrl}/api/v1/users/${authCredential.userId}`,
      ),
    );

    const user = userResponse.data.data;

    // Generate tokens
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      entityId: user.entityId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
    });

    // Save refresh token
    authCredential.refreshToken = refreshToken;
    await authCredential.save();

    // Create session
    await this.createSession(user.id, accessToken, refreshToken);

    // Update last login in user service
    await firstValueFrom(
      this.httpService.patch(
        `${userServiceUrl}/api/v1/users/${user.id}/last-login`,
      ),
    );

    return ResponseUtil.success(
      {
        accessToken,
        refreshToken,
        user,
      },
      'Login successful',
    );
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);

      const authCredential = await this.authModel.findOne({
        userId: payload.sub,
        refreshToken,
      });

      if (!authCredential) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const newPayload: JwtPayload = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        entityId: payload.entityId,
      };

      const accessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
      });

      authCredential.refreshToken = newRefreshToken;
      await authCredential.save();

      return ResponseUtil.success(
        {
          accessToken,
          refreshToken: newRefreshToken,
        },
        'Token refreshed successfully',
      );
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    await this.authModel.updateOne(
      { userId },
      { $set: { refreshToken: null } },
    );

    await this.sessionModel.updateMany(
      { userId },
      { $set: { isActive: false } },
    );

    return ResponseUtil.success(null, 'Logged out successfully');
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const authCredential = await this.authModel.findOne({ userId });

    if (!authCredential) {
      throw new NotFoundException('User not found');
    }

    const isValid = await HashUtil.compare(
      changePasswordDto.currentPassword,
      authCredential.passwordHash,
    );

    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    authCredential.passwordHash = await HashUtil.hash(
      changePasswordDto.newPassword,
    );
    authCredential.passwordHistory.push(new Date());

    await authCredential.save();

    return ResponseUtil.success(null, 'Password changed successfully');
  }

  async generateOTP(userId: string, type: string) {
    const code = OTPUtil.generate();
    const expiresAt = new Date(
      Date.now() +
        parseInt(this.configService.get('OTP_EXPIRATION', '300')) * 1000,
    );

    const otp = new this.otpModel({
      userId,
      code,
      type,
      expiresAt,
    });

    await otp.save();

    // In production, send OTP via email/SMS through notification service
    return ResponseUtil.success({ code }, 'OTP generated successfully');
  }

  async verifyOTP(verifyOTPDto: VerifyOTPDto) {
    const otp = await this.otpModel.findOne({
      userId: verifyOTPDto.userId,
      type: verifyOTPDto.type,
      used: false,
    });

    if (!otp) {
      throw new NotFoundException('OTP not found or already used');
    }

    if (new Date() > otp.expiresAt) {
      throw new BadRequestException('OTP has expired');
    }

    if (otp.attempts >= 3) {
      throw new BadRequestException('Maximum attempts exceeded');
    }

    if (otp.code !== verifyOTPDto.code) {
      otp.attempts += 1;
      await otp.save();
      throw new BadRequestException('Invalid OTP');
    }

    otp.used = true;
    await otp.save();

    // Update verification status in user service
    const userServiceUrl = this.configService.get(
      'USER_SERVICE_URL',
      'http://user-service:3002',
    );
    if (verifyOTPDto.type === 'EMAIL') {
      await firstValueFrom(
        this.httpService.patch(
          `${userServiceUrl}/api/v1/users/${verifyOTPDto.userId}/verify-email`,
        ),
      );
    } else if (verifyOTPDto.type === 'PHONE') {
      await firstValueFrom(
        this.httpService.patch(
          `${userServiceUrl}/api/v1/users/${verifyOTPDto.userId}/verify-phone`,
        ),
      );
    }

    return ResponseUtil.success(null, 'OTP verified successfully');
  }

  async enable2FA(userId: string) {
    const secret = OTPUtil.generateSecret();

    await this.authModel.updateOne(
      { userId },
      {
        $set: {
          twoFactorSecret: secret,
          twoFactorEnabled: true,
        },
      },
    );

    const otpauth = `otpauth://totp/BillMe:${userId}?secret=${secret}&issuer=BillMe`;

    return ResponseUtil.success(
      { secret, otpauth },
      '2FA enabled successfully',
    );
  }

  async disable2FA(userId: string) {
    await this.authModel.updateOne(
      { userId },
      {
        $set: {
          twoFactorSecret: null,
          twoFactorEnabled: false,
        },
      },
    );

    return ResponseUtil.success(null, '2FA disabled successfully');
  }

  private async createSession(
    userId: string,
    token: string,
    refreshToken: string,
  ) {
    const expiresAt = new Date(
      Date.now() +
        parseInt(this.configService.get('JWT_EXPIRATION', '24h')) * 1000,
    );

    const session = new this.sessionModel({
      userId,
      token,
      refreshToken,
      expiresAt,
      isActive: true,
    });

    await session.save();
  }

  async getSessions(userId: string) {
    const sessions = await this.sessionModel.find({ userId, isActive: true });

    return ResponseUtil.success(sessions);
  }

  async revokeSession(sessionId: string) {
    await this.sessionModel.updateOne(
      { _id: sessionId },
      { $set: { isActive: false } },
    );

    return ResponseUtil.success(null, 'Session revoked successfully');
  }
}
