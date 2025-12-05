import { SetMetadata } from '@nestjs/common';

export const ENTITY_ACCESS_KEY = 'entityAccess';
export const EntityAccess = (required: boolean = true) =>
  SetMetadata(ENTITY_ACCESS_KEY, required);
