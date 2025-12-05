import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessEntity } from './entities/entity.entity';
import { Branch } from './entities/branch.entity';
import { Table } from './entities/table.entity';
import { Pump, PumpStatus } from './entities/pump.entity';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { CreatePumpDto } from './dto/create-pump.dto';
import { UpdatePumpDto } from './dto/update-pump.dto';
import { TableStatus } from './entities/table.entity';
import {
  ResponseUtil,
  EntityCategory,
  CacheService,
  UserRole,
  JwtPayload,
  JwtPayloadWithRole,
  QueryFilterUtil,
  EventService,
  EventType,
} from '@app/common';

@Injectable()
export class EntityService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly LIST_CACHE_TTL = 600; // 10 minutes for lists

  constructor(
    @InjectRepository(BusinessEntity)
    private readonly entityRepository: Repository<BusinessEntity>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(Pump)
    private readonly pumpRepository: Repository<Pump>,
    private cacheService: CacheService,
    private readonly eventService: EventService,
  ) {}

  // Category Operations
  async getCategories() {
    // Return all available entity categories
    const categories = Object.values(EntityCategory).map((category) => ({
      value: category,
      label: category
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase()),
    }));
    return ResponseUtil.success(
      categories,
      'Categories retrieved successfully',
    );
  }

  // Entity Operations
  async createEntity(createEntityDto: CreateEntityDto) {
    const entity = this.entityRepository.create(createEntityDto);
    const savedEntity = await this.entityRepository.save(entity);

    // Create default branch for the entity
    const defaultBranch = this.branchRepository.create({
      entityId: savedEntity.id,
      name: `${savedEntity.name} - Main Branch`,
      description: 'Default branch created automatically',
      address: createEntityDto.address || '',
      city: createEntityDto.city || '',
      country: createEntityDto.country || '',
      latitude: createEntityDto.latitude,
      longitude: createEntityDto.longitude,
      email: createEntityDto.email,
      phone: createEntityDto.phone,
      workingHours: createEntityDto.workingHours,
      isActive: true,
    });

    await this.branchRepository.save(defaultBranch);

    // Cache the new entity
    await this.cacheService.set(
      `entity:${savedEntity.id}`,
      savedEntity,
      this.CACHE_TTL,
    );
    // Invalidate lists cache
    await this.cacheService.deletePattern('entity:list:*');
    await this.cacheService.deletePattern('branch:list:*');

    return ResponseUtil.success(savedEntity, 'Entity created successfully');
  }

  async findAllEntities(
    category?: EntityCategory,
    ownerId?: string,
    isActive?: boolean,
    currentUser?: JwtPayloadWithRole,
  ) {
    // Generate cache key
    const cacheKey = `entity:list:${category || ''}:${ownerId || ''}:${isActive !== undefined ? isActive : ''}:${currentUser?.role || ''}:${currentUser?.entityId || ''}`;
    let entities = await this.cacheService.get<BusinessEntity[]>(cacheKey);

    if (!entities) {
      const queryBuilder = this.entityRepository.createQueryBuilder('entity');

      // Apply data isolation - entity owners can only see their own entities
      if (currentUser && currentUser.role === UserRole.ENTITY_OWNER) {
        queryBuilder.andWhere('entity.ownerId = :ownerId', {
          ownerId: currentUser.sub,
        });
      } else if (currentUser && currentUser.entityId) {
        // Managers and employees can only see their entity
        queryBuilder.andWhere('entity.id = :entityId', {
          entityId: currentUser.entityId,
        });
      }
      // Superadmin can see all entities (no filter)

      if (category) {
        queryBuilder.andWhere('entity.category = :category', { category });
      }

      if (ownerId) {
        queryBuilder.andWhere('entity.ownerId = :ownerId', { ownerId });
      }

      if (isActive !== undefined) {
        queryBuilder.andWhere('entity.isActive = :isActive', { isActive });
      }

      entities = await queryBuilder
        .leftJoinAndSelect('entity.branches', 'branches')
        .orderBy('entity.createdAt', 'DESC')
        .getMany();

      // Cache the result
      await this.cacheService.set(cacheKey, entities, this.LIST_CACHE_TTL);
    }

    return ResponseUtil.success(entities);
  }

  async findEntity(id: string, currentUser?: JwtPayloadWithRole) {
    const cacheKey = `entity:${id}`;
    let entity = await this.cacheService.get<BusinessEntity>(cacheKey);

    if (!entity) {
      entity = await this.entityRepository.findOne({
        where: { id },
        relations: ['branches'],
      });

      if (!entity) {
        throw new NotFoundException('Entity not found');
      }

      // Cache the entity
      await this.cacheService.set(cacheKey, entity, this.CACHE_TTL);
    }

    // Check access permissions
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        if (entity.ownerId !== currentUser.sub) {
          throw new ForbiddenException(
            'Access denied: Cannot access other entities',
          );
        }
      } else if (
        currentUser.role === UserRole.MANAGER ||
        currentUser.role === UserRole.EMPLOYEE
      ) {
        if (entity.id !== currentUser.entityId) {
          throw new ForbiddenException(
            'Access denied: Cannot access other entities',
          );
        }
      }
      // Superadmin can access all entities
    }

    return ResponseUtil.success(entity);
  }

  async findByOwner(ownerId: string) {
    const cacheKey = `entity:owner:${ownerId}`;
    let entities = await this.cacheService.get<BusinessEntity[]>(cacheKey);

    if (!entities) {
      entities = await this.entityRepository.find({
        where: { ownerId },
        relations: ['branches'],
      });

      await this.cacheService.set(cacheKey, entities, this.LIST_CACHE_TTL);
    }

    return ResponseUtil.success(entities);
  }

  async updateEntity(
    id: string,
    updateEntityDto: UpdateEntityDto,
    currentUser?: JwtPayloadWithRole,
  ) {
    const entity = await this.entityRepository.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    // Check access permissions
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        if (entity.ownerId !== currentUser.sub) {
          throw new ForbiddenException(
            'Access denied: Cannot update other entities',
          );
        }
      } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Access denied: Insufficient permissions');
      }
    }

    Object.assign(entity, updateEntityDto);
    const updatedEntity = await this.entityRepository.save(entity);

    // Update cache
    await this.cacheService.set(
      `entity:${updatedEntity.id}`,
      updatedEntity,
      this.CACHE_TTL,
    );
    // Invalidate related caches
    await this.cacheService.invalidateEntityCache(updatedEntity.id);
    await this.cacheService.deletePattern('entity:list:*');

    return ResponseUtil.success(updatedEntity, 'Entity updated successfully');
  }

  async deleteEntity(id: string, currentUser?: JwtPayloadWithRole) {
    const entity = await this.entityRepository.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    // Only superadmin can delete entities
    if (currentUser && currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Access denied: Only superadmin can delete entities',
      );
    }

    entity.isActive = false;
    await this.entityRepository.save(entity);

    // Invalidate all entity-related caches
    await this.cacheService.invalidateEntityCache(id);
    await this.cacheService.deletePattern('entity:list:*');

    return ResponseUtil.success(null, 'Entity deleted successfully');
  }

  // Branch Operations
  async createBranch(
    createBranchDto: CreateBranchDto,
    currentUser?: JwtPayloadWithRole,
  ) {
    const entity = await this.entityRepository.findOne({
      where: { id: createBranchDto.entityId },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    // Check access permissions
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        if (entity.ownerId !== currentUser.sub) {
          throw new ForbiddenException(
            'Access denied: Cannot create branches for other entities',
          );
        }
      } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Access denied: Insufficient permissions');
      }
    }

    const branch = this.branchRepository.create(createBranchDto);
    const savedBranch = await this.branchRepository.save(branch);

    // Cache the new branch
    await this.cacheService.set(
      `branch:${savedBranch.id}`,
      savedBranch,
      this.CACHE_TTL,
    );
    // Invalidate entity cache (since it has branches relation)
    await this.cacheService.invalidateEntityCache(createBranchDto.entityId);
    await this.cacheService.deletePattern('branch:list:*');

    // Emit branch created event
    this.eventService.emit(EventType.BRANCH_CREATED, {
      branchId: savedBranch.id,
      entityId: savedBranch.entityId,
      name: savedBranch.name,
    } as any);

    return ResponseUtil.success(savedBranch, 'Branch created successfully');
  }

  async findAllBranches(entityId?: string, currentUser?: JwtPayloadWithRole) {
    // Apply data isolation
    const effectiveEntityId = entityId || currentUser?.entityId;
    const cacheKey = `branch:list:${effectiveEntityId || 'all'}:${currentUser?.role || ''}:${currentUser?.branchId || ''}`;
    let branches = await this.cacheService.get<Branch[]>(cacheKey);

    if (!branches) {
      const queryBuilder = this.branchRepository.createQueryBuilder('branch');

      // Apply entity filter
      if (currentUser) {
        QueryFilterUtil.applyEntityFilter(
          queryBuilder,
          currentUser,
          'branch.entityId',
        );
      }

      if (effectiveEntityId) {
        queryBuilder.andWhere('branch.entityId = :entityId', {
          entityId: effectiveEntityId,
        });
      }

      // Apply branch filter for managers and employees
      if (currentUser) {
        QueryFilterUtil.applyBranchFilter(
          queryBuilder,
          currentUser,
          'branch.id',
        );
      }

      branches = await queryBuilder
        .orderBy('branch.createdAt', 'DESC')
        .getMany();

      await this.cacheService.set(cacheKey, branches, this.LIST_CACHE_TTL);
    }

    return ResponseUtil.success(branches);
  }

  async findBranch(id: string, currentUser?: JwtPayloadWithRole) {
    const cacheKey = `branch:${id}`;
    let branch = await this.cacheService.get<Branch>(cacheKey);

    if (!branch) {
      branch = await this.branchRepository.findOne({ where: { id } });

      if (!branch) {
        throw new NotFoundException('Branch not found');
      }

      await this.cacheService.set(cacheKey, branch, this.CACHE_TTL);
    }

    // Check access permissions
    if (currentUser) {
      // Check entity access
      if (!QueryFilterUtil.canAccessEntity(currentUser, branch.entityId)) {
        throw new ForbiddenException(
          'Access denied: Cannot access branch from another entity',
        );
      }

      // Check branch access for managers and employees
      if (
        !QueryFilterUtil.canAccessBranch(
          currentUser,
          branch.id,
          branch.entityId,
        )
      ) {
        throw new ForbiddenException(
          'Access denied: Cannot access branch from another branch',
        );
      }
    }

    return ResponseUtil.success(branch);
  }

  async updateBranch(
    id: string,
    updateBranchDto: Partial<CreateBranchDto>,
    currentUser?: JwtPayloadWithRole,
  ) {
    const branch = await this.branchRepository.findOne({ where: { id } });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Check access permissions
    if (currentUser) {
      // Check entity access
      if (!QueryFilterUtil.canAccessEntity(currentUser, branch.entityId)) {
        throw new ForbiddenException(
          'Access denied: Cannot update branch from another entity',
        );
      }

      // Managers can only update their own branch
      if (currentUser.role === UserRole.MANAGER) {
        if (branch.id !== currentUser.branchId) {
          throw new ForbiddenException(
            'Access denied: Managers can only update their assigned branch',
          );
        }
      } else if (currentUser.role === UserRole.EMPLOYEE) {
        throw new ForbiddenException(
          'Access denied: Employees cannot update branches',
        );
      }
    }

    Object.assign(branch, updateBranchDto);
    const updatedBranch = await this.branchRepository.save(branch);

    // Update cache
    await this.cacheService.set(
      `branch:${updatedBranch.id}`,
      updatedBranch,
      this.CACHE_TTL,
    );
    // Invalidate entity cache and branch lists
    if (updatedBranch.entityId) {
      await this.cacheService.invalidateEntityCache(updatedBranch.entityId);
    }
    await this.cacheService.deletePattern('branch:list:*');

    return ResponseUtil.success(updatedBranch, 'Branch updated successfully');
  }

  async assignManager(
    branchId: string,
    managerId: string,
    currentUser?: JwtPayloadWithRole,
  ) {
    const branch = await this.branchRepository.findOne({
      where: { id: branchId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Check access permissions - only superadmin and entity owners can assign managers
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        // Entity owner must own the entity
        const entity = await this.entityRepository.findOne({
          where: { id: branch.entityId },
        });
        if (!entity || entity.ownerId !== currentUser.sub) {
          throw new ForbiddenException(
            'Access denied: Cannot assign manager to branch from another entity',
          );
        }
      } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          'Access denied: Only superadmin and entity owners can assign managers',
        );
      }
    }

    branch.managerId = managerId;
    const updatedBranch = await this.branchRepository.save(branch);

    // Update cache
    await this.cacheService.set(
      `branch:${updatedBranch.id}`,
      updatedBranch,
      this.CACHE_TTL,
    );
    if (updatedBranch.entityId) {
      await this.cacheService.invalidateEntityCache(updatedBranch.entityId);
    }

    return ResponseUtil.success(updatedBranch, 'Manager assigned successfully');
  }

  async deleteBranch(id: string, currentUser?: JwtPayloadWithRole) {
    const branch = await this.branchRepository.findOne({ where: { id } });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Check access permissions - only superadmin and entity owners can delete branches
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        // Entity owner must own the entity
        const entity = await this.entityRepository.findOne({
          where: { id: branch.entityId },
        });
        if (!entity || entity.ownerId !== currentUser.sub) {
          throw new ForbiddenException(
            'Access denied: Cannot delete branch from another entity',
          );
        }
      } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          'Access denied: Only superadmin and entity owners can delete branches',
        );
      }
    }

    branch.isActive = false;
    await this.branchRepository.save(branch);

    // Invalidate branch and entity caches
    await this.cacheService.delete(`branch:${id}`);
    await this.cacheService.deletePattern('branch:list:*');
    if (branch.entityId) {
      await this.cacheService.invalidateEntityCache(branch.entityId);
    }

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

  // Table Operations (Restaurant-specific)
  async createTable(
    createTableDto: CreateTableDto,
    currentUser?: JwtPayloadWithRole,
  ) {
    // Verify branch exists and belongs to entity
    const branch = await this.branchRepository.findOne({
      where: { id: createTableDto.branchId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    if (branch.entityId !== createTableDto.entityId) {
      throw new ConflictException(
        'Branch does not belong to the specified entity',
      );
    }

    // Check access permissions
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        if (createTableDto.entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            'Access denied: Cannot create tables for other entities',
          );
        }
      } else if (currentUser.role === UserRole.MANAGER) {
        if (createTableDto.entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            'Access denied: Cannot create tables for other entities',
          );
        }
        if (createTableDto.branchId !== currentUser.branchId) {
          throw new ForbiddenException(
            'Access denied: Managers can only create tables for their branch',
          );
        }
      } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          'Access denied: Only superadmin, entity owners, and managers can create tables',
        );
      }
    }

    const table = this.tableRepository.create(createTableDto);
    const savedTable = await this.tableRepository.save(table);

    // Update branch totalTables count
    branch.totalTables = (branch.totalTables || 0) + 1;
    await this.branchRepository.save(branch);

    // Invalidate cache
    await this.cacheService.deletePattern('table:list:*');
    await this.cacheService.invalidateEntityCache(createTableDto.entityId);

    // Emit table created event
    this.eventService.emit(EventType.TABLE_CREATED, {
      tableId: savedTable.id,
      entityId: savedTable.entityId,
      branchId: savedTable.branchId,
      name: savedTable.name,
      capacity: savedTable.capacity,
      status: savedTable.status,
    } as any);

    return ResponseUtil.success(savedTable, 'Table created successfully');
  }

  async findAllTables(
    entityId?: string,
    branchId?: string,
    status?: TableStatus,
    currentUser?: JwtPayloadWithRole,
  ) {
    const queryBuilder = this.tableRepository.createQueryBuilder('table');

    // Apply data isolation
    if (currentUser) {
      QueryFilterUtil.applyEntityFilter(
        queryBuilder,
        currentUser,
        'table.entityId',
      );

      // Managers can only see tables in their branch
      if (currentUser.role === UserRole.MANAGER) {
        QueryFilterUtil.applyBranchFilter(
          queryBuilder,
          currentUser,
          'table.branchId',
        );
      }
    }

    if (entityId) {
      queryBuilder.andWhere('table.entityId = :entityId', { entityId });
    }

    if (branchId) {
      queryBuilder.andWhere('table.branchId = :branchId', { branchId });
    }

    if (status) {
      queryBuilder.andWhere('table.status = :status', { status });
    }

    queryBuilder
      .andWhere('table.isActive = :isActive', { isActive: true })
      .orderBy('table.name', 'ASC');

    const tables = await queryBuilder.getMany();

    return ResponseUtil.success(tables);
  }

  async findTable(id: string, currentUser?: JwtPayloadWithRole) {
    const table = await this.tableRepository.findOne({ where: { id } });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    // Check access permissions
    if (currentUser) {
      if (!QueryFilterUtil.canAccessEntity(currentUser, table.entityId)) {
        throw new ForbiddenException(
          'Access denied: Cannot access table from another entity',
        );
      }

      // Managers can only access tables in their branch
      if (currentUser.role === UserRole.MANAGER) {
        if (
          !QueryFilterUtil.canAccessBranch(
            currentUser,
            table.branchId,
            table.entityId,
          )
        ) {
          throw new ForbiddenException(
            'Access denied: Cannot access table from another branch',
          );
        }
      }
    }

    return ResponseUtil.success(table);
  }

  async updateTable(
    id: string,
    updateTableDto: UpdateTableDto,
    currentUser?: JwtPayloadWithRole,
  ) {
    const table = await this.tableRepository.findOne({ where: { id } });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    // Check access permissions
    if (currentUser) {
      if (!QueryFilterUtil.canAccessEntity(currentUser, table.entityId)) {
        throw new ForbiddenException(
          'Access denied: Cannot update table from another entity',
        );
      }

      // Managers can only update tables in their branch
      if (currentUser.role === UserRole.MANAGER) {
        if (
          !QueryFilterUtil.canAccessBranch(
            currentUser,
            table.branchId,
            table.entityId,
          )
        ) {
          throw new ForbiddenException(
            'Access denied: Managers can only update tables in their branch',
          );
        }
      } else if (currentUser.role === UserRole.EMPLOYEE) {
        throw new ForbiddenException(
          'Access denied: Employees cannot update tables',
        );
      }
    }

    Object.assign(table, updateTableDto);
    const updatedTable = await this.tableRepository.save(table);

    // Invalidate cache
    await this.cacheService.deletePattern('table:list:*');

    // Emit table updated event
    this.eventService.emit(EventType.TABLE_UPDATED, {
      tableId: updatedTable.id,
      entityId: updatedTable.entityId,
      branchId: updatedTable.branchId,
      name: updatedTable.name,
      status: updatedTable.status,
    } as any);

    return ResponseUtil.success(updatedTable, 'Table updated successfully');
  }

  async updateTableStatus(
    id: string,
    status: TableStatus,
    currentUser?: JwtPayloadWithRole,
  ) {
    const table = await this.tableRepository.findOne({ where: { id } });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    // Check access permissions
    if (currentUser) {
      if (!QueryFilterUtil.canAccessEntity(currentUser, table.entityId)) {
        throw new ForbiddenException(
          'Access denied: Cannot update table status from another entity',
        );
      }

      // Managers and employees can update table status in their branch
      if (
        currentUser.role === UserRole.MANAGER ||
        currentUser.role === UserRole.EMPLOYEE
      ) {
        if (
          !QueryFilterUtil.canAccessBranch(
            currentUser,
            table.branchId,
            table.entityId,
          )
        ) {
          throw new ForbiddenException(
            'Access denied: Cannot update table status from another branch',
          );
        }
      }
    }

    table.status = status;
    const updatedTable = await this.tableRepository.save(table);

    // Invalidate cache
    await this.cacheService.deletePattern('table:list:*');

    // Emit table status changed event
    this.eventService.emitTableStatusChanged({
      tableId: updatedTable.id,
      entityId: updatedTable.entityId,
      branchId: updatedTable.branchId,
      name: updatedTable.name,
      status: updatedTable.status,
      previousStatus: table.status,
    } as any);

    return ResponseUtil.success(
      updatedTable,
      'Table status updated successfully',
    );
  }

  async deleteTable(id: string, currentUser?: JwtPayloadWithRole) {
    const table = await this.tableRepository.findOne({ where: { id } });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    // Check access permissions
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        if (table.entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            'Access denied: Cannot delete table from another entity',
          );
        }
      } else if (currentUser.role === UserRole.MANAGER) {
        if (
          table.entityId !== currentUser.entityId ||
          table.branchId !== currentUser.branchId
        ) {
          throw new ForbiddenException(
            'Access denied: Managers can only delete tables in their branch',
          );
        }
      } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          'Access denied: Only superadmin, entity owners, and managers can delete tables',
        );
      }
    }

    table.isActive = false;
    await this.tableRepository.save(table);

    // Update branch totalTables count
    const branch = await this.branchRepository.findOne({
      where: { id: table.branchId },
    });
    if (branch && branch.totalTables && branch.totalTables > 0) {
      branch.totalTables -= 1;
      await this.branchRepository.save(branch);
    }

    // Invalidate cache
    await this.cacheService.deletePattern('table:list:*');
    await this.cacheService.invalidateEntityCache(table.entityId);

    return ResponseUtil.success(null, 'Table deleted successfully');
  }

  // Pump Operations (Gas Station-specific)
  async createPump(
    createPumpDto: CreatePumpDto,
    currentUser?: JwtPayloadWithRole,
  ) {
    // Verify branch exists and belongs to entity
    const branch = await this.branchRepository.findOne({
      where: { id: createPumpDto.branchId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    if (branch.entityId !== createPumpDto.entityId) {
      throw new ConflictException(
        'Branch does not belong to the specified entity',
      );
    }

    // Check access permissions
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        if (createPumpDto.entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            'Access denied: Cannot create pumps for other entities',
          );
        }
      } else if (currentUser.role === UserRole.MANAGER) {
        if (createPumpDto.entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            'Access denied: Cannot create pumps for other entities',
          );
        }
        if (createPumpDto.branchId !== currentUser.branchId) {
          throw new ForbiddenException(
            'Access denied: Managers can only create pumps for their branch',
          );
        }
      } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          'Access denied: Only superadmin, entity owners, and managers can create pumps',
        );
      }
    }

    // Check if pump number already exists in this branch
    const existingPump = await this.pumpRepository.findOne({
      where: {
        branchId: createPumpDto.branchId,
        pumpNumber: createPumpDto.pumpNumber,
      },
    });

    if (existingPump) {
      throw new ConflictException(
        `Pump with number ${createPumpDto.pumpNumber} already exists in this branch`,
      );
    }

    const pump = this.pumpRepository.create(createPumpDto);
    const savedPump = await this.pumpRepository.save(pump);

    // Update branch totalPumps count
    branch.totalPumps = (branch.totalPumps || 0) + 1;
    await this.branchRepository.save(branch);

    // Invalidate cache
    await this.cacheService.deletePattern('pump:list:*');
    await this.cacheService.invalidateEntityCache(createPumpDto.entityId);

    // Emit pump created event
    this.eventService.emit(EventType.PUMP_CREATED, {
      pumpId: savedPump.id,
      entityId: savedPump.entityId,
      branchId: savedPump.branchId,
      name: savedPump.name,
      pumpNumber: savedPump.pumpNumber,
      status: savedPump.status,
      fuelType: savedPump.fuelType,
    } as any);

    return ResponseUtil.success(savedPump, 'Pump created successfully');
  }

  async findAllPumps(
    entityId?: string,
    branchId?: string,
    status?: PumpStatus,
    currentUser?: JwtPayloadWithRole,
  ) {
    const queryBuilder = this.pumpRepository.createQueryBuilder('pump');

    // Apply data isolation
    if (currentUser) {
      QueryFilterUtil.applyEntityFilter(
        queryBuilder,
        currentUser,
        'pump.entityId',
      );

      // Managers can only see pumps in their branch
      if (currentUser.role === UserRole.MANAGER) {
        QueryFilterUtil.applyBranchFilter(
          queryBuilder,
          currentUser,
          'pump.branchId',
        );
      }
    }

    if (entityId) {
      queryBuilder.andWhere('pump.entityId = :entityId', { entityId });
    }

    if (branchId) {
      queryBuilder.andWhere('pump.branchId = :branchId', { branchId });
    }

    if (status) {
      queryBuilder.andWhere('pump.status = :status', { status });
    }

    queryBuilder.andWhere('pump.isActive = :isActive', { isActive: true });

    const pumps = await queryBuilder
      .orderBy('pump.pumpNumber', 'ASC')
      .getMany();

    return ResponseUtil.success(pumps);
  }

  async findPump(id: string, currentUser?: JwtPayloadWithRole) {
    const pump = await this.pumpRepository.findOne({ where: { id } });

    if (!pump) {
      throw new NotFoundException('Pump not found');
    }

    // Check access permissions
    if (currentUser) {
      if (!QueryFilterUtil.canAccessEntity(currentUser, pump.entityId)) {
        throw new ForbiddenException(
          'Access denied: Cannot access pump from another entity',
        );
      }

      // Managers can only access pumps in their branch
      if (currentUser.role === UserRole.MANAGER) {
        if (
          !QueryFilterUtil.canAccessBranch(
            currentUser,
            pump.branchId,
            pump.entityId,
          )
        ) {
          throw new ForbiddenException(
            'Access denied: Cannot access pump from another branch',
          );
        }
      }
    }

    return ResponseUtil.success(pump);
  }

  async updatePump(
    id: string,
    updatePumpDto: UpdatePumpDto,
    currentUser?: JwtPayloadWithRole,
  ) {
    const pump = await this.pumpRepository.findOne({ where: { id } });

    if (!pump) {
      throw new NotFoundException('Pump not found');
    }

    // Check access permissions
    if (currentUser) {
      if (!QueryFilterUtil.canAccessEntity(currentUser, pump.entityId)) {
        throw new ForbiddenException(
          'Access denied: Cannot update pump from another entity',
        );
      }

      // Managers can only update pumps in their branch
      if (currentUser.role === UserRole.MANAGER) {
        if (
          !QueryFilterUtil.canAccessBranch(
            currentUser,
            pump.branchId,
            pump.entityId,
          )
        ) {
          throw new ForbiddenException(
            'Access denied: Managers can only update pumps in their branch',
          );
        }
      } else if (currentUser.role === UserRole.EMPLOYEE) {
        throw new ForbiddenException(
          'Access denied: Employees cannot update pumps',
        );
      }
    }

    // Check if pump number is being changed and if it conflicts
    if (
      updatePumpDto.pumpNumber &&
      updatePumpDto.pumpNumber !== pump.pumpNumber
    ) {
      const existingPump = await this.pumpRepository.findOne({
        where: {
          branchId: pump.branchId,
          pumpNumber: updatePumpDto.pumpNumber,
        },
      });

      if (existingPump && existingPump.id !== pump.id) {
        throw new ConflictException(
          `Pump with number ${updatePumpDto.pumpNumber} already exists in this branch`,
        );
      }
    }

    Object.assign(pump, updatePumpDto);
    const updatedPump = await this.pumpRepository.save(pump);

    // Invalidate cache
    await this.cacheService.deletePattern('pump:list:*');

    // Emit pump updated event
    this.eventService.emit(EventType.PUMP_UPDATED, {
      pumpId: updatedPump.id,
      entityId: updatedPump.entityId,
      branchId: updatedPump.branchId,
      name: updatedPump.name,
      pumpNumber: updatedPump.pumpNumber,
      status: updatedPump.status,
    } as any);

    return ResponseUtil.success(updatedPump, 'Pump updated successfully');
  }

  async updatePumpStatus(
    id: string,
    status: PumpStatus,
    currentUser?: JwtPayloadWithRole,
  ) {
    const pump = await this.pumpRepository.findOne({ where: { id } });

    if (!pump) {
      throw new NotFoundException('Pump not found');
    }

    // Check access permissions
    if (currentUser) {
      if (!QueryFilterUtil.canAccessEntity(currentUser, pump.entityId)) {
        throw new ForbiddenException(
          'Access denied: Cannot update pump status from another entity',
        );
      }

      // Managers and employees can update pump status in their branch
      if (
        currentUser.role === UserRole.MANAGER ||
        currentUser.role === UserRole.EMPLOYEE
      ) {
        if (
          !QueryFilterUtil.canAccessBranch(
            currentUser,
            pump.branchId,
            pump.entityId,
          )
        ) {
          throw new ForbiddenException(
            'Access denied: Cannot update pump status from another branch',
          );
        }
      }
    }

    const previousStatus = pump.status;
    pump.status = status;
    const updatedPump = await this.pumpRepository.save(pump);

    // Invalidate cache
    await this.cacheService.deletePattern('pump:list:*');

    // Emit pump status changed event
    this.eventService.emitPumpStatusChanged({
      pumpId: updatedPump.id,
      entityId: updatedPump.entityId,
      branchId: updatedPump.branchId,
      name: updatedPump.name,
      pumpNumber: updatedPump.pumpNumber,
      status: updatedPump.status,
      previousStatus: previousStatus,
    } as any);

    return ResponseUtil.success(
      updatedPump,
      'Pump status updated successfully',
    );
  }

  async deletePump(id: string, currentUser?: JwtPayloadWithRole) {
    const pump = await this.pumpRepository.findOne({ where: { id } });

    if (!pump) {
      throw new NotFoundException('Pump not found');
    }

    // Check access permissions
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        if (pump.entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            'Access denied: Cannot delete pump from another entity',
          );
        }
      } else if (currentUser.role === UserRole.MANAGER) {
        if (
          pump.entityId !== currentUser.entityId ||
          pump.branchId !== currentUser.branchId
        ) {
          throw new ForbiddenException(
            'Access denied: Managers can only delete pumps in their branch',
          );
        }
      } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          'Access denied: Only superadmin, entity owners, and managers can delete pumps',
        );
      }
    }

    // Update branch totalPumps count
    const branch = await this.branchRepository.findOne({
      where: { id: pump.branchId },
    });
    if (branch) {
      branch.totalPumps = Math.max((branch.totalPumps || 0) - 1, 0);
      await this.branchRepository.save(branch);
    }

    // Emit pump deleted event before deletion
    this.eventService.emit(EventType.PUMP_DELETED, {
      pumpId: pump.id,
      entityId: pump.entityId,
      branchId: pump.branchId,
      name: pump.name,
      pumpNumber: pump.pumpNumber,
    } as any);

    pump.isActive = false;
    await this.pumpRepository.save(pump);

    // Invalidate cache
    await this.cacheService.deletePattern('pump:list:*');

    return ResponseUtil.success(null, 'Pump deleted successfully');
  }
}
