import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { EmployeeService } from "./employee.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import {
  EmployeeStatus,
  JwtAuthGuard,
  RolesGuard,
  Roles,
  UserRole,
  EntityGuard,
  BranchGuard,
  EntityAccess,
  BranchAccess,
  CurrentUser,
  JwtPayload,
} from "@app/common";

@ApiTags("Employees")
@Controller("employees")
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER)
  @EntityAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new employee" })
  @ApiResponse({ status: 201, description: "Employee created successfully" })
  create(
    @Body() createEmployeeDto: CreateEmployeeDto,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.employeeService.create(createEmployeeDto, currentUser);
  }

  @Get()
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all employees" })
  @ApiQuery({ name: "entityId", required: false })
  @ApiQuery({ name: "branchId", required: false })
  @ApiQuery({ name: "status", required: false, enum: EmployeeStatus })
  findAll(
    @Query("entityId") entityId?: string,
    @Query("branchId") branchId?: string,
    @Query("status") status?: EmployeeStatus,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.employeeService.findAll(
      entityId,
      branchId,
      status,
      currentUser
    );
  }

  @Get("available/:entityId")
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get available employees" })
  @ApiQuery({ name: "branchId", required: false })
  getAvailable(
    @Param("entityId") entityId: string,
    @Query("branchId") branchId?: string,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.employeeService.getAvailableEmployees(
      entityId,
      branchId,
      currentUser
    );
  }

  @Get("stats")
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get employee statistics" })
  @ApiQuery({ name: "entityId", required: false })
  getStats(
    @Query("entityId") entityId?: string,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.employeeService.getStats(entityId, currentUser);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get employee by ID" })
  findOne(@Param("id") id: string, @CurrentUser() currentUser?: JwtPayload) {
    return this.employeeService.findOne(id, currentUser);
  }

  @Get("user/:userId")
  @UseGuards(JwtAuthGuard, EntityGuard)
  @EntityAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get employee by user ID" })
  findByUserId(
    @Param("userId") userId: string,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.employeeService.findByUserId(userId);
  }

  @Get(":id/performance")
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get employee performance metrics" })
  getPerformance(
    @Param("id") id: string,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.employeeService.getPerformance(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update employee" })
  update(
    @Param("id") id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.employeeService.update(id, updateEmployeeDto, currentUser);
  }

  @Patch(":id/status")
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ENTITY_OWNER,
    UserRole.MANAGER,
    UserRole.EMPLOYEE
  )
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update employee status" })
  updateStatus(
    @Param("id") id: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.employeeService.updateStatus(id, updateStatusDto);
  }

  @Patch(":id/increment-orders")
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Increment active orders count" })
  incrementActiveOrders(
    @Param("id") id: string,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.employeeService.incrementActiveOrders(id);
  }

  @Patch(":id/decrement-orders")
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Decrement active orders count" })
  decrementActiveOrders(
    @Param("id") id: string,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.employeeService.decrementActiveOrders(id);
  }

  @Patch(":id/revenue/:amount")
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update employee revenue" })
  updateRevenue(
    @Param("id") id: string,
    @Param("amount") amount: number,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.employeeService.updateRevenue(id, amount);
  }

  @Patch(":id/tip/:amount")
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Add tip to employee" })
  addTip(
    @Param("id") id: string,
    @Param("amount") amount: number,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.employeeService.addTip(id, amount);
  }

  @Patch(":id/rating/:rating")
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update employee rating" })
  updateRating(
    @Param("id") id: string,
    @Param("rating") rating: number,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.employeeService.updateRating(id, rating);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER)
  @EntityAccess()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete employee" })
  remove(@Param("id") id: string, @CurrentUser() currentUser?: JwtPayload) {
    return this.employeeService.remove(id, currentUser);
  }
}
