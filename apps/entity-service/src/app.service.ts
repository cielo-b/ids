import { Injectable } from '@nestjs/common';

@Injectable()
export class EntityService {
  async createEntity(data: any) {
    return { message: 'Create entity endpoint', data };
  }

  async getEntity(id: string) {
    return { message: 'Get entity endpoint', id };
  }

  async updateEntity(id: string, updateData: any) {
    return { message: 'Update entity endpoint', id, updateData };
  }

  async deleteEntity(id: string) {
    return { message: 'Delete entity endpoint', id };
  }

  async listEntities(ownerId: string) {
    return { message: 'List entities endpoint', ownerId };
  }
}
