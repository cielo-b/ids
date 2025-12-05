import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { JwtPayloadWithRole } from '../interfaces';
import { CacheService } from '../services/cache.service';

@Injectable()
export class UserRoleInterceptor implements NestInterceptor {
  private readonly USER_CACHE_TTL = 300; // 5 minutes

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayloadWithRole = request.user;

    // Only enrich if user exists and doesn't have role
    if (user && !user.role) {
      try {
        // Try cache first
        const cacheKey = `user:role:${user.sub}`;
        let role = await this.cacheService.get<string>(cacheKey);

        if (!role) {
          // Fetch from user service
          const userServiceUrl = this.configService.get(
            'USER_SERVICE_URL',
            'http://localhost:3002',
          );
          const userResponse = await firstValueFrom(
            this.httpService.get(`${userServiceUrl}/api/v1/users/${user.sub}`),
          );
          role = userResponse.data.data?.role;

          // Cache the role
          if (role) {
            await this.cacheService.set(cacheKey, role, this.USER_CACHE_TTL);
          }
        }

        // Attach role to user object
        if (role) {
          (user as any).role = role;
        }
      } catch (error) {
        // If fetching fails, continue without role
        // Guards will handle the missing role
        console.warn('Failed to fetch user role:', error.message);
      }
    }

    return next.handle();
  }
}

