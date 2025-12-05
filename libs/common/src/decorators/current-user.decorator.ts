import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload, JwtPayloadWithRole } from '../interfaces';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayloadWithRole | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: JwtPayloadWithRole = request.user;

    return data ? user?.[data] : user;
  },
);
