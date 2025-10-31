import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Receipt } from "./entities/receipt.entity";
import { CreateReceiptDto } from "./dto/create-receipt.dto";
import { UpdateReceiptDto } from "./dto/update-receipt.dto";
import { ResponseUtil, CacheService, QRCodeUtil } from "@app/common";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class ReceiptService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly LIST_CACHE_TTL = 600; // 10 minutes for lists

  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
    private cacheService: CacheService
  ) {}

  async create(createReceiptDto: CreateReceiptDto) {
    // Check if receipt already exists for this order
    const existingReceipt = await this.receiptRepository.findOne({
      where: { orderId: createReceiptDto.orderId },
    });

    if (existingReceipt) {
      throw new ConflictException("Receipt already exists for this order");
    }

    // Generate receipt number
    const receiptNumber = `REC-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Generate QR code if not provided
    let qrCode = createReceiptDto.qrCode;
    if (!qrCode) {
      const qrData = {
        receiptNumber,
        orderId: createReceiptDto.orderId,
        paymentId: createReceiptDto.paymentId,
        total: createReceiptDto.total,
        createdAt: new Date(),
      };
      qrCode = await QRCodeUtil.generate(JSON.stringify(qrData));
    }

    const receipt = this.receiptRepository.create({
      ...createReceiptDto,
      receiptNumber,
      qrCode,
    });

    const savedReceipt = await this.receiptRepository.save(receipt);

    // Cache the new receipt
    await this.cacheService.set(
      `receipt:${savedReceipt.id}`,
      savedReceipt,
      this.CACHE_TTL
    );
    // Invalidate related caches
    await this.cacheService.delete(`receipt:order:${createReceiptDto.orderId}`);
    await this.cacheService.deletePattern("receipt:list:*");

    return ResponseUtil.success(savedReceipt, "Receipt created successfully");
  }

  async findAll(
    entityId?: string,
    customerId?: string,
    startDate?: Date,
    endDate?: Date
  ) {
    // Generate cache key
    const cacheKey = `receipt:list:${entityId || ""}:${customerId || ""}:${startDate || ""}:${endDate || ""}`;
    let receipts = await this.cacheService.get<Receipt[]>(cacheKey);

    if (!receipts) {
      const queryBuilder = this.receiptRepository.createQueryBuilder("receipt");

      if (entityId) {
        queryBuilder.andWhere("receipt.entityId = :entityId", { entityId });
      }

      if (customerId) {
        queryBuilder.andWhere("receipt.customerId = :customerId", {
          customerId,
        });
      }

      if (startDate) {
        queryBuilder.andWhere("receipt.createdAt >= :startDate", {
          startDate,
        });
      }

      if (endDate) {
        queryBuilder.andWhere("receipt.createdAt <= :endDate", { endDate });
      }

      receipts = await queryBuilder
        .orderBy("receipt.createdAt", "DESC")
        .getMany();

      await this.cacheService.set(cacheKey, receipts, this.LIST_CACHE_TTL);
    }

    return ResponseUtil.success(receipts);
  }

  async findOne(id: string) {
    const cacheKey = `receipt:${id}`;
    let receipt = await this.cacheService.get<Receipt>(cacheKey);

    if (!receipt) {
      receipt = await this.receiptRepository.findOne({ where: { id } });

      if (!receipt) {
        throw new NotFoundException("Receipt not found");
      }

      await this.cacheService.set(cacheKey, receipt, this.CACHE_TTL);
    }

    return ResponseUtil.success(receipt);
  }

  async findByOrderId(orderId: string) {
    const cacheKey = `receipt:order:${orderId}`;
    let receipt = await this.cacheService.get<Receipt>(cacheKey);

    if (!receipt) {
      receipt = await this.receiptRepository.findOne({
        where: { orderId },
      });

      if (!receipt) {
        throw new NotFoundException("Receipt not found");
      }

      await this.cacheService.set(
        `receipt:${receipt.id}`,
        receipt,
        this.CACHE_TTL
      );
      await this.cacheService.set(cacheKey, receipt, this.CACHE_TTL);
    }

    return ResponseUtil.success(receipt);
  }

  async findByPaymentId(paymentId: string) {
    const cacheKey = `receipt:payment:${paymentId}`;
    let receipt = await this.cacheService.get<Receipt>(cacheKey);

    if (!receipt) {
      receipt = await this.receiptRepository.findOne({
        where: { paymentId },
      });

      if (!receipt) {
        throw new NotFoundException("Receipt not found");
      }

      await this.cacheService.set(
        `receipt:${receipt.id}`,
        receipt,
        this.CACHE_TTL
      );
      await this.cacheService.set(cacheKey, receipt, this.CACHE_TTL);
    }

    return ResponseUtil.success(receipt);
  }

  async findByCustomerId(customerId: string, limit: number = 50) {
    const cacheKey = `receipt:customer:${customerId}:${limit}`;
    let receipts = await this.cacheService.get<Receipt[]>(cacheKey);

    if (!receipts) {
      receipts = await this.receiptRepository.find({
        where: { customerId },
        order: { createdAt: "DESC" },
        take: limit,
      });

      await this.cacheService.set(cacheKey, receipts, this.LIST_CACHE_TTL);
    }

    return ResponseUtil.success(receipts);
  }

  async findByReceiptNumber(receiptNumber: string) {
    const cacheKey = `receipt:number:${receiptNumber}`;
    let receipt = await this.cacheService.get<Receipt>(cacheKey);

    if (!receipt) {
      receipt = await this.receiptRepository.findOne({
        where: { receiptNumber },
      });

      if (!receipt) {
        throw new NotFoundException("Receipt not found");
      }

      await this.cacheService.set(
        `receipt:${receipt.id}`,
        receipt,
        this.CACHE_TTL
      );
      await this.cacheService.set(cacheKey, receipt, this.CACHE_TTL);
    }

    return ResponseUtil.success(receipt);
  }

  async update(id: string, updateReceiptDto: UpdateReceiptDto) {
    const receipt = await this.receiptRepository.findOne({ where: { id } });

    if (!receipt) {
      throw new NotFoundException("Receipt not found");
    }

    Object.assign(receipt, updateReceiptDto);
    const updatedReceipt = await this.receiptRepository.save(receipt);

    // Update cache
    await this.cacheService.set(
      `receipt:${updatedReceipt.id}`,
      updatedReceipt,
      this.CACHE_TTL
    );
    // Invalidate related caches
    await this.cacheService.delete(`receipt:order:${updatedReceipt.orderId}`);
    await this.cacheService.delete(
      `receipt:payment:${updatedReceipt.paymentId}`
    );
    await this.cacheService.delete(
      `receipt:number:${updatedReceipt.receiptNumber}`
    );
    await this.cacheService.deletePattern("receipt:list:*");

    return ResponseUtil.success(updatedReceipt, "Receipt updated successfully");
  }

  async markAsRefunded(id: string, refundReceiptId?: string) {
    const receipt = await this.receiptRepository.findOne({ where: { id } });

    if (!receipt) {
      throw new NotFoundException("Receipt not found");
    }

    receipt.isRefunded = true;
    if (refundReceiptId) {
      receipt.refundReceiptId = refundReceiptId;
    }

    const updatedReceipt = await this.receiptRepository.save(receipt);

    // Update cache
    await this.cacheService.set(
      `receipt:${updatedReceipt.id}`,
      updatedReceipt,
      this.CACHE_TTL
    );
    await this.cacheService.delete(`receipt:order:${updatedReceipt.orderId}`);
    await this.cacheService.deletePattern("receipt:list:*");

    return ResponseUtil.success(updatedReceipt, "Receipt marked as refunded");
  }

  async regenerateQRCode(id: string) {
    const receipt = await this.receiptRepository.findOne({ where: { id } });

    if (!receipt) {
      throw new NotFoundException("Receipt not found");
    }

    const qrData = {
      receiptNumber: receipt.receiptNumber,
      orderId: receipt.orderId,
      paymentId: receipt.paymentId,
      total: receipt.total,
      createdAt: receipt.createdAt,
    };

    const qrCode = await QRCodeUtil.generate(JSON.stringify(qrData));
    receipt.qrCode = qrCode;

    const updatedReceipt = await this.receiptRepository.save(receipt);

    // Update cache
    await this.cacheService.set(
      `receipt:${updatedReceipt.id}`,
      updatedReceipt,
      this.CACHE_TTL
    );

    return ResponseUtil.success(
      updatedReceipt,
      "QR code regenerated successfully"
    );
  }

  async getStats(entityId?: string) {
    const cacheKey = `receipt:stats:${entityId || "all"}`;
    let stats = await this.cacheService.get<any>(cacheKey);

    if (!stats) {
      const queryBuilder = this.receiptRepository.createQueryBuilder("receipt");

      if (entityId) {
        queryBuilder.where("receipt.entityId = :entityId", { entityId });
      }

      const totalReceipts = await queryBuilder.getCount();
      const totalRevenue = await queryBuilder
        .select("SUM(receipt.total)", "total")
        .getRawOne();

      const refundedReceipts = await queryBuilder
        .clone()
        .andWhere("receipt.isRefunded = :isRefunded", { isRefunded: true })
        .getCount();

      stats = {
        totalReceipts,
        totalRevenue: parseFloat(totalRevenue?.total || "0"),
        refundedReceipts,
        averageReceiptValue:
          totalReceipts > 0
            ? parseFloat(totalRevenue?.total || "0") / totalReceipts
            : 0,
      };

      await this.cacheService.set(cacheKey, stats, this.LIST_CACHE_TTL);
    }

    return ResponseUtil.success(stats);
  }

  async remove(id: string) {
    const receipt = await this.receiptRepository.findOne({ where: { id } });

    if (!receipt) {
      throw new NotFoundException("Receipt not found");
    }

    receipt.isActive = false;
    await this.receiptRepository.save(receipt);

    // Invalidate all receipt-related caches
    await this.cacheService.delete(`receipt:${id}`);
    await this.cacheService.delete(`receipt:order:${receipt.orderId}`);
    await this.cacheService.delete(`receipt:payment:${receipt.paymentId}`);
    await this.cacheService.delete(`receipt:number:${receipt.receiptNumber}`);
    await this.cacheService.deletePattern("receipt:list:*");
    await this.cacheService.deletePattern("receipt:customer:*");

    return ResponseUtil.success(null, "Receipt deleted successfully");
  }
}
