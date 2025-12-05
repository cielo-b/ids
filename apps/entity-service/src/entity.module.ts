import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import {
  CacheModule,
  JwtStrategy,
  HealthModule,
  EventModule,
} from '@app/common';
import { EntityController } from './entity.controller';
import { EntityService } from './entity.service';
import { BusinessEntity } from './entities/entity.entity';
import { Branch } from './entities/branch.entity';
import { Table } from './entities/table.entity';
import { Pump } from './entities/pump.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET', 'your-secret-key'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION', '24h'),
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
        type: 'postgres',
        host: configService.get('POSTGRES_HOST', 'localhost'),
        port: configService.get('POSTGRES_PORT', 5432),
        username: configService.get('POSTGRES_USER', 'billme_entity'),
        password: configService.get('POSTGRES_PASSWORD', 'billme_entity_pass'),
        database: configService.get('POSTGRES_DB', 'billme_entities'),
        entities: [BusinessEntity, Branch, Table, Pump],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),
    TypeOrmModule.forFeature([BusinessEntity, Branch, Table, Pump]),
  ],
  controllers: [EntityController],
  providers: [EntityService, JwtStrategy],
  exports: [EntityService],
})
export class EntityModule {}
