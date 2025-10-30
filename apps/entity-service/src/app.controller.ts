import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EntityService } from './app.service';

@Controller()
export class EntityController {
  constructor(private readonly entityService: EntityService) {}

  @MessagePattern('entity.create')
  async createEntity(@Payload() data: any) {
    return this.entityService.createEntity(data);
  }

  @MessagePattern('entity.get')
  async getEntity(@Payload() data: any) {
    return this.entityService.getEntity(data.id);
  }

  @MessagePattern('entity.update')
  async updateEntity(@Payload() data: any) {
    return this.entityService.updateEntity(data.id, data.updateData);
  }

  @MessagePattern('entity.delete')
  async deleteEntity(@Payload() data: any) {
    return this.entityService.deleteEntity(data.id);
  }

  @MessagePattern('entity.list')
  async listEntities(@Payload() data: any) {
    return this.entityService.listEntities(data.ownerId);
  }
}
