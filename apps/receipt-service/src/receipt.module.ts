import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { HttpModule } from "@nestjs/axios";
import {
  CacheModule,
  JwtStrategy,
  EventModule,
  HealthModule,
} from "@app/common";
import { ReceiptController } from "./receipt.controller";
import { ReceiptService } from "./receipt.service";
import { Receipt } from "./entities/receipt.entity";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
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
    HttpModule,
    CacheModule,
    EventModule,
    HealthModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("POSTGRES_HOST", "localhost"),
        port: configService.get("POSTGRES_PORT", 5432),
        username: configService.get("POSTGRES_USER", "billme_receipt"),
        password: configService.get("POSTGRES_PASSWORD", "billme_receipt_pass"),
        database: configService.get("POSTGRES_DB", "billme_receipts"),
        entities: [Receipt],
        synchronize: configService.get("NODE_ENV") !== "production",
        logging: configService.get("NODE_ENV") === "development",
      }),
    }),
    TypeOrmModule.forFeature([Receipt]),
  ],
  controllers: [ReceiptController],
  providers: [ReceiptService, JwtStrategy],
  exports: [ReceiptService],
})
export class ReceiptModule {}
