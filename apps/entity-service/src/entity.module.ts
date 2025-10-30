import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntityController } from './entity.controller';
import { EntityService } from './entity.service';
import { BusinessEntity } from './entities/entity.entity';
import { Branch } from './entities/branch.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST', 'localhost'),
        port: configService.get('POSTGRES_PORT', 5432),
        username: configService.get('POSTGRES_USER', 'billme_entity'),
        password: configService.get('POSTGRES_PASSWORD', 'billme_entity_pass'),
        database: configService.get('POSTGRES_DB', 'billme_entities'),
        entities: [BusinessEntity, Branch],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),
    TypeOrmModule.forFeature([BusinessEntity, Branch]),
  ],
  controllers: [EntityController],
  providers: [EntityService],
  exports: [EntityService],
})
export class EntityModule {}
