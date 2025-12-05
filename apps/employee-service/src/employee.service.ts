import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Employee } from "./entities/employee.entity";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";
import {
  ResponseUtil,
  EmployeeStatus,
  CacheService,
  UserRole,
  JwtPayload,
  JwtPayloadWithRole,
  QueryFilterUtil,
} from "@app/common";

@Injectable()
export class EmployeeService {
  private readonly CACHE_TTL = 1800; // 30 minutes
  private readonly LIST_CACHE_TTL = 300; // 5 minutes for lists

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private cacheService: CacheService
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto, currentUser?: JwtPayloadWithRole) {
    // Check access permissions - only entity owners and superadmin can create employees
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        if (createEmployeeDto.entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            "Access denied: Cannot create employees for other entities"
          );
        }
      } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          "Access denied: Only entity owners and superadmin can create employees"
        );
      }
    }

    const existingEmployee = await this.employeeRepository.findOne({
      where: { userId: createEmployeeDto.userId },
    });

    if (existingEmployee) {
      throw new ConflictException("Employee already exists for this user");
    }

    const employee = this.employeeRepository.create(createEmployeeDto);
    const savedEmployee = await this.employeeRepository.save(employee);

    // Invalidate cache
    await this.cacheService.deletePattern("employee:list:*");

    return ResponseUtil.success(savedEmployee, "Employee created successfully");
  }

  async findAll(
    entityId?: string,
    branchId?: string,
    status?: EmployeeStatus,
    currentUser?: JwtPayloadWithRole
  ) {
    const queryBuilder = this.employeeRepository.createQueryBuilder("employee");

    // Apply data isolation
    if (currentUser) {
      QueryFilterUtil.applyEntityFilter(
        queryBuilder,
        currentUser,
        "employee.entityId"
      );

      // Managers can only see employees in their branch
      if (currentUser.role === UserRole.MANAGER) {
        QueryFilterUtil.applyBranchFilter(
          queryBuilder,
          currentUser,
          "employee.branchId"
        );
      }
    }

    if (entityId) {
      queryBuilder.andWhere("employee.entityId = :entityId", { entityId });
    }

    if (branchId) {
      queryBuilder.andWhere("employee.branchId = :branchId", { branchId });
    }

    if (status) {
      queryBuilder.andWhere("employee.status = :status", { status });
    }

    queryBuilder.orderBy("employee.createdAt", "DESC");

    const employees = await queryBuilder.getMany();

    return ResponseUtil.success(employees);
  }

  async findOne(id: string, currentUser?: JwtPayloadWithRole) {
    const employee = await this.employeeRepository.findOne({ where: { id } });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    // Check access permissions
    if (currentUser) {
      if (!QueryFilterUtil.canAccessEntity(currentUser, employee.entityId)) {
        throw new ForbiddenException(
          "Access denied: Cannot access employee from another entity"
        );
      }

      // Managers can only access employees in their branch
      if (currentUser.role === UserRole.MANAGER) {
        if (
          !QueryFilterUtil.canAccessBranch(
            currentUser,
            employee.branchId || "",
            employee.entityId
          )
        ) {
          throw new ForbiddenException(
            "Access denied: Cannot access employee from another branch"
          );
        }
      }
    }

    return ResponseUtil.success(employee);
  }

  async findByUserId(userId: string) {
    const employee = await this.employeeRepository.findOne({
      where: { userId },
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    return ResponseUtil.success(employee);
  }

  async getAvailableEmployees(
    entityId: string,
    branchId?: string,
    currentUser?: JwtPayloadWithRole
  ) {
    // Check access permissions
    if (
      currentUser &&
      !QueryFilterUtil.canAccessEntity(currentUser, entityId)
    ) {
      throw new ForbiddenException(
        "Access denied: Cannot access employees from another entity"
      );
    }

    const queryBuilder = this.employeeRepository
      .createQueryBuilder("employee")
      .where("employee.entityId = :entityId", { entityId })
      .andWhere("employee.status = :status", {
        status: EmployeeStatus.AVAILABLE,
      })
      .andWhere("employee.isActive = :isActive", { isActive: true });

    // Apply branch filter for managers
    if (currentUser && currentUser.role === UserRole.MANAGER) {
      QueryFilterUtil.applyBranchFilter(
        queryBuilder,
        currentUser,
        "employee.branchId"
      );
    }

    if (branchId) {
      queryBuilder.andWhere("employee.branchId = :branchId", { branchId });
    }

    const employees = await queryBuilder
      .orderBy("employee.activeOrders", "ASC")
      .getMany();

    return ResponseUtil.success(employees);
  }

  async update(
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
    currentUser?: JwtPayloadWithRole
  ) {
    const employee = await this.employeeRepository.findOne({ where: { id } });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    // Check access permissions
    if (currentUser) {
      if (!QueryFilterUtil.canAccessEntity(currentUser, employee.entityId)) {
        throw new ForbiddenException(
          "Access denied: Cannot update employee from another entity"
        );
      }

      // Managers can only update employees in their branch
      if (currentUser.role === UserRole.MANAGER) {
        if (
          !QueryFilterUtil.canAccessBranch(
            currentUser,
            employee.branchId || "",
            employee.entityId
          )
        ) {
          throw new ForbiddenException(
            "Access denied: Cannot update employee from another branch"
          );
        }
      } else if (currentUser.role === UserRole.EMPLOYEE) {
        throw new ForbiddenException(
          "Access denied: Employees cannot update other employees"
        );
      }
    }

    Object.assign(employee, updateEmployeeDto);
    const updatedEmployee = await this.employeeRepository.save(employee);

    // Invalidate cache
    await this.cacheService.deletePattern("employee:list:*");

    return ResponseUtil.success(
      updatedEmployee,
      "Employee updated successfully"
    );
  }

  async updateStatus(id: string, updateStatusDto: UpdateStatusDto) {
    const employee = await this.employeeRepository.findOne({ where: { id } });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    employee.status = updateStatusDto.status;
    employee.lastActiveAt = new Date();

    const updatedEmployee = await this.employeeRepository.save(employee);

    return ResponseUtil.success(updatedEmployee, "Status updated successfully");
  }

  async incrementActiveOrders(id: string) {
    await this.employeeRepository.increment({ id }, "activeOrders", 1);
    await this.employeeRepository.update(id, { lastActiveAt: new Date() });

    return ResponseUtil.success(null, "Active orders incremented");
  }

  async decrementActiveOrders(id: string) {
    await this.employeeRepository.decrement({ id }, "activeOrders", 1);

    return ResponseUtil.success(null, "Active orders decremented");
  }

  async updateRevenue(id: string, amount: number) {
    const employee = await this.employeeRepository.findOne({ where: { id } });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    employee.totalRevenue =
      parseFloat(employee.totalRevenue.toString()) + amount;
    employee.totalOrders += 1;

    await this.employeeRepository.save(employee);

    return ResponseUtil.success(null, "Revenue updated successfully");
  }

  async addTip(id: string, tipAmount: number) {
    const employee = await this.employeeRepository.findOne({ where: { id } });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    employee.totalTips = parseFloat(employee.totalTips.toString()) + tipAmount;

    await this.employeeRepository.save(employee);

    return ResponseUtil.success(null, "Tip added successfully");
  }

  async updateRating(id: string, rating: number) {
    const employee = await this.employeeRepository.findOne({ where: { id } });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    const totalRatings = employee.totalRatings + 1;
    const currentAverage = parseFloat(employee.averageRating.toString());
    const newAverage =
      (currentAverage * employee.totalRatings + rating) / totalRatings;

    employee.averageRating = newAverage;
    employee.totalRatings = totalRatings;

    await this.employeeRepository.save(employee);

    return ResponseUtil.success(null, "Rating updated successfully");
  }

  async getPerformance(id: string) {
    const employee = await this.employeeRepository.findOne({ where: { id } });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    const performance = {
      totalOrders: employee.totalOrders,
      totalRevenue: employee.totalRevenue,
      totalTips: employee.totalTips,
      averageRating: employee.averageRating,
      totalRatings: employee.totalRatings,
      activeOrders: employee.activeOrders,
      performanceMetrics: employee.performanceMetrics,
    };

    return ResponseUtil.success(performance);
  }

  async getDailySummary(employeeId: string, date: Date) {
    // In a real implementation, you'd query from order/payment services
    // This is a simplified version
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    const summary = {
      date,
      totalOrders: 0, // Would be fetched from order service
      totalRevenue: 0, // Would be fetched from payment service
      totalTips: 0, // Would be fetched from payment service
      averageOrderTime: 0,
    };

    return ResponseUtil.success(summary);
  }

  async remove(id: string, currentUser?: JwtPayloadWithRole) {
    const employee = await this.employeeRepository.findOne({ where: { id } });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    // Check access permissions - only entity owners and superadmin can delete
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        if (employee.entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            "Access denied: Cannot delete employee from another entity"
          );
        }
      } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          "Access denied: Only entity owners and superadmin can delete employees"
        );
      }
    }

    await this.employeeRepository.remove(employee);

    // Invalidate cache
    await this.cacheService.deletePattern("employee:list:*");

    return ResponseUtil.success(null, "Employee deleted successfully");
  }

  async getStats(entityId?: string, currentUser?: JwtPayloadWithRole) {
    const queryBuilder = this.employeeRepository.createQueryBuilder("employee");

    // Apply data isolation
    if (currentUser) {
      QueryFilterUtil.applyEntityFilter(
        queryBuilder,
        currentUser,
        "employee.entityId"
      );

      // Managers can only see stats for their branch
      if (currentUser.role === UserRole.MANAGER) {
        QueryFilterUtil.applyBranchFilter(
          queryBuilder,
          currentUser,
          "employee.branchId"
        );
      }
    }

    if (entityId) {
      queryBuilder.andWhere("employee.entityId = :entityId", { entityId });
    }

    const totalEmployees = await queryBuilder.getCount();

    const availableEmployees = await queryBuilder
      .clone()
      .andWhere("employee.status = :status", {
        status: EmployeeStatus.AVAILABLE,
      })
      .getCount();

    const busyEmployees = await queryBuilder
      .clone()
      .andWhere("employee.status = :status", { status: EmployeeStatus.BUSY })
      .getCount();

    // Get top performers with same filters
    const topPerformersQuery =
      this.employeeRepository.createQueryBuilder("employee");
    if (currentUser) {
      QueryFilterUtil.applyEntityFilter(
        topPerformersQuery,
        currentUser,
        "employee.entityId"
      );
      if (currentUser.role === UserRole.MANAGER) {
        QueryFilterUtil.applyBranchFilter(
          topPerformersQuery,
          currentUser,
          "employee.branchId"
        );
      }
    }
    if (entityId) {
      topPerformersQuery.andWhere("employee.entityId = :entityId", {
        entityId,
      });
    }
    const topPerformers = await topPerformersQuery
      .orderBy("employee.totalRevenue", "DESC")
      .take(10)
      .getMany();

    return ResponseUtil.success({
      totalEmployees,
      availableEmployees,
      busyEmployees,
      topPerformers,
    });
  }
}
