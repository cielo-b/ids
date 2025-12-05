import {
  Injectable,
  UnauthorizedException,
  Optional,
  Inject,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { JwtPayload } from '../interfaces';
import { CacheService } from '../services/cache.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly USER_CACHE_TTL = 300; // 5 minutes

  constructor(
    private configService: ConfigService,
    @Optional() private httpService?: HttpService,
    @Optional() private cacheService?: CacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET', 'your-secret-key'),
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    if (!payload) {
      throw new UnauthorizedException();
    }

    // Fetch user role from user service (with caching) if services are available
    let role: string | undefined;
    if (this.httpService && this.cacheService) {
      try {
        const cacheKey = `user:role:${payload.sub}`;
        role = await this.cacheService.get<string>(cacheKey);

        if (!role) {
          const userServiceUrl = this.configService.get(
            'USER_SERVICE_URL',
            'http://localhost:3002',
          );
          const userResponse = await firstValueFrom(
            this.httpService.get(
              `${userServiceUrl}/api/v1/users/${payload.sub}`,
            ),
          );
          role = userResponse.data.data?.role;

          // Cache the role
          if (role) {
            await this.cacheService.set(cacheKey, role, this.USER_CACHE_TTL);
          }
        }
      } catch (error) {
        // If fetching fails, continue without role
        // Guards will handle the missing role
        console.warn(
          'Failed to fetch user role in JWT strategy:',
          error.message,
        );
      }
    }

    // Return payload with role attached (for guards to use)
    return {
      sub: payload.sub,
      email: payload.email,
      role,
      entityId: payload.entityId,
      branchId: payload.branchId,
    };
  }
}
