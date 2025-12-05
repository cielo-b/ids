import { SetMetadata } from '@nestjs/common';

export const BRANCH_ACCESS_KEY = 'branchAccess';
export const BranchAccess = (required: boolean = true) =>
  SetMetadata(BRANCH_ACCESS_KEY, required);
