import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums';
import { BRANCH_ACCESS_KEY } from '../decorators/branch-access.decorator';

@Injectable()
export class BranchGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(
      BRANCH_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If decorator is not used, allow access (backward compatibility)
    if (required === undefined) {
      return true;
    }

    const { user, params, body, query } = context.switchToHttp().getRequest();

    // Superadmin and entity owners have access to all branches
    if (
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.ENTITY_OWNER
    ) {
      return true;
    }

    // Managers and employees must have branchId
    if (!user.branchId) {
      throw new ForbiddenException('User is not associated with a branch');
    }

    // Check if branchId in request matches user's branchId
    const requestBranchId =
      params?.branchId || body?.branchId || query?.branchId;

    if (requestBranchId && requestBranchId !== user.branchId) {
      throw new ForbiddenException(
        'Access denied: Cannot access data from another branch',
      );
    }

    return true;
  }
}
