import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NotificationModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    NotificationModule,
    {
      transport: Transport.TCP,
      options: { 
        host: 'localhost', 
        port: 3006 
      }
    }
  );
  
  await app.listen();
  console.log('Notification Service running on port 3006');
}
bootstrap();
