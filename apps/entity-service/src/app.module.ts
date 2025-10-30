import { Module } from '@nestjs/common';
import { EntityController } from './app.controller';
import { EntityService } from './app.service';

@Module({
  imports: [],
  controllers: [EntityController],
  providers: [EntityService],
})
export class EntityModule {}
