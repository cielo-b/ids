import { UserRole } from '../enums';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: UserRole;
  entityId?: string;
  iat?: number;
  exp?: number;
}
