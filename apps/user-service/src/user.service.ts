import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike } from "typeorm";
import { User } from "./entities/user.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { QueryUserDto } from "./dto/query-user.dto";
import { ResponseUtil, CacheService } from "@app/common";

@Injectable()
export class UserService {
  private readonly CACHE_TTL = 1800; // 30 minutes
  private readonly LIST_CACHE_TTL = 300; // 5 minutes for lists

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private cacheService: CacheService
  ) {}

  async create(createUserDto: CreateUserDto) {
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

    const user = this.userRepository.create(createUserDto);
    const savedUser = await this.userRepository.save(user);

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

  async findAll(query: QueryUserDto) {
    const { page, limit, role, entityId, search } = query;
    const skip = (page - 1) * limit;

    // Generate cache key based on query parameters
    const cacheKey = `user:list:${page}:${limit}:${role || ""}:${entityId || ""}:${search || ""}`;
    const cached = await this.cacheService.get<any>(cacheKey);

    if (cached) {
      return ResponseUtil.paginated(cached.users, page, limit, cached.total);
    }

    const queryBuilder = this.userRepository.createQueryBuilder("user");

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

  async getUsersByEntity(entityId: string) {
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
