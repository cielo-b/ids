import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Manager } from "./entities/manager.entity";
import { CreateManagerDto } from "./dto/create-manager.dto";
import { UpdateManagerDto } from "./dto/update-manager.dto";
import { ResponseUtil, CacheService } from "@app/common";

@Injectable()
export class ManagerService {
  private readonly CACHE_TTL = 1800; // 30 minutes
  private readonly LIST_CACHE_TTL = 300; // 5 minutes for lists

  constructor(
    @InjectRepository(Manager)
    private readonly managerRepository: Repository<Manager>,
    private cacheService: CacheService
  ) {}

  async create(createManagerDto: CreateManagerDto) {
    const existingManager = await this.managerRepository.findOne({
      where: { userId: createManagerDto.userId },
    });

    if (existingManager) {
      throw new ConflictException("Manager already exists for this user");
    }

    const manager = this.managerRepository.create(createManagerDto);
    const savedManager = await this.managerRepository.save(manager);

    // Cache the new manager
    await this.cacheService.set(
      `manager:${savedManager.id}`,
      savedManager,
      this.CACHE_TTL
    );
    // Invalidate lists cache
    await this.cacheService.deletePattern("manager:list:*");

    return ResponseUtil.success(savedManager, "Manager created successfully");
  }

  async findAll(entityId?: string, branchId?: string) {
    // Generate cache key
    const cacheKey = `manager:list:${entityId || ""}:${branchId || ""}`;
    let managers = await this.cacheService.get<Manager[]>(cacheKey);

    if (!managers) {
      const queryBuilder = this.managerRepository.createQueryBuilder("manager");

      if (entityId) {
        queryBuilder.andWhere("manager.entityId = :entityId", { entityId });
      }

      if (branchId) {
        queryBuilder.andWhere("manager.branchId = :branchId", { branchId });
      }

      managers = await queryBuilder
        .orderBy("manager.createdAt", "DESC")
        .getMany();

      await this.cacheService.set(cacheKey, managers, this.LIST_CACHE_TTL);
    }

    return ResponseUtil.success(managers);
  }

  async findOne(id: string) {
    const cacheKey = `manager:${id}`;
    let manager = await this.cacheService.get<Manager>(cacheKey);

    if (!manager) {
      manager = await this.managerRepository.findOne({ where: { id } });

      if (!manager) {
        throw new NotFoundException("Manager not found");
      }

      await this.cacheService.set(cacheKey, manager, this.CACHE_TTL);
    }

    return ResponseUtil.success(manager);
  }

  async findByUserId(userId: string) {
    const cacheKey = `manager:userId:${userId}`;
    let manager = await this.cacheService.get<Manager>(cacheKey);

    if (!manager) {
      manager = await this.managerRepository.findOne({
        where: { userId },
      });

      if (!manager) {
        throw new NotFoundException("Manager not found");
      }

      // Cache by both ID and userId
      await this.cacheService.set(
        `manager:${manager.id}`,
        manager,
        this.CACHE_TTL
      );
      await this.cacheService.set(cacheKey, manager, this.CACHE_TTL);
    }

    return ResponseUtil.success(manager);
  }

  async findByEntity(entityId: string) {
    const cacheKey = `manager:entity:${entityId}`;
    let managers = await this.cacheService.get<Manager[]>(cacheKey);

    if (!managers) {
      managers = await this.managerRepository.find({
        where: { entityId },
      });

      await this.cacheService.set(cacheKey, managers, this.LIST_CACHE_TTL);
    }

    return ResponseUtil.success(managers);
  }

  async findByBranch(branchId: string) {
    const cacheKey = `manager:branch:${branchId}`;
    let managers = await this.cacheService.get<Manager[]>(cacheKey);

    if (!managers) {
      managers = await this.managerRepository.find({
        where: { branchId },
      });

      await this.cacheService.set(cacheKey, managers, this.LIST_CACHE_TTL);
    }

    return ResponseUtil.success(managers);
  }

