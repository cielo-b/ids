import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@app/common";
import { NotificationService } from "./notification.service";
import { CreateNotificationDto } from "./dto/create-notification.dto";

@ApiTags("Notifications")
@Controller("notifications")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Send a notification" })
  @ApiResponse({ status: 201, description: "Notification sent successfully" })
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.send(createNotificationDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all notifications" })
  @ApiResponse({ status: 200, description: "List of notifications" })
  async findAll(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("userId") userId?: string
  ) {
    return this.notificationService.findAll({ page, limit, userId });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a notification by ID" })
  @ApiResponse({ status: 200, description: "Notification details" })
  async findOne(@Param("id") id: string) {
    return this.notificationService.findOne(id);
  }
}
