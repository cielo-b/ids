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
} from "@nestjs/common";
import { ManagerService } from "./manager.service";
import { CreateManagerDto } from "./dto/create-manager.dto";
import { UpdateManagerDto } from "./dto/update-manager.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";

@ApiTags("Managers")
@Controller("managers")
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @Post()
  @ApiOperation({ summary: "Create a new manager" })
  @ApiResponse({ status: 201, description: "Manager created successfully" })
  create(@Body() createManagerDto: CreateManagerDto) {
    return this.managerService.create(createManagerDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all managers" })
  @ApiQuery({ name: "entityId", required: false })
  @ApiQuery({ name: "branchId", required: false })
  findAll(
    @Query("entityId") entityId?: string,
    @Query("branchId") branchId?: string
  ) {
    return this.managerService.findAll(entityId, branchId);
  }

  @Get("stats")
  @ApiOperation({ summary: "Get manager statistics" })
  @ApiQuery({ name: "entityId", required: false })
  getStats(@Query("entityId") entityId?: string) {
    return this.managerService.getStats(entityId);
  }

  @Get("entity/:entityId")
  @ApiOperation({ summary: "Get managers by entity ID" })
  findByEntity(@Param("entityId") entityId: string) {
    return this.managerService.findByEntity(entityId);
  }

  @Get("branch/:branchId")
  @ApiOperation({ summary: "Get managers by branch ID" })
  findByBranch(@Param("branchId") branchId: string) {
    return this.managerService.findByBranch(branchId);
  }

  @Get("user/:userId")
  @ApiOperation({ summary: "Get manager by user ID" })
  findByUserId(@Param("userId") userId: string) {
    return this.managerService.findByUserId(userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get manager by ID" })
  findOne(@Param("id") id: string) {
    return this.managerService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update manager" })
  update(@Param("id") id: string, @Body() updateManagerDto: UpdateManagerDto) {
    return this.managerService.update(id, updateManagerDto);
  }

  @Patch(":id/metrics")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update manager metrics" })
  updateMetrics(@Param("id") id: string, @Body() metrics: any) {
    return this.managerService.updateMetrics(id, metrics);
  }

  @Patch(":id/performance-score/:score")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update manager performance score" })
  updatePerformanceScore(
    @Param("id") id: string,
    @Param("score") score: number
  ) {
    return this.managerService.updatePerformanceScore(id, score);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete manager" })
  remove(@Param("id") id: string) {
    return this.managerService.remove(id);
  }
}
