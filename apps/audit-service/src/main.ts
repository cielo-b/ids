import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AuditModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AuditModule,
    {
      transport: Transport.TCP,
      options: { 
        host: 'localhost', 
        port: 3007 
      }
    }
  );
  
  await app.listen();
  console.log('Audit Service running on port 3007');
}
bootstrap();
