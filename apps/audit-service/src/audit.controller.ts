import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  UserRole,
  EntityGuard,
  BranchGuard,
  EntityAccess,
  BranchAccess,
} from '@app/common';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
@EntityAccess()
@BranchAccess()
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create audit log (internal use)' })
  @ApiResponse({ status: 201, description: 'Audit log created successfully' })
  create(@Body() createAuditLogDto: CreateAuditLogDto) {
    return this.auditService.create(createAuditLogDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all audit logs' })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'resourceType', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  findAll(
    @Query('entityId') entityId?: string,
    @Query('branchId') branchId?: string,
    @Query('userId') userId?: string,
    @Query('resourceType') resourceType?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    return this.auditService.findAll(
      entityId,
      branchId,
      userId,
      resourceType,
      action,
      startDate,
      endDate,
      limit,
      offset,
    );
  }

  @Get('resource/:resourceType/:resourceId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get audit logs for a specific resource' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findByResource(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.auditService.findByResource(resourceType, resourceId, limit);
  }

  @Get('user/:userId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get audit logs for a specific user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findByUser(
    @Param('userId') userId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.auditService.findByUser(userId, limit);
  }

  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get audit statistics' })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  getStats(
    @Query('entityId') entityId?: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    return this.auditService.getStats(entityId, startDate, endDate);
  }
}
