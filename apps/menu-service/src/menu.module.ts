import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { HttpModule } from "@nestjs/axios";
import {
  CacheModule,
  JwtStrategy,
  HealthModule,
  EventModule,
} from "@app/common";
import { MenuController } from "./menu.controller";
import { MenuService } from "./menu.service";
import { MenuItem } from "./entities/menu-item.entity";
import { Category } from "./entities/category.entity";
import { Promotion } from "./entities/promotion.entity";

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
    HealthModule,
    EventModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("POSTGRES_HOST", "localhost"),
        port: configService.get("POSTGRES_PORT", 5432),
        username: configService.get("POSTGRES_USER", "billme_menu"),
        password: configService.get("POSTGRES_PASSWORD", "billme_menu_pass"),
        database: configService.get("POSTGRES_DB", "billme_menus"),
        entities: [MenuItem, Category, Promotion],
        synchronize: configService.get("NODE_ENV") !== "production",
        logging: configService.get("NODE_ENV") === "development",
      }),
    }),
    TypeOrmModule.forFeature([MenuItem, Category, Promotion]),
  ],
  controllers: [MenuController],
  providers: [MenuService, JwtStrategy],
  exports: [MenuService],
})
export class MenuModule {}
