import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { PaymentModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    PaymentModule,
    {
      transport: Transport.TCP,
      options: { 
        host: 'localhost', 
        port: 3004 
      }
    }
  );
  
  await app.listen();
  console.log('Payment Service running on port 3004');
}
bootstrap();
