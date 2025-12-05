import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike } from "typeorm";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { User } from "./entities/user.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { QueryUserDto } from "./dto/query-user.dto";
import {
  ResponseUtil,
  CacheService,
  UserRole,
  JwtPayload,
  JwtPayloadWithRole,
  QueryFilterUtil,
  EmployeeTypeUtil,
  EmployeeType,
  EntityCategory,
} from "@app/common";

@Injectable()
export class UserService {
  private readonly CACHE_TTL = 1800; // 30 minutes
  private readonly LIST_CACHE_TTL = 300; // 5 minutes for lists

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private cacheService: CacheService,
    private httpService: HttpService,
    private configService: ConfigService
  ) {}

  async create(createUserDto: CreateUserDto, currentUser?: JwtPayloadWithRole) {
    // Validate role-based user creation (skip validation for internal calls)
    if (currentUser) {
      await this.validateUserCreation(createUserDto, currentUser);
    }

    const existingUserByEmail = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUserByEmail) {
      throw new ConflictException("User with this email already exists");
    }

    const existingUserByPhone = await this.userRepository.findOne({
      where: { phoneNumber: createUserDto.phoneNumber },
    });

    if (existingUserByPhone) {
      throw new ConflictException("User with this phone number already exists");
    }

    // Ensure entityId is set based on current user's context (only if authenticated)
    if (currentUser && currentUser.role === UserRole.ENTITY_OWNER) {
      if (!createUserDto.entityId) {
        createUserDto.entityId = currentUser.entityId;
      } else if (createUserDto.entityId !== currentUser.entityId) {
        throw new ForbiddenException("Cannot create users for other entities");
      }
    }

    const user = this.userRepository.create(createUserDto);
    const savedUser = await this.userRepository.save(user);

    // If creating entity owner, update entity's ownerId
    if (savedUser.role === UserRole.ENTITY_OWNER && savedUser.entityId) {
      const entityServiceUrl = this.configService.get(
        "ENTITY_SERVICE_URL",
        "http://entity-service:3003"
      );
      try {
        await firstValueFrom(
          this.httpService.patch(
            `${entityServiceUrl}/api/v1/entities/${savedUser.entityId}`,
            { ownerId: savedUser.id }
          )
        );
      } catch (error) {
        console.error("Failed to update entity ownerId:", error.message);
        // Don't fail user creation if entity update fails
      }
    }

    // If creating manager, automatically create manager record
    if (savedUser.role === UserRole.MANAGER && savedUser.entityId) {
      const managerServiceUrl = this.configService.get(
        "MANAGER_SERVICE_URL",
        "http://manager-service:3005"
      );
      try {
        // Get default branch if branchId not provided
        let branchId = createUserDto.branchId;
        if (!branchId) {
          const entityServiceUrl = this.configService.get(
            "ENTITY_SERVICE_URL",
            "http://entity-service:3003"
          );
          const branchesResponse = await firstValueFrom(
            this.httpService.get(
              `${entityServiceUrl}/api/v1/entities/${savedUser.entityId}/branches`
            )
          );
          const branches = branchesResponse.data.data;
          if (branches && branches.length > 0) {
            branchId = branches[0].id; // Use first branch (default branch)
          }
        }

        await firstValueFrom(
          this.httpService.post(`${managerServiceUrl}/api/v1/managers`, {
            userId: savedUser.id,
            entityId: savedUser.entityId,
            branchId: branchId,
            position: createUserDto.position || "Manager",
          })
        );
      } catch (error) {
        console.error("Failed to create manager record:", error.message);
        // Don't fail user creation if manager creation fails
      }
    }

    // If creating employee, automatically create employee record
    if (savedUser.role === UserRole.EMPLOYEE && savedUser.entityId) {
      const employeeServiceUrl = this.configService.get(
        "EMPLOYEE_SERVICE_URL",
        "http://employee-service:3006"
      );
      try {
        // Get entity to determine category and default employee type
        const entityServiceUrl = this.configService.get(
          "ENTITY_SERVICE_URL",
          "http://entity-service:3003"
        );
        const entityResponse = await firstValueFrom(
          this.httpService.get(
            `${entityServiceUrl}/api/v1/entities/${savedUser.entityId}`
          )
        );
        const entity = entityResponse.data.data;

        // Get default branch if branchId not provided
        let branchId = createUserDto.branchId;
        if (!branchId) {
          const branchesResponse = await firstValueFrom(
            this.httpService.get(
              `${entityServiceUrl}/api/v1/entities/${savedUser.entityId}/branches`
            )
          );
          const branches = branchesResponse.data.data;
          if (branches && branches.length > 0) {
            branchId = branches[0].id; // Use first branch (default branch)
          }
        }

        if (!branchId) {
          throw new BadRequestException(
            "Branch ID is required for employees. Entity must have at least one branch."
          );
        }

        // Determine employee type
        let employeeType = createUserDto.employeeType;
        if (!employeeType && entity.category) {
          employeeType = EmployeeTypeUtil.getDefaultEmployeeType(
            entity.category as EntityCategory
          );
        } else if (!employeeType) {
          employeeType = EmployeeType.OTHER;
        }

        // Validate employee type for entity category
        if (
          entity.category &&
          !EmployeeTypeUtil.isValidEmployeeTypeForCategory(
            employeeType,
            entity.category as EntityCategory
          )
        ) {
          console.warn(
            `Employee type ${employeeType} may not be appropriate for entity category ${entity.category}`
          );
        }

        await firstValueFrom(
          this.httpService.post(`${employeeServiceUrl}/api/v1/employees`, {
            userId: savedUser.id,
            entityId: savedUser.entityId,
            branchId: branchId,
            position: createUserDto.position || employeeType,
            employeeType: employeeType,
            status: "AVAILABLE",
          })
        );
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        console.error("Failed to create employee record:", error.message);
        // Don't fail user creation if employee creation fails
      }
    }

    // Cache the new user
    await this.cacheService.set(
      `user:${savedUser.id}`,
      savedUser,
      this.CACHE_TTL
    );
    // Invalidate user lists cache
    await this.cacheService.deletePattern("user:list:*");

    return ResponseUtil.success(savedUser, "User created successfully");
  }

  /**
   * Validate user creation based on role hierarchy
   */
  private async validateUserCreation(
    createUserDto: CreateUserDto,
    currentUser?: JwtPayloadWithRole
  ): Promise<void> {
    // Superadmin workflow
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      // Superadmin creating entity owner - must provide entityId, entity may not have owner yet
      if (createUserDto.role === UserRole.ENTITY_OWNER) {
        if (!createUserDto.entityId) {
          throw new BadRequestException(
            "Entity ID is required when creating an entity owner"
          );
        }
        // Verify entity exists
        const entityServiceUrl = this.configService.get(
          "ENTITY_SERVICE_URL",
          "http://entity-service:3003"
        );
        try {
          const entityResponse = await firstValueFrom(
            this.httpService.get(
              `${entityServiceUrl}/api/v1/entities/${createUserDto.entityId}`
            )
          );
          const entity = entityResponse.data.data;
          // Check if entity already has an owner
          if (entity.ownerId) {
            throw new BadRequestException(
              "Entity already has an owner. Cannot assign another owner."
            );
          }
        } catch (error) {
          if (error.response?.status === 404) {
            throw new NotFoundException("Entity not found");
          }
          if (error instanceof BadRequestException) {
            throw error;
          }
          throw error;
        }
        return;
      }

      // Superadmin creating other user types - entity must have an owner
      if (createUserDto.entityId) {
        const entityServiceUrl = this.configService.get(
          "ENTITY_SERVICE_URL",
          "http://entity-service:3003"
        );
        try {
          const entityResponse = await firstValueFrom(
            this.httpService.get(
              `${entityServiceUrl}/api/v1/entities/${createUserDto.entityId}`
            )
          );
          const entity = entityResponse.data.data;
          if (!entity.ownerId) {
            throw new BadRequestException(
              "Cannot create non-owner users for an entity without an owner. Please create an entity owner first."
            );
          }
        } catch (error) {
          if (error.response?.status === 404) {
            throw new NotFoundException("Entity not found");
          }
          if (error instanceof BadRequestException) {
            throw error;
          }
          throw error;
        }
      } else {
        throw new BadRequestException(
          "Entity ID is required when creating users"
        );
      }
      return;
    }

    // Entity owners can create managers and employees for their entity
    if (currentUser.role === UserRole.ENTITY_OWNER) {
      if (
        createUserDto.role !== UserRole.MANAGER &&
        createUserDto.role !== UserRole.EMPLOYEE
      ) {
        throw new ForbiddenException(
          "Entity owners can only create managers and employees"
        );
      }
      if (!currentUser.entityId) {
        throw new ForbiddenException(
          "Entity owner must be associated with an entity"
        );
      }
      return;
    }

    // Managers and employees cannot create users
    throw new ForbiddenException("You do not have permission to create users");
  }

  async findAll(query: QueryUserDto, currentUser?: JwtPayloadWithRole) {
    const { page, limit, role, entityId, search } = query;
    const skip = (page - 1) * limit;

    // Generate cache key based on query parameters and user context
    const cacheKey = `user:list:${page}:${limit}:${role || ""}:${entityId || ""}:${search || ""}:${currentUser?.role || ""}:${currentUser?.entityId || ""}`;
    const cached = await this.cacheService.get<any>(cacheKey);

    if (cached) {
      return ResponseUtil.paginated(cached.users, page, limit, cached.total);
    }

    const queryBuilder = this.userRepository.createQueryBuilder("user");

    // Apply data isolation based on user role
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        // Entity owners can only see users in their entity
        queryBuilder.andWhere("user.entityId = :entityId", {
          entityId: currentUser.entityId,
        });
      } else if (
        currentUser.role === UserRole.MANAGER ||
        currentUser.role === UserRole.EMPLOYEE
      ) {
        // Managers and employees can only see users in their entity
        queryBuilder.andWhere("user.entityId = :entityId", {
          entityId: currentUser.entityId,
        });
      }
      // Superadmin can see all users (no filter)
    }

    if (role) {
      queryBuilder.andWhere("user.role = :role", { role });
    }

    if (entityId) {
      queryBuilder.andWhere("user.entityId = :entityId", { entityId });
    }

    if (search) {
      queryBuilder.andWhere(
        "(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    const [users, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy("user.createdAt", "DESC")
      .getManyAndCount();

    // Cache the result
    await this.cacheService.set(
      cacheKey,
      { users, total },
      this.LIST_CACHE_TTL
    );

    return ResponseUtil.paginated(users, page, limit, total);
  }

  async findOne(id: string) {
    const cacheKey = `user:${id}`;
    let user = await this.cacheService.get<User>(cacheKey);

    if (!user) {
      user = await this.userRepository.findOne({ where: { id } });

      if (!user) {
        throw new NotFoundException("User not found");
      }

      // Cache the user
      await this.cacheService.set(cacheKey, user, this.CACHE_TTL);
    }

    return ResponseUtil.success(user);
  }

  async findByEmail(email: string) {
    const cacheKey = `user:email:${email}`;
    let user = await this.cacheService.get<User>(cacheKey);

    if (!user) {
      user = await this.userRepository.findOne({ where: { email } });

      if (!user) {
        throw new NotFoundException("User not found");
      }

      // Cache by both ID and email
      await this.cacheService.set(`user:${user.id}`, user, this.CACHE_TTL);
      await this.cacheService.set(cacheKey, user, this.CACHE_TTL);
    }

    return ResponseUtil.success(user);
  }

  async findByPhoneNumber(phoneNumber: string) {
    const cacheKey = `user:phone:${phoneNumber}`;
    let user = await this.cacheService.get<User>(cacheKey);

    if (!user) {
      user = await this.userRepository.findOne({ where: { phoneNumber } });

      if (!user) {
        throw new NotFoundException("User not found");
      }

      // Cache by ID and phone
      await this.cacheService.set(`user:${user.id}`, user, this.CACHE_TTL);
      await this.cacheService.set(cacheKey, user, this.CACHE_TTL);
    }

    return ResponseUtil.success(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException("Email already in use");
      }
    }

    if (
      updateUserDto.phoneNumber &&
      updateUserDto.phoneNumber !== user.phoneNumber
    ) {
      const existingUser = await this.userRepository.findOne({
        where: { phoneNumber: updateUserDto.phoneNumber },
      });

      if (existingUser) {
        throw new ConflictException("Phone number already in use");
      }
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepository.save(user);

    // Update cache
    await this.cacheService.set(
      `user:${updatedUser.id}`,
      updatedUser,
      this.CACHE_TTL
    );
    // Invalidate related caches
    await this.cacheService.delete(`user:email:${updatedUser.email}`);
    await this.cacheService.delete(`user:phone:${updatedUser.phoneNumber}`);
    await this.cacheService.deletePattern("user:list:*");

    return ResponseUtil.success(updatedUser, "User updated successfully");
  }

  async remove(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.userRepository.remove(user);

    // Invalidate all user-related caches
    await this.cacheService.delete(`user:${id}`);
    await this.cacheService.delete(`user:email:${user.email}`);
    await this.cacheService.delete(`user:phone:${user.phoneNumber}`);
    await this.cacheService.deletePattern("user:list:*");
    await this.cacheService.invalidateUser(id);

    return ResponseUtil.success(null, "User deleted successfully");
  }

  async updateLastLogin(id: string) {
    await this.userRepository.update(id, { lastLoginAt: new Date() });
    // Invalidate user cache to reflect updated lastLoginAt
    await this.cacheService.delete(`user:${id}`);
  }

  async verifyEmail(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    user.isEmailVerified = true;
    await this.userRepository.save(user);

    // Update cache
    await this.cacheService.set(`user:${user.id}`, user, this.CACHE_TTL);
    await this.cacheService.delete(`user:email:${user.email}`);

    return ResponseUtil.success(null, "Email verified successfully");
  }

  async verifyPhone(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    user.isPhoneVerified = true;
    await this.userRepository.save(user);

    // Update cache
    await this.cacheService.set(`user:${user.id}`, user, this.CACHE_TTL);
    await this.cacheService.delete(`user:phone:${user.phoneNumber}`);

    return ResponseUtil.success(null, "Phone verified successfully");
  }

  async enable2FA(id: string, secret: string) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    user.twoFactorEnabled = true;
    user.twoFactorSecret = secret;
    await this.userRepository.save(user);

    // Invalidate cache
    await this.cacheService.invalidateUser(id);

    return ResponseUtil.success(null, "2FA enabled successfully");
  }

  async disable2FA(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await this.userRepository.save(user);

    // Invalidate cache
    await this.cacheService.invalidateUser(id);

    return ResponseUtil.success(null, "2FA disabled successfully");
  }

  async getUsersByEntity(entityId: string, currentUser?: JwtPayloadWithRole) {
    // Check access permissions
    if (
      currentUser &&
      !QueryFilterUtil.canAccessEntity(currentUser, entityId)
    ) {
      throw new ForbiddenException(
        "Access denied: Cannot access users from another entity"
      );
    }

    const cacheKey = `user:entity:${entityId}`;
    let users = await this.cacheService.get<User[]>(cacheKey);

    if (!users) {
      users = await this.userRepository.find({ where: { entityId } });
      await this.cacheService.set(cacheKey, users, this.LIST_CACHE_TTL);
    }

    return ResponseUtil.success(users);
  }

  async getUsersByRole(role: string) {
    const cacheKey = `user:role:${role}`;
    let users = await this.cacheService.get<User[]>(cacheKey);

    if (!users) {
      users = await this.userRepository.find({ where: { role } as any });
      await this.cacheService.set(cacheKey, users, this.LIST_CACHE_TTL);
    }

    return ResponseUtil.success(users);
  }

  async getStats() {
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({
      where: { isActive: true },
    });
    const verifiedUsers = await this.userRepository.count({
      where: { isEmailVerified: true },
    });

    const usersByRole = await this.userRepository
      .createQueryBuilder("user")
      .select("user.role", "role")
      .addSelect("COUNT(*)", "count")
      .groupBy("user.role")
      .getRawMany();

    return ResponseUtil.success({
      totalUsers,
      activeUsers,
      verifiedUsers,
      usersByRole,
    });
  }
}
