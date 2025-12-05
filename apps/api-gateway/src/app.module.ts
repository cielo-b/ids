import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EventModule } from '@app/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsGateway } from './gateways/events.gateway';
import { EventListenerService } from './gateways/event-listener.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET', 'your-secret-key'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION', '24h'),
        },
      }),
    }),
    EventModule,
  ],
  controllers: [AppController],
  providers: [AppService, EventsGateway, EventListenerService],
})
export class AppModule {}
