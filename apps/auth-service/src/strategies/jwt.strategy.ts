import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@app/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    if (!payload) {
      throw new UnauthorizedException();
    }

    // Note: role is not in JWT token, it's fetched by the common JwtStrategy
    // This strategy is only used in auth-service for token validation
    return {
      sub: payload.sub,
      email: payload.email,
      entityId: payload.entityId,
      branchId: payload.branchId,
    };
  }
}
