import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { ResponseUtil } from '@app/common';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async create(createAuditLogDto: CreateAuditLogDto) {
    try {
      const auditLog = this.auditLogRepository.create(createAuditLogDto);
      const savedLog = await this.auditLogRepository.save(auditLog);
      return ResponseUtil.success(savedLog, 'Audit log created successfully');
    } catch (error) {
      this.logger.error('Error creating audit log:', error);
      // Don't throw error - audit logging should not break the main flow
      return ResponseUtil.error('Failed to create audit log', [error.message]);
    }
  }

  async findAll(
    entityId?: string,
    branchId?: string,
    userId?: string,
    resourceType?: string,
    action?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
    offset: number = 0,
  ) {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

    if (entityId) {
      queryBuilder.andWhere('audit.entityId = :entityId', { entityId });
    }

    if (branchId) {
      queryBuilder.andWhere('audit.branchId = :branchId', { branchId });
    }

    if (userId) {
      queryBuilder.andWhere('audit.userId = :userId', { userId });
    }

    if (resourceType) {
      queryBuilder.andWhere('audit.resourceType = :resourceType', {
        resourceType,
      });
    }

    if (action) {
      queryBuilder.andWhere('audit.action = :action', { action });
    }

    if (startDate) {
      queryBuilder.andWhere('audit.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate });
    }

    const [logs, total] = await queryBuilder
      .orderBy('audit.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return ResponseUtil.success({
      logs,
      total,
      limit,
      offset,
    });
  }

  async findByResource(
    resourceType: string,
    resourceId: string,
    limit: number = 50,
  ) {
    const logs = await this.auditLogRepository.find({
      where: {
        resourceType,
        resourceId,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });

    return ResponseUtil.success(logs);
  }

  async findByUser(userId: string, limit: number = 50) {
    const logs = await this.auditLogRepository.find({
      where: {
        userId,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });

    return ResponseUtil.success(logs);
  }

  async getStats(entityId?: string, startDate?: Date, endDate?: Date) {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

    if (entityId) {
      queryBuilder.where('audit.entityId = :entityId', { entityId });
    }

    if (startDate) {
      queryBuilder.andWhere('audit.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate });
    }

    const totalLogs = await queryBuilder.getCount();

    const actionCounts = await queryBuilder
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.action')
      .getRawMany();

    const resourceTypeCounts = await queryBuilder
      .clone()
      .select('audit.resourceType', 'resourceType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.resourceType')
      .getRawMany();

    return ResponseUtil.success({
      totalLogs,
      actionCounts,
      resourceTypeCounts,
    });
  }
}
