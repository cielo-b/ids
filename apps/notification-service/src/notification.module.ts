import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { HttpModule } from "@nestjs/axios";
import { JwtStrategy, HealthModule, CacheModule } from "@app/common";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { Notification } from "./entities/notification.entity";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    HttpModule,
    CacheModule,
    HealthModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get("JWT_SECRET", "your-secret-key"),
        signOptions: {
          expiresIn: configService.get("JWT_EXPIRATION", "24h"),
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("POSTGRES_HOST", "localhost"),
        port: configService.get("POSTGRES_PORT", 5432),
        username: configService.get("POSTGRES_USER", "billme_notification"),
        password: configService.get(
          "POSTGRES_PASSWORD",
          "billme_notification_pass"
        ),
        database: configService.get("POSTGRES_DB", "billme_notifications"),
        entities: [Notification],
        synchronize: configService.get("NODE_ENV") !== "production",
        logging: configService.get("NODE_ENV") === "development",
      }),
    }),
    TypeOrmModule.forFeature([Notification]),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, JwtStrategy],
  exports: [NotificationService],
})
export class NotificationModule {}
