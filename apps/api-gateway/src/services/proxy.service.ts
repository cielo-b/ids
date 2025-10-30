import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class ProxyService {
  private readonly serviceUrls: Map<string, string>;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Map service names to their URLs
    this.serviceUrls = new Map([
      ['auth', this.configService.get('AUTH_SERVICE_URL', 'http://auth-service:3001')],
      ['users', this.configService.get('USER_SERVICE_URL', 'http://user-service:3002')],
      ['entities', this.configService.get('ENTITY_SERVICE_URL', 'http://entity-service:3003')],
      ['branches', this.configService.get('ENTITY_SERVICE_URL', 'http://entity-service:3003')],
      ['subscriptions', this.configService.get('SUBSCRIPTION_SERVICE_URL', 'http://subscription-service:3004')],
      ['managers', this.configService.get('MANAGER_SERVICE_URL', 'http://manager-service:3005')],
      ['employees', this.configService.get('EMPLOYEE_SERVICE_URL', 'http://employee-service:3006')],
      ['items', this.configService.get('MENU_SERVICE_URL', 'http://menu-service:3007')],
      ['categories', this.configService.get('MENU_SERVICE_URL', 'http://menu-service:3007')],
      ['promotions', this.configService.get('MENU_SERVICE_URL', 'http://menu-service:3007')],
      ['stats', this.configService.get('MENU_SERVICE_URL', 'http://menu-service:3007')],
      ['orders', this.configService.get('ORDER_SERVICE_URL', 'http://order-service:3008')],
      ['payments', this.configService.get('PAYMENT_SERVICE_URL', 'http://payment-service:3009')],
      ['receipts', this.configService.get('RECEIPT_SERVICE_URL', 'http://receipt-service:3010')],
      ['notifications', this.configService.get('NOTIFICATION_SERVICE_URL', 'http://notification-service:3011')],
      ['audit', this.configService.get('AUDIT_SERVICE_URL', 'http://audit-service:3012')],
      ['reports', this.configService.get('REPORT_SERVICE_URL', 'http://report-service:3013')],
    ]);
  }

  async forwardRequest(
    serviceName: string,
    method: string,
    path: string,
    body?: any,
    headers?: any,
    query?: any,
  ): Promise<any> {
    const serviceUrl = this.serviceUrls.get(serviceName);

    if (!serviceUrl) {
      throw new HttpException(
        `Service ${serviceName} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Construct full URL
    const url = `${serviceUrl}/api/v1${path}`;

    // Prepare query string
    const queryString = query
      ? '?' + new URLSearchParams(query).toString()
      : '';

    const fullUrl = `${url}${queryString}`;

    try {
      const config = {
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      };

      let response;

      switch (method.toUpperCase()) {
        case 'GET':
          response = await firstValueFrom(this.httpService.get(fullUrl, config));
          break;
        case 'POST':
          response = await firstValueFrom(
            this.httpService.post(fullUrl, body, config),
          );
          break;
        case 'PATCH':
        case 'PUT':
          response = await firstValueFrom(
            this.httpService.patch(fullUrl, body, config),
          );
          break;
        case 'DELETE':
          response = await firstValueFrom(
            this.httpService.delete(fullUrl, config),
          );
          break;
        default:
          throw new HttpException(
            `Method ${method} not supported`,
            HttpStatus.METHOD_NOT_ALLOWED,
          );
      }

      return response.data;
    } catch (error) {
      // Handle Axios errors
      if (error.response) {
        const axiosError = error as AxiosError;
        throw new HttpException(
          axiosError.response.data || 'Service error',
          axiosError.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Handle connection errors
      if (error.code === 'ECONNREFUSED') {
        throw new HttpException(
          `Service ${serviceName} is unavailable`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  getServiceHealth(): any {
    return {
      status: 'healthy',
      services: Array.from(this.serviceUrls.entries()).map(([name, url]) => ({
        name,
        url,
      })),
    };
  }
}

