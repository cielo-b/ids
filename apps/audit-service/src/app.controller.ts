import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuditService } from './app.service';

@Controller()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @MessagePattern('audit.log')
  async logActivity(@Payload() data: any) {
    return this.auditService.logActivity(data);
  }

  @MessagePattern('audit.get')
  async getAuditLogs(@Payload() data: any) {
    return this.auditService.getAuditLogs(data.entityId, data.filters);
  }

  @MessagePattern('audit.report')
  async generateReport(@Payload() data: any) {
    return this.auditService.generateReport(data.entityId, data.period);
  }
}
