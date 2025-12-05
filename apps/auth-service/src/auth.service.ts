import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AuthCredential } from './entities/auth-credential.entity';
import { OTP, OTPType } from './entities/otp.entity';
import { Session } from './entities/session.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyOTPDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetOTPDto } from './dto/verify-reset-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateSuperAdminDto } from './dto/create-superadmin.dto';
import { UserRole } from '@app/common';
import {
  HashUtil,
  OTPUtil,
  ResponseUtil,
  JwtPayload,
  CacheService,
} from '@app/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCK_TIME = 15 * 60 * 1000; // 15 minutes
  private readonly CACHE_TTL = 3600; // 1 hour for auth credentials
  private readonly USER_CACHE_TTL = 1800; // 30 minutes for user data

  constructor(
    @InjectRepository(AuthCredential)
    private authRepository: Repository<AuthCredential>,
    @InjectRepository(OTP)
    private otpRepository: Repository<OTP>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private httpService: HttpService,
    private cacheService: CacheService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user already exists in auth service
    const existingAuth = await this.authRepository.findOne({
      where: { email: registerDto.email },
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
        this.httpService.post(`${userServiceUrl}/api/v1/users/internal`, {
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
      const authCredential = this.authRepository.create({
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

      await this.authRepository.save(authCredential);

      // Cache the new credential
      const cacheKey = `auth:credential:email:${registerDto.email}`;
      await this.cacheService.set(
        cacheKey,
        { ...authCredential, passwordHash: undefined },
        this.CACHE_TTL,
      );

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
    // Try to get from cache first
    const cacheKey = `auth:credential:email:${loginDto.email}`;
    let authCredential = await this.cacheService.get<AuthCredential>(cacheKey);

    if (!authCredential) {
      authCredential = await this.authRepository.findOne({
        where: { email: loginDto.email },
      });

      if (!authCredential) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Cache the credential (excluding sensitive password hash from cache)
      await this.cacheService.set(
        cacheKey,
        { ...authCredential, passwordHash: undefined },
        this.CACHE_TTL,
      );
    } else {
      // If from cache, we need to get password hash from DB
      const fullCredential = await this.authRepository.findOne({
        where: { email: loginDto.email },
      });
      if (!fullCredential) {
        await this.cacheService.delete(cacheKey);
        throw new UnauthorizedException('Invalid credentials');
      }
      authCredential.passwordHash = fullCredential.passwordHash;
      authCredential.loginAttempts = fullCredential.loginAttempts;
    }

    // Check if account is locked
    if (authCredential.loginAttempts?.locked) {
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
      if (!authCredential.loginAttempts) {
        authCredential.loginAttempts = {
          count: 0,
          lastAttempt: new Date(),
          locked: false,
          lockedUntil: new Date(),
        };
      }
      authCredential.loginAttempts.count += 1;
      authCredential.loginAttempts.lastAttempt = new Date();

      if (authCredential.loginAttempts.count >= this.MAX_LOGIN_ATTEMPTS) {
        authCredential.loginAttempts.locked = true;
        authCredential.loginAttempts.lockedUntil = new Date(
          Date.now() + this.LOCK_TIME,
        );
      }

      await this.authRepository.save(authCredential);
      // Invalidate cache on failed login
      await this.cacheService.delete(cacheKey);
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
    if (authCredential.loginAttempts) {
      authCredential.loginAttempts.count = 0;
      authCredential.loginAttempts.locked = false;
    }

    // Get user details with caching
    const userServiceUrl = this.configService.get(
      'USER_SERVICE_URL',
      'http://user-service:3002',
    );
    const userCacheKey = `user:${authCredential.userId}`;
    let user = await this.cacheService.get<any>(userCacheKey);

    if (!user) {
      const userResponse = await firstValueFrom(
        this.httpService.get(
          `${userServiceUrl}/api/v1/users/${authCredential.userId}`,
        ),
      );

      user = userResponse.data.data;
      // Cache user data
      await this.cacheService.set(userCacheKey, user, this.USER_CACHE_TTL);
    }

    // Get branchId for managers and employees
    let branchId: string | undefined;
    if (user.role === 'MANAGER' || user.role === 'EMPLOYEE') {
      try {
        if (user.role === 'MANAGER') {
          const managerServiceUrl = this.configService.get(
            'MANAGER_SERVICE_URL',
            'http://manager-service:3005',
          );
          const managerResponse = await firstValueFrom(
            this.httpService.get(
              `${managerServiceUrl}/api/v1/managers/user/${user.id}`,
            ),
          );
          branchId = managerResponse.data.data?.branchId;
        } else if (user.role === 'EMPLOYEE') {
          const employeeServiceUrl = this.configService.get(
            'EMPLOYEE_SERVICE_URL',
            'http://employee-service:3006',
          );
          const employeeResponse = await firstValueFrom(
            this.httpService.get(
              `${employeeServiceUrl}/api/v1/employees/user/${user.id}`,
            ),
          );
          branchId = employeeResponse.data.data?.branchId;
        }
      } catch (error) {
        // If manager/employee record not found, branchId remains undefined
        // This is acceptable as they might not be assigned to a branch yet
        console.warn(
          `Could not fetch branchId for ${user.role} ${user.id}:`,
          error.message,
        );
      }
    }

    // Generate tokens (without role - role is returned in response)
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      entityId: user.entityId,
      branchId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
    });

    // Save refresh token
    authCredential.refreshToken = refreshToken;
    await this.authRepository.save(authCredential);

    // Update cache with new refresh token
    await this.cacheService.set(
      cacheKey,
      { ...authCredential, passwordHash: undefined },
      this.CACHE_TTL,
    );

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

      // Check cache first
      const cacheKey = `auth:credential:userId:${payload.sub}`;
      let authCredential =
        await this.cacheService.get<AuthCredential>(cacheKey);

      if (!authCredential || authCredential.refreshToken !== refreshToken) {
        authCredential = await this.authRepository.findOne({
          where: { userId: payload.sub, refreshToken },
        });

        if (!authCredential) {
          throw new UnauthorizedException('Invalid refresh token');
        }
      }

      // Get user details to include branchId
      const userServiceUrl = this.configService.get(
        'USER_SERVICE_URL',
        'http://user-service:3002',
      );
      let branchId: string | undefined;
      try {
        const userResponse = await firstValueFrom(
          this.httpService.get(`${userServiceUrl}/api/v1/users/${payload.sub}`),
        );
        const user = userResponse.data.data;

        // Get branchId for managers and employees
        if (user.role === 'MANAGER' || user.role === 'EMPLOYEE') {
          if (user.role === 'MANAGER') {
            const managerServiceUrl = this.configService.get(
              'MANAGER_SERVICE_URL',
              'http://manager-service:3005',
            );
            try {
              const managerResponse = await firstValueFrom(
                this.httpService.get(
                  `${managerServiceUrl}/api/v1/managers/user/${user.id}`,
                ),
              );
              branchId = managerResponse.data.data?.branchId;
            } catch (error) {
              // BranchId remains undefined if not found
            }
          } else if (user.role === 'EMPLOYEE') {
            const employeeServiceUrl = this.configService.get(
              'EMPLOYEE_SERVICE_URL',
              'http://employee-service:3006',
            );
            try {
              const employeeResponse = await firstValueFrom(
                this.httpService.get(
                  `${employeeServiceUrl}/api/v1/employees/user/${user.id}`,
                ),
              );
              branchId = employeeResponse.data.data?.branchId;
            } catch (error) {
              // BranchId remains undefined if not found
            }
          }
        }
      } catch (error) {
        // If user fetch fails, use payload values
        branchId = payload.branchId;
      }

      // Generate new tokens (without role)
      const newPayload: JwtPayload = {
        sub: payload.sub,
        email: payload.email,
        entityId: payload.entityId,
        branchId,
      };

      const accessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
      });

      authCredential.refreshToken = newRefreshToken;
      await this.authRepository.save(authCredential);

      // Update cache
      await this.cacheService.set(
        cacheKey,
        { ...authCredential, passwordHash: undefined },
        this.CACHE_TTL,
      );
      // Also invalidate email-based cache
      await this.cacheService.delete(
        `auth:credential:email:${authCredential.email}`,
      );

      // Get user details to include in response
      let user: any;
      try {
        const userResponse = await firstValueFrom(
          this.httpService.get(`${userServiceUrl}/api/v1/users/${payload.sub}`),
        );
        user = userResponse.data.data;
      } catch (error) {
        // If user fetch fails, return tokens without user
      }

      return ResponseUtil.success(
        {
          accessToken,
          refreshToken: newRefreshToken,
          ...(user && { user }), // Include user with role if available
        },
        'Token refreshed successfully',
      );
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    await this.authRepository.update({ userId }, { refreshToken: null });

    await this.sessionRepository.update({ userId }, { isActive: false });

    // Invalidate all auth-related cache for this user
    await this.cacheService.invalidateUser(userId);

    return ResponseUtil.success(null, 'Logged out successfully');
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const authCredential = await this.authRepository.findOne({
      where: { userId },
    });

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
    if (!authCredential.passwordHistory) {
      authCredential.passwordHistory = [];
    }
    authCredential.passwordHistory.push(new Date());

    await this.authRepository.save(authCredential);

    // Invalidate auth cache on password change
    await this.cacheService.delete(
      `auth:credential:email:${authCredential.email}`,
    );
    await this.cacheService.delete(
      `auth:credential:userId:${authCredential.userId}`,
    );

    return ResponseUtil.success(null, 'Password changed successfully');
  }

  async generateOTP(userId: string, type: string) {
    const code = OTPUtil.generate();
    const expiresAt = new Date(
      Date.now() +
        parseInt(this.configService.get('OTP_EXPIRATION', '300')) * 1000,
    );

    const otp = this.otpRepository.create({
      userId,
      code,
      type: type as OTPType,
      expiresAt,
    });

    await this.otpRepository.save(otp);

    // In production, send OTP via email/SMS through notification service
    return ResponseUtil.success({ code }, 'OTP generated successfully');
  }

  async verifyOTP(verifyOTPDto: VerifyOTPDto) {
    const otp = await this.otpRepository.findOne({
      where: {
        userId: verifyOTPDto.userId,
        type: verifyOTPDto.type as OTPType,
        used: false,
      },
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
      await this.otpRepository.save(otp);
      throw new BadRequestException('Invalid OTP');
    }

    otp.used = true;
    await this.otpRepository.save(otp);

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

    await this.authRepository.update(
      { userId },
      {
        twoFactorSecret: secret,
        twoFactorEnabled: true,
      },
    );

    // Invalidate cache
    await this.cacheService.invalidateUser(userId);

    const otpauth = `otpauth://totp/BillMe:${userId}?secret=${secret}&issuer=BillMe`;

    return ResponseUtil.success(
      { secret, otpauth },
      '2FA enabled successfully',
    );
  }

  async disable2FA(userId: string) {
    await this.authRepository.update(
      { userId },
      {
        twoFactorSecret: null,
        twoFactorEnabled: false,
      },
    );

    // Invalidate cache
    await this.cacheService.invalidateUser(userId);

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

    const session = this.sessionRepository.create({
      userId,
      token,
      refreshToken,
      expiresAt,
      isActive: true,
    });

    await this.sessionRepository.save(session);
  }

  async getSessions(userId: string) {
    const cacheKey = `auth:sessions:${userId}`;
    let sessions = await this.cacheService.get<Session[]>(cacheKey);

    if (!sessions) {
      sessions = await this.sessionRepository.find({
        where: { userId, isActive: true },
      });
      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, sessions, 300);
    }

    return ResponseUtil.success(sessions);
  }

  async revokeSession(sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    await this.sessionRepository.update({ id: sessionId }, { isActive: false });

    // Invalidate sessions cache for this user
    if (session) {
      await this.cacheService.delete(`auth:sessions:${session.userId}`);
    }

    return ResponseUtil.success(null, 'Session revoked successfully');
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { identifier } = forgotPasswordDto;
    const userServiceUrl = this.configService.get(
      'USER_SERVICE_URL',
      'http://user-service:3002',
    );

    // Determine if identifier is email or phone
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;
    const isEmail = emailRegex.test(identifier);
    const isPhone = phoneRegex.test(identifier);

    if (!isEmail && !isPhone) {
      throw new BadRequestException(
        'Identifier must be a valid email or 10-digit phone number',
      );
    }

    // Find user by email or phone
    let user;
    try {
      if (isEmail) {
        const userResponse = await firstValueFrom(
          this.httpService.get(
            `${userServiceUrl}/api/v1/users/email/${identifier}`,
          ),
        );
        user = userResponse.data.data;
      } else {
        const userResponse = await firstValueFrom(
          this.httpService.get(
            `${userServiceUrl}/api/v1/users/phone/${identifier}`,
          ),
        );
        user = userResponse.data.data;
      }
    } catch (error) {
      if (error.response?.status === 404) {
        // Don't reveal if user exists or not for security
        return ResponseUtil.success(
          null,
          'If the identifier exists, an OTP has been sent',
        );
      }
      throw error;
    }

    // Find auth credential
    const authCredential = await this.authRepository.findOne({
      where: { userId: user.id },
    });

    if (!authCredential) {
      // Don't reveal if user exists or not for security
      return ResponseUtil.success(
        null,
        'If the identifier exists, an OTP has been sent',
      );
    }

    // Determine OTP type based on identifier
    const otpType = isEmail ? OTPType.EMAIL : OTPType.PHONE;

    // Generate 4-digit OTP for password reset (to match frontend expectation)
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(
      Date.now() +
        parseInt(this.configService.get('OTP_EXPIRATION', '300')) * 1000,
    );

    // Invalidate any existing password reset OTPs for this user
    await this.otpRepository.update(
      {
        userId: user.id,
        type: OTPType.PASSWORD_RESET,
        used: false,
      },
      { used: true },
    );

    const otp = this.otpRepository.create({
      userId: user.id,
      code,
      type: OTPType.PASSWORD_RESET,
      expiresAt,
    });

    await this.otpRepository.save(otp);

    // In production, send OTP via email/SMS through notification service
    // For now, return success (in dev, OTP is returned in response)
    return ResponseUtil.success(
      process.env.NODE_ENV === 'development' ? { code } : null,
      'If the identifier exists, an OTP has been sent',
    );
  }

  async verifyResetOTP(verifyResetOTPDto: VerifyResetOTPDto) {
    const { identifier, otp } = verifyResetOTPDto;
    const userServiceUrl = this.configService.get(
      'USER_SERVICE_URL',
      'http://user-service:3002',
    );

    // Determine if identifier is email or phone
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;
    const isEmail = emailRegex.test(identifier);
    const isPhone = phoneRegex.test(identifier);

    if (!isEmail && !isPhone) {
      throw new BadRequestException(
        'Identifier must be a valid email or 10-digit phone number',
      );
    }

    // Find user by email or phone
    let user;
    try {
      if (isEmail) {
        const userResponse = await firstValueFrom(
          this.httpService.get(
            `${userServiceUrl}/api/v1/users/email/${identifier}`,
          ),
        );
        user = userResponse.data.data;
      } else {
        const userResponse = await firstValueFrom(
          this.httpService.get(
            `${userServiceUrl}/api/v1/users/phone/${identifier}`,
          ),
        );
        user = userResponse.data.data;
      }
    } catch (error) {
      if (error.response?.status === 404) {
        throw new NotFoundException('User not found');
      }
      throw error;
    }

    // Find OTP
    const otpRecord = await this.otpRepository.findOne({
      where: {
        userId: user.id,
        type: OTPType.PASSWORD_RESET,
        used: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (!otpRecord) {
      throw new NotFoundException('OTP not found or already used');
    }

    if (new Date() > otpRecord.expiresAt) {
      throw new BadRequestException('OTP has expired');
    }

    if (otpRecord.attempts >= 3) {
      throw new BadRequestException('Maximum attempts exceeded');
    }

    if (otpRecord.code !== otp) {
      otpRecord.attempts += 1;
      await this.otpRepository.save(otpRecord);
      throw new BadRequestException('Invalid OTP');
    }

    // OTP is valid, but don't mark as used yet - will be used in reset password
    return ResponseUtil.success(null, 'OTP verified successfully');
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { identifier, otp, password, confirmPassword } = resetPasswordDto;

    // Validate passwords match
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const userServiceUrl = this.configService.get(
      'USER_SERVICE_URL',
      'http://user-service:3002',
    );

    // Determine if identifier is email or phone
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;
    const isEmail = emailRegex.test(identifier);
    const isPhone = phoneRegex.test(identifier);

    if (!isEmail && !isPhone) {
      throw new BadRequestException(
        'Identifier must be a valid email or 10-digit phone number',
      );
    }

    // Find user by email or phone
    let user;
    try {
      if (isEmail) {
        const userResponse = await firstValueFrom(
          this.httpService.get(
            `${userServiceUrl}/api/v1/users/email/${identifier}`,
          ),
        );
        user = userResponse.data.data;
      } else {
        const userResponse = await firstValueFrom(
          this.httpService.get(
            `${userServiceUrl}/api/v1/users/phone/${identifier}`,
          ),
        );
        user = userResponse.data.data;
      }
    } catch (error) {
      if (error.response?.status === 404) {
        throw new NotFoundException('User not found');
      }
      throw error;
    }

    // Find and verify OTP
    const otpRecord = await this.otpRepository.findOne({
      where: {
        userId: user.id,
        type: OTPType.PASSWORD_RESET,
        used: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (!otpRecord) {
      throw new NotFoundException('OTP not found or already used');
    }

    if (new Date() > otpRecord.expiresAt) {
      throw new BadRequestException('OTP has expired');
    }

    if (otpRecord.code !== otp) {
      otpRecord.attempts += 1;
      await this.otpRepository.save(otpRecord);
      throw new BadRequestException('Invalid OTP');
    }

    // Find auth credential
    const authCredential = await this.authRepository.findOne({
      where: { userId: user.id },
    });

    if (!authCredential) {
      throw new NotFoundException('Auth credential not found');
    }

    // Hash new password
    const passwordHash = await HashUtil.hash(password);

    // Update password
    authCredential.passwordHash = passwordHash;
    if (!authCredential.passwordHistory) {
      authCredential.passwordHistory = [];
    }
    authCredential.passwordHistory.push(new Date());

    await this.authRepository.save(authCredential);

    // Mark OTP as used
    otpRecord.used = true;
    await this.otpRepository.save(otpRecord);

    // Invalidate auth cache
    await this.cacheService.delete(
      `auth:credential:email:${authCredential.email}`,
    );
    await this.cacheService.delete(
      `auth:credential:userId:${authCredential.userId}`,
    );

    return ResponseUtil.success(null, 'Password reset successfully');
  }

  async createSuperAdmin(createSuperAdminDto: CreateSuperAdminDto) {
    // Verify admin key from environment variable
    const expectedAdminKey = this.configService.get<string>('SUPER_ADMIN_KEY');

    if (!expectedAdminKey) {
      throw new ForbiddenException(
        'Super admin key not configured. Please set SUPER_ADMIN_KEY environment variable.',
      );
    }

    if (createSuperAdminDto.adminKey !== expectedAdminKey) {
      throw new ForbiddenException('Invalid admin key');
    }

    // Check if user already exists in auth service
    const existingAuth = await this.authRepository.findOne({
      where: { email: createSuperAdminDto.email },
    });

    if (existingAuth) {
      throw new ConflictException('User with this email already exists');
    }

    try {
      // Create super admin user in user service
      const userServiceUrl = this.configService.get(
        'USER_SERVICE_URL',
        'http://user-service:3002',
      );
      const userResponse = await firstValueFrom(
        this.httpService.post(`${userServiceUrl}/api/v1/users/internal`, {
          firstName: createSuperAdminDto.firstName,
          lastName: createSuperAdminDto.lastName,
          email: createSuperAdminDto.email,
          phoneNumber: createSuperAdminDto.phoneNumber,
          role: UserRole.SUPER_ADMIN,
          // Super admin doesn't need entityId
        }),
      );

      const user = userResponse.data.data;

      // Hash password
      const passwordHash = await HashUtil.hash(createSuperAdminDto.password);

      // Create auth credentials
      const authCredential = this.authRepository.create({
        userId: user.id,
        email: createSuperAdminDto.email,
        passwordHash,
        loginAttempts: {
          count: 0,
          lastAttempt: null,
          locked: false,
          lockedUntil: null,
        },
      });

      await this.authRepository.save(authCredential);

      // Cache the new credential
      const cacheKey = `auth:credential:email:${createSuperAdminDto.email}`;
      await this.cacheService.set(
        cacheKey,
        { ...authCredential, passwordHash: undefined },
        this.CACHE_TTL,
      );

      // Auto-verify email in user service (super admin doesn't need email verification)
      try {
        await firstValueFrom(
          this.httpService.patch(
            `${userServiceUrl}/api/v1/users/${user.id}/verify-email`,
          ),
        );
      } catch (error) {
        // Log but don't fail if email verification update fails
        console.warn('Failed to auto-verify super admin email:', error.message);
      }

      return ResponseUtil.success(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        'Super admin created successfully',
      );
    } catch (error) {
      if (error.response?.data) {
        throw new BadRequestException(error.response.data.message);
      }
      throw error;
    }
  }

  async getCurrentUser(currentUser: JwtPayload) {
    // Get user details from user service
    const userServiceUrl = this.configService.get(
      'USER_SERVICE_URL',
      'http://user-service:3002',
    );

    try {
      const userCacheKey = `user:${currentUser.sub}`;
      let user = await this.cacheService.get<any>(userCacheKey);

      if (!user) {
        const userResponse = await firstValueFrom(
          this.httpService.get(
            `${userServiceUrl}/api/v1/users/${currentUser.sub}`,
          ),
        );
        user = userResponse.data.data;
        // Cache user data
        await this.cacheService.set(userCacheKey, user, this.USER_CACHE_TTL);
      }

      return ResponseUtil.success(
        {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          role: user.role,
          entityId: user.entityId,
          branchId: currentUser.branchId || user.branchId,
          preferredLanguage: user.preferredLanguage,
          address: user.address,
          city: user.city,
          country: user.country,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        'User retrieved successfully',
      );
    } catch (error) {
      if (error.response?.status === 404) {
        throw new NotFoundException('User not found');
      }
      throw new BadRequestException('Failed to retrieve user information');
    }
  }
}
