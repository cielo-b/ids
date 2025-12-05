import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditAction } from '../enums/audit-action.enum';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

export interface AuditLogOptions {
  action: AuditAction;
  resourceType: string;
  getResourceId?: (request: Request, response: any) => string | undefined;
  getDescription?: (request: Request, response: any) => string | undefined;
  getOldValues?: (request: Request) => Record<string, any> | undefined;
  getNewValues?: (
    request: Request,
    response: any,
  ) => Record<string, any> | undefined;
  skipOnError?: boolean;
}

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLoggingInterceptor.name);

  constructor(
    private readonly options: AuditLogOptions,
    private readonly auditService?: any, // Optional - will be injected if available
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const { user, body, params, query } = request;

    // Skip if no user (public endpoints)
    if (!user) {
      return next.handle();
    }

    const startTime = Date.now();
    const oldValues = this.options.getOldValues?.(request);

    return next.handle().pipe(
      tap({
        next: async (response) => {
          try {
            if (this.auditService) {
              const resourceId =
                this.options.getResourceId?.(request, response) ||
                params?.id ||
                body?.id;

              const description =
                this.options.getDescription?.(request, response) ||
                `${this.options.resourceType} ${this.options.action.toLowerCase()}`;

              const newValues = this.options.getNewValues?.(request, response);

              await this.auditService.create({
                userId: user.sub,
                userEmail: user.email,
                userRole: (user as any).role, // Role may not be in token, but should be attached by strategy/interceptor
                action: this.options.action,
                resourceType: this.options.resourceType,
                resourceId,
                entityId: user.entityId,
                branchId: user.branchId,
                description,
                oldValues,
                newValues,
                metadata: {
                  method: request.method,
                  path: request.path,
                  query,
                  duration: Date.now() - startTime,
                },
                ipAddress:
                  request.ip || (request.headers['x-forwarded-for'] as string),
                userAgent: request.headers['user-agent'],
              });
            }
          } catch (error) {
            // Don't break the main flow if audit logging fails
            this.logger.error('Error creating audit log:', error);
          }
        },
        error: (error) => {
          if (!this.options.skipOnError && this.auditService) {
            // Log error actions
            this.auditService
              .create({
                userId: user.sub,
                userEmail: user.email,
                userRole: (user as any).role,
                action: AuditAction.ERROR,
                resourceType: this.options.resourceType,
                entityId: user.entityId,
                branchId: user.branchId,
                description: `Error: ${error.message}`,
                metadata: {
                  method: request.method,
                  path: request.path,
                  error: error.message,
                },
                ipAddress:
                  request.ip || (request.headers['x-forwarded-for'] as string),
                userAgent: request.headers['user-agent'],
              })
              .catch((err: any) => {
                this.logger.error('Error creating error audit log:', err);
              });
          }
        },
      }),
    );
  }
}