  async update(id: string, updateManagerDto: UpdateManagerDto) {
    const manager = await this.managerRepository.findOne({ where: { id } });

    if (!manager) {
      throw new NotFoundException("Manager not found");
    }

    Object.assign(manager, updateManagerDto);
    const updatedManager = await this.managerRepository.save(manager);

    // Update cache
    await this.cacheService.set(
      `manager:${updatedManager.id}`,
      updatedManager,
      this.CACHE_TTL
    );
    // Invalidate related caches
    await this.cacheService.delete(`manager:userId:${updatedManager.userId}`);
    await this.cacheService.deletePattern("manager:list:*");
    if (updatedManager.entityId) {
      await this.cacheService.delete(
        `manager:entity:${updatedManager.entityId}`
      );
    }
    if (updatedManager.branchId) {
      await this.cacheService.delete(
        `manager:branch:${updatedManager.branchId}`
      );
    }

    return ResponseUtil.success(updatedManager, "Manager updated successfully");
  }

  async updateMetrics(id: string, metrics: any) {
    const manager = await this.managerRepository.findOne({ where: { id } });

    if (!manager) {
      throw new NotFoundException("Manager not found");
    }

    manager.metrics = { ...manager.metrics, ...metrics };
    const updatedManager = await this.managerRepository.save(manager);

    // Update cache
    await this.cacheService.set(
      `manager:${updatedManager.id}`,
      updatedManager,
      this.CACHE_TTL
    );

    return ResponseUtil.success(updatedManager, "Metrics updated successfully");
  }

  async updatePerformanceScore(id: string, score: number) {
    const manager = await this.managerRepository.findOne({ where: { id } });

    if (!manager) {
      throw new NotFoundException("Manager not found");
    }

    manager.performanceScore = score;
    manager.lastActiveAt = new Date();
    const updatedManager = await this.managerRepository.save(manager);

    // Update cache
    await this.cacheService.set(
      `manager:${updatedManager.id}`,
      updatedManager,
      this.CACHE_TTL
    );

    return ResponseUtil.success(
      updatedManager,
      "Performance score updated successfully"
    );
  }

  async getStats(entityId?: string) {
    const cacheKey = `manager:stats:${entityId || "all"}`;
    let stats = await this.cacheService.get<any>(cacheKey);

    if (!stats) {
      const queryBuilder = this.managerRepository.createQueryBuilder("manager");

      if (entityId) {
        queryBuilder.where("manager.entityId = :entityId", { entityId });
      }

      const totalManagers = await queryBuilder.getCount();
      const activeManagers = await queryBuilder
        .clone()
        .andWhere("manager.isActive = :isActive", { isActive: true })
        .getCount();

      const topPerformers = await this.managerRepository.find({
        where: entityId ? { entityId } : {},
        order: { performanceScore: "DESC" },
        take: 10,
      });

      stats = {
        totalManagers,
        activeManagers,
        topPerformers,
      };

      await this.cacheService.set(cacheKey, stats, this.LIST_CACHE_TTL);
    }

    return ResponseUtil.success(stats);
  }

  async remove(id: string) {
    const manager = await this.managerRepository.findOne({ where: { id } });

    if (!manager) {
      throw new NotFoundException("Manager not found");
    }

    await this.managerRepository.remove(manager);

    // Invalidate all manager-related caches
    await this.cacheService.delete(`manager:${id}`);
    await this.cacheService.delete(`manager:userId:${manager.userId}`);
    await this.cacheService.deletePattern("manager:list:*");
    if (manager.entityId) {
      await this.cacheService.delete(`manager:entity:${manager.entityId}`);
    }
    if (manager.branchId) {
      await this.cacheService.delete(`manager:branch:${manager.branchId}`);
    }

    return ResponseUtil.success(null, "Manager deleted successfully");
  }
}
