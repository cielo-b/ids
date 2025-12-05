import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check() {
    return this.health.check([
      // Database health check
      () => this.db.pingCheck('database'),
      // Memory health check - warn if using more than 300MB
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      // Memory RSS health check - warn if using more than 300MB
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
      // Disk health check - warn if using more than 80% of disk space
      () =>
        this.disk.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.8,
        }),
    ]);
  }

  @Get('readiness')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  readiness() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
