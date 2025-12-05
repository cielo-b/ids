import { SelectQueryBuilder } from 'typeorm';
import { UserRole } from '../enums';
import { JwtPayloadWithRole } from '../interfaces';

/**
 * Utility functions for filtering queries based on user role and entity/branch access
 */

export class QueryFilterUtil {
  /**
   * Apply entity-level filtering to a query
   * Superadmins can see all entities, others can only see their own entity
   */
  static applyEntityFilter<T>(
    queryBuilder: SelectQueryBuilder<T>,
    user: JwtPayloadWithRole,
    entityIdColumn: string = 'entityId',
  ): SelectQueryBuilder<T> {
    if (user.role === UserRole.SUPER_ADMIN) {
      return queryBuilder; // Superadmin can see all
    }

    if (!user.entityId) {
      // If user has no entityId, return empty result
      return queryBuilder.andWhere('1 = 0');
    }

    return queryBuilder.andWhere(`${entityIdColumn} = :entityId`, {
      entityId: user.entityId,
    });
  }

  /**
   * Apply branch-level filtering to a query
   * Superadmins and entity owners can see all branches, managers/employees only their branch
   */
  static applyBranchFilter<T>(
    queryBuilder: SelectQueryBuilder<T>,
    user: JwtPayloadWithRole,
    branchIdColumn: string = 'branchId',
  ): SelectQueryBuilder<T> {
    if (
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.ENTITY_OWNER
    ) {
      return queryBuilder; // Can see all branches
    }

    if (!user.branchId) {
      // If user has no branchId, return empty result
      return queryBuilder.andWhere('1 = 0');
    }

    return queryBuilder.andWhere(`${branchIdColumn} = :branchId`, {
      branchId: user.branchId,
    });
  }

  /**
   * Apply both entity and branch filtering
   */
  static applyEntityAndBranchFilter<T>(
    queryBuilder: SelectQueryBuilder<T>,
    user: JwtPayloadWithRole,
    entityIdColumn: string = 'entityId',
    branchIdColumn: string = 'branchId',
  ): SelectQueryBuilder<T> {
    queryBuilder = this.applyEntityFilter(queryBuilder, user, entityIdColumn);
    queryBuilder = this.applyBranchFilter(queryBuilder, user, branchIdColumn);
    return queryBuilder;
  }

  /**
   * Get entity filter condition for use in find options
   */
  static getEntityFilter(user: JwtPayloadWithRole): { entityId?: string } | {} {
    if (user.role === UserRole.SUPER_ADMIN) {
      return {}; // Superadmin can see all
    }

    if (!user.entityId) {
      return { entityId: 'NONEXISTENT' }; // Return no results
    }

    return { entityId: user.entityId };
  }

  /**
   * Get branch filter condition for use in find options
   */
  static getBranchFilter(user: JwtPayloadWithRole): { branchId?: string } | {} {
    if (
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.ENTITY_OWNER
    ) {
      return {}; // Can see all branches
    }

    if (!user.branchId) {
      return { branchId: 'NONEXISTENT' }; // Return no results
    }

    return { branchId: user.branchId };
  }

  /**
   * Get combined entity and branch filter
   */
  static getEntityAndBranchFilter(user: JwtPayloadWithRole): {
    entityId?: string;
    branchId?: string;
  } {
    return {
      ...this.getEntityFilter(user),
      ...this.getBranchFilter(user),
    };
  }

  /**
   * Validate that a user can access a specific entity
   */
  static canAccessEntity(user: JwtPayloadWithRole, entityId: string): boolean {
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }
    return user.entityId === entityId;
  }

  /**
   * Validate that a user can access a specific branch
   */
  static canAccessBranch(
    user: JwtPayloadWithRole,
    branchId: string,
    branchEntityId?: string,
  ): boolean {
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Entity owners can access all branches in their entity
    if (user.role === UserRole.ENTITY_OWNER) {
      if (branchEntityId) {
        return user.entityId === branchEntityId;
      }
      return true; // If entityId not provided, allow (will be checked at entity level)
    }

    // Managers and employees can only access their own branch
    return user.branchId === branchId;
  }
}
