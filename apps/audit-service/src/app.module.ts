import { Module } from '@nestjs/common';
import { AuditController } from './app.controller';
import { AuditService } from './app.service';

@Module({
  imports: [],
  controllers: [AuditController],
  providers: [AuditService],
})
export class AuditModule {}
