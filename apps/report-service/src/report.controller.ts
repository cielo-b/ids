import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ReportService } from "./report.service";
import { DateRangeDto } from "./dto/date-range.dto";
import {
  JwtAuthGuard,
  EntityGuard,
  BranchGuard,
  EntityAccess,
  BranchAccess,
  CurrentUser,
  JwtPayload,
} from "@app/common";

@ApiTags("Reports")
@Controller("reports")
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get("sales")
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get sales summary over a date range" })
  @ApiQuery({ name: "startDate", required: true })
  @ApiQuery({ name: "endDate", required: true })
  @ApiQuery({ name: "entityId", required: false })
  @ApiQuery({ name: "branchId", required: false })
  async sales(
    @Query() params: DateRangeDto,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.reportService.getSalesSummary(params);
  }

  @Get("items/top")
  @UseGuards(JwtAuthGuard, EntityGuard)
  @EntityAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get top-selling items over a date range" })
  @ApiQuery({ name: "startDate", required: true })
  @ApiQuery({ name: "endDate", required: true })
  @ApiQuery({ name: "entityId", required: false })
  async topItems(
    @Query() params: DateRangeDto,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.reportService.getTopItems(params);
  }

  @Get("employees/performance")
  @UseGuards(JwtAuthGuard, EntityGuard)
  @EntityAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get top employee performance metrics" })
  @ApiQuery({ name: "entityId", required: false })
  async employeePerformance(
    @Query() params: DateRangeDto,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.reportService.getEmployeePerformance(params);
  }
}
