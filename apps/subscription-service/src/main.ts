import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { SubscriptionModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    SubscriptionModule,
    {
      transport: Transport.TCP,
      options: { 
        host: 'localhost', 
        port: 3005 
      }
    }
  );
  
  await app.listen();
  console.log('Subscription Service running on port 3005');
}
bootstrap();
