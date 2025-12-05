import { UserRole } from '../enums';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  entityId?: string;
  branchId?: string; // For managers and employees
  iat?: number;
  exp?: number;
}

/**
 * Extended JWT payload that includes role (attached by JWT strategy at runtime)
 * Use this type when you need to access the role property
 */
export type JwtPayloadWithRole = JwtPayload & { role?: UserRole | string };
