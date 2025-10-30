import {
  Controller,
  All,
  Req,
  Res,
  Get,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './services/proxy.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller()
export class GatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get('health')
  @ApiOperation({ summary: 'Gateway health check' })
  @ApiResponse({ status: 200, description: 'Gateway is healthy' })
  healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      gateway: 'Bill Me API Gateway',
      version: '1.0.0',
    };
  }

  @Get('services')
  @ApiOperation({ summary: 'List all available services' })
  @ApiResponse({ status: 200, description: 'Services list retrieved' })
  getServices() {
    return this.proxyService.getServiceHealth();
  }

  // Auth Service Routes
  @All('auth/*')
  @ApiTags('Auth Service (via Gateway)')
  async authProxy(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('auth', req, res);
  }

  // User Service Routes
  @All('users/*')
  @ApiTags('User Service (via Gateway)')
  async userProxy(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('users', req, res);
  }

  // Entity Service Routes
  @All('entities/*')
  @ApiTags('Entity Service (via Gateway)')
  async entityProxy(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('entities', req, res);
  }

  @All('branches/*')
  @ApiTags('Entity Service (via Gateway)')
  async branchProxy(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('branches', req, res);
  }

  // Employee Service Routes
  @All('employees/*')
  @ApiTags('Employee Service (via Gateway)')
  async employeeProxy(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('employees', req, res);
  }

  // Manager Service Routes
  @All('managers/*')
  @ApiTags('Manager Service (via Gateway)')
  async managerProxy(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('managers', req, res);
  }

  // Menu Service Routes
  @All('items/*')
  @ApiTags('Menu Service (via Gateway)')
  async itemProxy(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('items', req, res);
  }

  @All('categories/*')
  @ApiTags('Menu Service (via Gateway)')
  async categoryProxy(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('categories', req, res);
  }

  @All('promotions/*')
  @ApiTags('Menu Service (via Gateway)')
  async promotionProxy(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('promotions', req, res);
  }

  // Order Service Routes
  @All('orders/*')
  @ApiTags('Order Service (via Gateway)')
  async orderProxy(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('orders', req, res);
  }

  // Payment Service Routes
  @All('payments/*')
  @ApiTags('Payment Service (via Gateway)')
  async paymentProxy(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('payments', req, res);
  }

  // Receipt Service Routes
  @All('receipts/*')
  @ApiTags('Receipt Service (via Gateway)')
  async receiptProxy(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('receipts', req, res);
  }

  // Subscription Service Routes
  @All('subscriptions/*')
  @ApiTags('Subscription Service (via Gateway)')
  async subscriptionProxy(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('subscriptions', req, res);
  }

  // Notification Service Routes
  @All('notifications/*')
  @ApiTags('Notification Service (via Gateway)')
  async notificationProxy(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('notifications', req, res);
  }

  // Audit Service Routes
  @All('audit/*')
  @ApiTags('Audit Service (via Gateway)')
  async auditProxy(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('audit', req, res);
  }

  // Report Service Routes
  @All('reports/*')
  @ApiTags('Report Service (via Gateway)')
  async reportProxy(@Req() req: Request, @Res() res: Response) {
    return this.proxyToService('reports', req, res);
  }

  private async proxyToService(
    serviceName: string,
    req: Request,
    res: Response,
  ) {
    try {
      // Extract the path after the service name
      const fullPath = req.path;
      const servicePath = fullPath.split(`/${serviceName}`)[1] || '';
      const path = `/${serviceName}${servicePath}`;

      // Forward the request
      const result = await this.proxyService.forwardRequest(
        serviceName,
        req.method,
        path,
        req.body,
        req.headers,
        req.query,
      );

      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error.response || error.message || 'Internal server error';

      return res.status(status).json({
        success: false,
        message,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}

