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
import { ReceiptService } from "./receipt.service";
import { CreateReceiptDto } from "./dto/create-receipt.dto";
import { UpdateReceiptDto } from "./dto/update-receipt.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";

@ApiTags("Receipts")
@Controller("receipts")
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Post()
  @ApiOperation({ summary: "Create a new receipt" })
  @ApiResponse({ status: 201, description: "Receipt created successfully" })
  create(@Body() createReceiptDto: CreateReceiptDto) {
    return this.receiptService.create(createReceiptDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all receipts" })
  @ApiQuery({ name: "entityId", required: false })
  @ApiQuery({ name: "customerId", required: false })
  @ApiQuery({ name: "startDate", required: false, type: Date })
  @ApiQuery({ name: "endDate", required: false, type: Date })
  findAll(
    @Query("entityId") entityId?: string,
    @Query("customerId") customerId?: string,
    @Query("startDate") startDate?: Date,
    @Query("endDate") endDate?: Date
  ) {
    return this.receiptService.findAll(
      entityId,
      customerId,
      startDate,
      endDate
    );
  }

  @Get("stats")
  @ApiOperation({ summary: "Get receipt statistics" })
  @ApiQuery({ name: "entityId", required: false })
  getStats(@Query("entityId") entityId?: string) {
    return this.receiptService.getStats(entityId);
  }

  @Get("order/:orderId")
  @ApiOperation({ summary: "Get receipt by order ID" })
  findByOrderId(@Param("orderId") orderId: string) {
    return this.receiptService.findByOrderId(orderId);
  }

  @Get("payment/:paymentId")
  @ApiOperation({ summary: "Get receipt by payment ID" })
  findByPaymentId(@Param("paymentId") paymentId: string) {
    return this.receiptService.findByPaymentId(paymentId);
  }

  @Get("customer/:customerId")
  @ApiOperation({ summary: "Get receipts by customer ID" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  findByCustomerId(
    @Param("customerId") customerId: string,
    @Query("limit") limit?: number
  ) {
    return this.receiptService.findByCustomerId(customerId, limit);
  }

  @Get("number/:receiptNumber")
  @ApiOperation({ summary: "Get receipt by receipt number" })
  findByReceiptNumber(@Param("receiptNumber") receiptNumber: string) {
    return this.receiptService.findByReceiptNumber(receiptNumber);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get receipt by ID" })
  findOne(@Param("id") id: string) {
    return this.receiptService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update receipt" })
  update(@Param("id") id: string, @Body() updateReceiptDto: UpdateReceiptDto) {
    return this.receiptService.update(id, updateReceiptDto);
  }

  @Patch(":id/refund")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark receipt as refunded" })
  @ApiQuery({ name: "refundReceiptId", required: false })
  markAsRefunded(
    @Param("id") id: string,
    @Query("refundReceiptId") refundReceiptId?: string
  ) {
    return this.receiptService.markAsRefunded(id, refundReceiptId);
  }

  @Patch(":id/regenerate-qr")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Regenerate QR code for receipt" })
  regenerateQRCode(@Param("id") id: string) {
    return this.receiptService.regenerateQRCode(id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete receipt" })
  remove(@Param("id") id: string) {
    return this.receiptService.remove(id);
  }
}
