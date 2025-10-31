import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Employee } from "./entities/employee.entity";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";
import { ResponseUtil, EmployeeStatus, CacheService } from "@app/common";

@Injectable()
export class EmployeeService {
  private readonly CACHE_TTL = 1800; // 30 minutes
  private readonly LIST_CACHE_TTL = 300; // 5 minutes for lists

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private cacheService: CacheService
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto) {
    const existingEmployee = await this.employeeRepository.findOne({
      where: { userId: createEmployeeDto.userId },
    });

    if (existingEmployee) {
      throw new ConflictException("Employee already exists for this user");
    }

    const employee = this.employeeRepository.create(createEmployeeDto);
    const savedEmployee = await this.employeeRepository.save(employee);

    return ResponseUtil.success(savedEmployee, "Employee created successfully");
  }

  async findAll(entityId?: string, branchId?: string, status?: EmployeeStatus) {
    const queryBuilder = this.employeeRepository.createQueryBuilder("employee");

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

  async findOne(id: string) {
    const employee = await this.employeeRepository.findOne({ where: { id } });

    if (!employee) {
      throw new NotFoundException("Employee not found");
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

  async getAvailableEmployees(entityId: string, branchId?: string) {
    const queryBuilder = this.employeeRepository
      .createQueryBuilder("employee")
      .where("employee.entityId = :entityId", { entityId })
      .andWhere("employee.status = :status", {
        status: EmployeeStatus.AVAILABLE,
      })
      .andWhere("employee.isActive = :isActive", { isActive: true });

    if (branchId) {
      queryBuilder.andWhere("employee.branchId = :branchId", { branchId });
    }

    const employees = await queryBuilder
      .orderBy("employee.activeOrders", "ASC")
      .getMany();

    return ResponseUtil.success(employees);
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    const employee = await this.employeeRepository.findOne({ where: { id } });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    Object.assign(employee, updateEmployeeDto);
    const updatedEmployee = await this.employeeRepository.save(employee);

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

  async remove(id: string) {
    const employee = await this.employeeRepository.findOne({ where: { id } });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    await this.employeeRepository.remove(employee);

    return ResponseUtil.success(null, "Employee deleted successfully");
  }

  async getStats(entityId?: string) {
    const queryBuilder = this.employeeRepository.createQueryBuilder("employee");

    if (entityId) {
      queryBuilder.where("employee.entityId = :entityId", { entityId });
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

    const topPerformers = await this.employeeRepository.find({
      where: entityId ? { entityId } : {},
      order: { totalRevenue: "DESC" },
      take: 10,
    });

    return ResponseUtil.success({
      totalEmployees,
      availableEmployees,
      busyEmployees,
      topPerformers,
    });
  }
}
