import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessEntity } from './entities/entity.entity';
import { Branch } from './entities/branch.entity';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { ResponseUtil, EntityCategory } from '@app/common';

@Injectable()
export class EntityService {
  constructor(
    @InjectRepository(BusinessEntity)
    private readonly entityRepository: Repository<BusinessEntity>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  // Entity Operations
  async createEntity(createEntityDto: CreateEntityDto) {
    const entity = this.entityRepository.create(createEntityDto);
    const savedEntity = await this.entityRepository.save(entity);

    return ResponseUtil.success(savedEntity, 'Entity created successfully');
  }

  async findAllEntities(
    category?: EntityCategory,
    ownerId?: string,
    isActive?: boolean,
  ) {
    const queryBuilder = this.entityRepository.createQueryBuilder('entity');

    if (category) {
      queryBuilder.andWhere('entity.category = :category', { category });
    }

    if (ownerId) {
      queryBuilder.andWhere('entity.ownerId = :ownerId', { ownerId });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('entity.isActive = :isActive', { isActive });
    }

    const entities = await queryBuilder
      .leftJoinAndSelect('entity.branches', 'branches')
      .orderBy('entity.createdAt', 'DESC')
      .getMany();

    return ResponseUtil.success(entities);
  }

  async findEntity(id: string) {
    const entity = await this.entityRepository.findOne({
      where: { id },
      relations: ['branches'],
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    return ResponseUtil.success(entity);
  }

  async findByOwner(ownerId: string) {
    const entities = await this.entityRepository.find({
      where: { ownerId },
      relations: ['branches'],
    });

    return ResponseUtil.success(entities);
  }

  async updateEntity(id: string, updateEntityDto: UpdateEntityDto) {
    const entity = await this.entityRepository.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    Object.assign(entity, updateEntityDto);
    const updatedEntity = await this.entityRepository.save(entity);

    return ResponseUtil.success(updatedEntity, 'Entity updated successfully');
  }

  async deleteEntity(id: string) {
    const entity = await this.entityRepository.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    entity.isActive = false;
    await this.entityRepository.save(entity);

    return ResponseUtil.success(null, 'Entity deleted successfully');
  }

  // Branch Operations
  async createBranch(createBranchDto: CreateBranchDto) {
    const entity = await this.entityRepository.findOne({
      where: { id: createBranchDto.entityId },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    const branch = this.branchRepository.create(createBranchDto);
    const savedBranch = await this.branchRepository.save(branch);

    return ResponseUtil.success(savedBranch, 'Branch created successfully');
  }

  async findAllBranches(entityId?: string) {
    const queryBuilder = this.branchRepository.createQueryBuilder('branch');

    if (entityId) {
      queryBuilder.where('branch.entityId = :entityId', { entityId });
    }

    const branches = await queryBuilder
      .orderBy('branch.createdAt', 'DESC')
      .getMany();

    return ResponseUtil.success(branches);
  }

  async findBranch(id: string) {
    const branch = await this.branchRepository.findOne({ where: { id } });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return ResponseUtil.success(branch);
  }

  async updateBranch(id: string, updateBranchDto: Partial<CreateBranchDto>) {
    const branch = await this.branchRepository.findOne({ where: { id } });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    Object.assign(branch, updateBranchDto);
    const updatedBranch = await this.branchRepository.save(branch);

    return ResponseUtil.success(updatedBranch, 'Branch updated successfully');
  }

  async assignManager(branchId: string, managerId: string) {
    const branch = await this.branchRepository.findOne({
      where: { id: branchId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    branch.managerId = managerId;
    const updatedBranch = await this.branchRepository.save(branch);

    return ResponseUtil.success(updatedBranch, 'Manager assigned successfully');
  }

  async deleteBranch(id: string) {
    const branch = await this.branchRepository.findOne({ where: { id } });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    branch.isActive = false;
    await this.branchRepository.save(branch);

    return ResponseUtil.success(null, 'Branch deleted successfully');
  }

  async getEntityStats(entityId?: string) {
    const queryBuilder = this.entityRepository.createQueryBuilder('entity');

    if (entityId) {
      queryBuilder.where('entity.id = :entityId', { entityId });
    }

    const totalEntities = await queryBuilder.getCount();
    const activeEntities = await queryBuilder
      .clone()
      .andWhere('entity.isActive = :isActive', { isActive: true })
      .getCount();

    const byCategory = await this.entityRepository
      .createQueryBuilder('entity')
      .select('entity.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('entity.category')
      .getRawMany();

    return ResponseUtil.success({
      totalEntities,
      activeEntities,
      byCategory,
    });
  }

  async getNearbyEntities(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    category?: EntityCategory,
  ) {
    // Haversine formula for distance calculation
    const queryBuilder = this.entityRepository.createQueryBuilder('entity');

    if (category) {
      queryBuilder.where('entity.category = :category', { category });
    }

    queryBuilder.andWhere('entity.isActive = :isActive', { isActive: true });

    const entities = await queryBuilder.getMany();

    // Filter by distance (simplified - in production use PostGIS)
    const nearby = entities.filter((entity) => {
      if (!entity.latitude || !entity.longitude) return false;

      const distance = this.calculateDistance(
        latitude,
        longitude,
        entity.latitude,
        entity.longitude,
      );

      return distance <= radiusKm;
    });

    return ResponseUtil.success(nearby);
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
