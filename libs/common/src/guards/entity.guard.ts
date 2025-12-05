import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums';
import { ENTITY_ACCESS_KEY } from '../decorators/entity-access.decorator';

@Injectable()
export class EntityGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(
      ENTITY_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If decorator is not used, allow access (backward compatibility)
    if (required === undefined) {
      return true;
    }

    const { user, params, body, query } = context.switchToHttp().getRequest();

    // Superadmin has access to all entities
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Entity owners, managers, and employees must have entityId
    if (!user.entityId) {
      throw new ForbiddenException('User is not associated with an entity');
    }

    // Check if entityId in request matches user's entityId
    const requestEntityId =
      params?.entityId || body?.entityId || query?.entityId;

    if (requestEntityId && requestEntityId !== user.entityId) {
      throw new ForbiddenException(
        'Access denied: Cannot access data from another entity',
      );
    }

    return true;
  }
}
