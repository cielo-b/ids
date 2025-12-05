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
import { ReceiptService } from "./receipt.service";
import { CreateReceiptDto } from "./dto/create-receipt.dto";
import { UpdateReceiptDto } from "./dto/update-receipt.dto";
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

@ApiTags("Receipts")
@Controller("receipts")
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Post()
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
  @ApiOperation({ summary: "Create a new receipt" })
  @ApiResponse({ status: 201, description: "Receipt created successfully" })
  create(
    @Body() createReceiptDto: CreateReceiptDto,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.receiptService.create(createReceiptDto, currentUser);
  }

  @Get()
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all receipts" })
  @ApiQuery({ name: "entityId", required: false })
  @ApiQuery({ name: "branchId", required: false })
  @ApiQuery({ name: "handledById", required: false })
  @ApiQuery({ name: "startDate", required: false, type: Date })
  @ApiQuery({ name: "endDate", required: false, type: Date })
  findAll(
    @Query("entityId") entityId?: string,
    @Query("branchId") branchId?: string,
    @Query("handledById") handledById?: string,
    @Query("startDate") startDate?: Date,
    @Query("endDate") endDate?: Date,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.receiptService.findAll(
      entityId,
      branchId,
      handledById,
      startDate,
      endDate,
      currentUser
    );
  }

  @Get("stats")
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get receipt statistics" })
  @ApiQuery({ name: "entityId", required: false })
  getStats(
    @Query("entityId") entityId?: string,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.receiptService.getStats(entityId, currentUser);
  }

  @Get("order/:orderId")
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get receipt by order ID" })
  findByOrderId(
    @Param("orderId") orderId: string,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.receiptService.findByOrderId(orderId, currentUser);
  }

  @Get("customer/:customerName")
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get receipts by customer name" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  findByCustomerName(
    @Param("customerName") customerName: string,
    @Query("limit") limit?: number,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.receiptService.findByCustomerName(
      customerName,
      limit,
      currentUser
    );
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get receipt by ID" })
  findOne(@Param("id") id: string, @CurrentUser() currentUser?: JwtPayload) {
    return this.receiptService.findOne(id, currentUser);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update receipt" })
  update(
    @Param("id") id: string,
    @Body() updateReceiptDto: UpdateReceiptDto,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.receiptService.update(id, updateReceiptDto, currentUser);
  }

  @Patch(":id/refund")
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @EntityAccess()
  @BranchAccess()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mark receipt as refunded" })
  @ApiQuery({ name: "refundReceiptId", required: false })
  markAsRefunded(
    @Param("id") id: string,
    @Query("refundReceiptId") refundReceiptId?: string,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.receiptService.markAsRefunded(id, refundReceiptId, currentUser);
  }

  @Patch(":id/regenerate-qr")
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Regenerate QR code for receipt" })
  regenerateQRCode(
    @Param("id") id: string,
    @CurrentUser() currentUser?: JwtPayload
  ) {
    return this.receiptService.regenerateQRCode(id, currentUser);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER)
  @EntityAccess()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Void receipt" })
  remove(@Param("id") id: string, @CurrentUser() currentUser?: JwtPayload) {
    return this.receiptService.remove(id, currentUser);
  }
}
