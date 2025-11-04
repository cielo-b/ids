import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ReportService } from "./report.service";
import { DateRangeDto } from "./dto/date-range.dto";

@ApiTags("Reports")
@Controller("reports")
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get("sales")
  @ApiOperation({ summary: "Get sales summary over a date range" })
  @ApiQuery({ name: "startDate", required: true })
  @ApiQuery({ name: "endDate", required: true })
  @ApiQuery({ name: "entityId", required: false })
  @ApiQuery({ name: "branchId", required: false })
  async sales(@Query() params: DateRangeDto) {
    return this.reportService.getSalesSummary(params);
  }

  @Get("items/top")
  @ApiOperation({ summary: "Get top-selling items over a date range" })
  @ApiQuery({ name: "startDate", required: true })
  @ApiQuery({ name: "endDate", required: true })
  @ApiQuery({ name: "entityId", required: false })
  async topItems(@Query() params: DateRangeDto) {
    return this.reportService.getTopItems(params);
  }

  @Get("employees/performance")
  @ApiOperation({ summary: "Get top employee performance metrics" })
  @ApiQuery({ name: "entityId", required: false })
  async employeePerformance(@Query() params: DateRangeDto) {
    return this.reportService.getEmployeePerformance(params);
  }
}
