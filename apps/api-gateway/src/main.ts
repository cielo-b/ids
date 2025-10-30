import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { GatewayModule } from './gateway.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);

  // Security
  app.use(helmet());

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const config = new DocumentBuilder()
    .setTitle('Bill Me - API Gateway')
    .setDescription(
      'Unified API Gateway for Bill Me SaaS Platform - Routes to all microservices',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('http://localhost:3000', 'Local Development')
    .addTag('Gateway', 'Gateway health and service discovery')
    .addTag('Auth Service (via Gateway)', 'Authentication & Authorization')
    .addTag('User Service (via Gateway)', 'User Management')
    .addTag('Entity Service (via Gateway)', 'Entity & Branch Management')
    .addTag('Employee Service (via Gateway)', 'Employee Management')
    .addTag('Manager Service (via Gateway)', 'Manager Operations')
    .addTag('Menu Service (via Gateway)', 'Menu & Products')
    .addTag('Order Service (via Gateway)', 'Order Management')
    .addTag('Payment Service (via Gateway)', 'Payment Processing')
    .addTag('Receipt Service (via Gateway)', 'Receipt Management')
    .addTag('Subscription Service (via Gateway)', 'Subscriptions')
    .addTag('Notification Service (via Gateway)', 'Notifications')
    .addTag('Audit Service (via Gateway)', 'Audit Logs')
    .addTag('Report Service (via Gateway)', 'Reports & Analytics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log('');
  console.log('🎉 ============================================== 🎉');
  console.log('   Bill Me Platform - API Gateway Started!');
  console.log('🎉 ============================================== 🎉');
  console.log('');
  console.log(`🚀 Gateway running on: http://localhost:${port}`);
  console.log(
    `📚 Swagger docs: http://localhost:${port}/api/docs`,
  );
  console.log('');
  console.log('📡 Available Routes:');
  console.log('   • /api/v1/health - Gateway health check');
  console.log('   • /api/v1/services - List all services');
  console.log('   • /api/v1/auth/* - Auth Service');
  console.log('   • /api/v1/users/* - User Service');
  console.log('   • /api/v1/entities/* - Entity Service');
  console.log('   • /api/v1/branches/* - Branch Management');
  console.log('   • /api/v1/employees/* - Employee Service');
  console.log('   • /api/v1/managers/* - Manager Service');
  console.log('   • /api/v1/items/* - Menu Items');
  console.log('   • /api/v1/categories/* - Menu Categories');
  console.log('   • /api/v1/promotions/* - Promotions');
  console.log('   • /api/v1/orders/* - Order Service');
  console.log('   • /api/v1/payments/* - Payment Service');
  console.log('   • /api/v1/receipts/* - Receipt Service');
  console.log('   • /api/v1/subscriptions/* - Subscription Service');
  console.log('   • /api/v1/notifications/* - Notification Service');
  console.log('   • /api/v1/audit/* - Audit Service');
  console.log('   • /api/v1/reports/* - Report Service');
  console.log('');
  console.log('✨ All services are now accessible through this gateway!');
  console.log('');
}

bootstrap();
