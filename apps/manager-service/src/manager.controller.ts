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
import { ManagerService } from "./manager.service";
import { CreateManagerDto } from "./dto/create-manager.dto";
import { UpdateManagerDto } from "./dto/update-manager.dto";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import {
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

@ApiTags("Managers")
@Controller("managers")
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER)
  @EntityAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new manager" })
  @ApiResponse({ status: 201, description: "Manager created successfully" })
  create(
    @Body() createManagerDto: CreateManagerDto,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.managerService.create(createManagerDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all managers" })
  @ApiQuery({ name: "entityId", required: false })
  @ApiQuery({ name: "branchId", required: false })
  findAll(
    @Query("entityId") entityId?: string,
    @Query("branchId") branchId?: string,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.managerService.findAll(entityId, branchId);
  }

  @Get("stats")
  @UseGuards(JwtAuthGuard, EntityGuard)
  @EntityAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get manager statistics" })
  @ApiQuery({ name: "entityId", required: false })
  getStats(
    @Query("entityId") entityId?: string,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.managerService.getStats(entityId);
  }

  @Get("entity/:entityId")
  @UseGuards(JwtAuthGuard, EntityGuard)
  @EntityAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get managers by entity ID" })
  findByEntity(
    @Param("entityId") entityId: string,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.managerService.findByEntity(entityId);
  }

  @Get("branch/:branchId")
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get managers by branch ID" })
  findByBranch(
    @Param("branchId") branchId: string,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.managerService.findByBranch(branchId);
  }

  @Get("user/:userId")
  @UseGuards(JwtAuthGuard, EntityGuard)
  @EntityAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get manager by user ID" })
  findByUserId(
    @Param("userId") userId: string,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.managerService.findByUserId(userId);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get manager by ID" })
  findOne(@Param("id") id: string, @CurrentUser() currentUser?: JwtPayload) {
    return this.managerService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update manager" })
  update(
    @Param("id") id: string,
    @Body() updateManagerDto: UpdateManagerDto,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.managerService.update(id, updateManagerDto);
  }

  @Patch(":id/metrics")
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update manager metrics" })
  updateMetrics(
    @Param("id") id: string,
    @Body() metrics: any,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.managerService.updateMetrics(id, metrics);
  }

  @Patch(":id/performance-score/:score")
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update manager performance score" })
  updatePerformanceScore(
    @Param("id") id: string,
    @Param("score") score: number,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.managerService.updatePerformanceScore(id, score);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete manager" })
  remove(@Param("id") id: string, @CurrentUser() currentUser?: JwtPayload) {
    return this.managerService.remove(id);
  }
}
