import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Receipt } from "./entities/receipt.entity";
import { CreateReceiptDto } from "./dto/create-receipt.dto";
import { UpdateReceiptDto } from "./dto/update-receipt.dto";
import {
  ResponseUtil,
  CacheService,
  QRCodeUtil,
  ReceiptStatus,
  UserRole,
  JwtPayload,
  JwtPayloadWithRole,
  QueryFilterUtil,
  EventService,
  EventType,
} from "@app/common";

@Injectable()
export class ReceiptService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly LIST_CACHE_TTL = 600; // 10 minutes for lists

  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
    private cacheService: CacheService,
    private readonly eventService: EventService
  ) {}

  async create(createReceiptDto: CreateReceiptDto, currentUser?: JwtPayloadWithRole) {
    // Check if receipt already exists for this order
    const existingReceipt = await this.receiptRepository.findOne({
      where: { orderId: createReceiptDto.orderId },
    });

    if (existingReceipt) {
      throw new ConflictException("Receipt already exists for this order");
    }

    // Check access permissions
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        if (createReceiptDto.entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            "Access denied: Cannot create receipts for other entities"
          );
        }
      } else if (
        currentUser.role === UserRole.MANAGER ||
        currentUser.role === UserRole.EMPLOYEE
      ) {
        if (createReceiptDto.entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            "Access denied: Cannot create receipts for other entities"
          );
        }
        if (
          createReceiptDto.branchId &&
          createReceiptDto.branchId !== currentUser.branchId
        ) {
          throw new ForbiddenException(
            "Access denied: Cannot create receipts for other branches"
          );
        }
      }
    }

    // Generate QR payload
    const qrPayload = JSON.stringify({
      receiptId: null, // Will be set after save
      orderCode: createReceiptDto.orderCode,
      amount: createReceiptDto.amountPaid,
      currency: createReceiptDto.currency || "FRW",
    });

    const receipt = this.receiptRepository.create({
      orderId: createReceiptDto.orderId,
      orderCode: createReceiptDto.orderCode,
      entityId: createReceiptDto.entityId,
      branchId: createReceiptDto.branchId,
      branchName: createReceiptDto.branchName,
      customerName: createReceiptDto.customerName,
      handledById: createReceiptDto.handledById || currentUser?.sub,
      handledByName: createReceiptDto.handledByName,
      paymentMethod: createReceiptDto.paymentMethod,
      subtotal: createReceiptDto.subtotal,
      tax: createReceiptDto.tax,
      amountPaid: createReceiptDto.amountPaid,
      currency: createReceiptDto.currency || "FRW",
      status: createReceiptDto.status || ReceiptStatus.ISSUED,
      servedAt: new Date(createReceiptDto.servedAt),
      generatedAt: new Date(),
      qrPayload,
    });

    const savedReceipt = await this.receiptRepository.save(receipt);

    // Update QR payload with receipt ID
    const updatedQrPayload = JSON.stringify({
      receiptId: savedReceipt.id,
      orderCode: savedReceipt.orderCode,
      amount: savedReceipt.amountPaid,
      currency: savedReceipt.currency,
    });
    savedReceipt.qrPayload = updatedQrPayload;
    await this.receiptRepository.save(savedReceipt);

    // Cache the new receipt
    await this.cacheService.set(
      `receipt:${savedReceipt.id}`,
      savedReceipt,
      this.CACHE_TTL
    );
    // Invalidate related caches
    await this.cacheService.delete(`receipt:order:${createReceiptDto.orderId}`);
    await this.cacheService.deletePattern("receipt:list:*");

    // Emit receipt created event
    this.eventService.emitReceiptCreated({
      receiptId: savedReceipt.id,
      orderId: savedReceipt.orderId,
      orderCode: savedReceipt.orderCode,
      entityId: savedReceipt.entityId,
      branchId: savedReceipt.branchId,
      userId: currentUser?.sub,
      amountPaid: savedReceipt.amountPaid,
      status: savedReceipt.status,
    } as any);

    return ResponseUtil.success(savedReceipt, "Receipt created successfully");
  }

  async findAll(
    entityId?: string,
    branchId?: string,
    handledById?: string,
    startDate?: Date,
    endDate?: Date,
    currentUser?: JwtPayloadWithRole
  ) {
    // Generate cache key
    const cacheKey = `receipt:list:${entityId || ""}:${branchId || ""}:${handledById || ""}:${startDate || ""}:${endDate || ""}:${currentUser?.role || ""}`;
    let receipts = await this.cacheService.get<Receipt[]>(cacheKey);

    if (!receipts) {
      const queryBuilder = this.receiptRepository.createQueryBuilder("receipt");

      // Apply data isolation
      if (currentUser) {
        QueryFilterUtil.applyEntityFilter(
          queryBuilder,
          currentUser,
          "receipt.entityId"
        );

        // Managers can only see receipts in their branch
        if (currentUser.role === UserRole.MANAGER) {
          QueryFilterUtil.applyBranchFilter(
            queryBuilder,
            currentUser,
            "receipt.branchId"
          );
        } else if (currentUser.role === UserRole.EMPLOYEE) {
          // Employees can only see receipts they handled
          queryBuilder.andWhere("receipt.handledById = :handledById", {
            handledById: currentUser.sub,
          });
        }
      }

      if (entityId) {
        queryBuilder.andWhere("receipt.entityId = :entityId", { entityId });
      }

      if (branchId) {
        queryBuilder.andWhere("receipt.branchId = :branchId", { branchId });
      }

      if (handledById) {
        queryBuilder.andWhere("receipt.handledById = :handledById", {
          handledById,
        });
      }

      if (startDate) {
        queryBuilder.andWhere("receipt.generatedAt >= :startDate", {
          startDate,
        });
      }

      if (endDate) {
        queryBuilder.andWhere("receipt.generatedAt <= :endDate", { endDate });
      }

      receipts = await queryBuilder
        .orderBy("receipt.generatedAt", "DESC")
        .getMany();

      await this.cacheService.set(cacheKey, receipts, this.LIST_CACHE_TTL);
    }

    return ResponseUtil.success(receipts);
  }

  async findOne(id: string, currentUser?: JwtPayloadWithRole) {
    const cacheKey = `receipt:${id}`;
    let receipt = await this.cacheService.get<Receipt>(cacheKey);

    if (!receipt) {
      receipt = await this.receiptRepository.findOne({ where: { id } });

      if (!receipt) {
        throw new NotFoundException("Receipt not found");
      }

      await this.cacheService.set(cacheKey, receipt, this.CACHE_TTL);
    }

    // Check access permissions
    if (currentUser) {
      if (!QueryFilterUtil.canAccessEntity(currentUser, receipt.entityId)) {
        throw new ForbiddenException(
          "Access denied: Cannot access receipt from another entity"
        );
      }

      // Managers can only access receipts in their branch
      if (currentUser.role === UserRole.MANAGER) {
        if (
          !QueryFilterUtil.canAccessBranch(
            currentUser,
            receipt.branchId || "",
            receipt.entityId
          )
        ) {
          throw new ForbiddenException(
            "Access denied: Cannot access receipt from another branch"
          );
        }
      } else if (currentUser.role === UserRole.EMPLOYEE) {
        // Employees can only access receipts they handled
        if (receipt.handledById !== currentUser.sub) {
          throw new ForbiddenException(
            "Access denied: Cannot access receipt not handled by you"
          );
        }
      }
    }

    return ResponseUtil.success(receipt);
  }

  async findByOrderId(orderId: string, currentUser?: JwtPayloadWithRole) {
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

    // Check access permissions
    if (currentUser) {
      if (!QueryFilterUtil.canAccessEntity(currentUser, receipt.entityId)) {
        throw new ForbiddenException(
          "Access denied: Cannot access receipt from another entity"
        );
      }

      // Managers can only access receipts in their branch
      if (currentUser.role === UserRole.MANAGER) {
        if (
          !QueryFilterUtil.canAccessBranch(
            currentUser,
            receipt.branchId || "",
            receipt.entityId
          )
        ) {
          throw new ForbiddenException(
            "Access denied: Cannot access receipt from another branch"
          );
        }
      } else if (currentUser.role === UserRole.EMPLOYEE) {
        // Employees can only access receipts they handled
        if (receipt.handledById !== currentUser.sub) {
          throw new ForbiddenException(
            "Access denied: Cannot access receipt not handled by you"
          );
        }
      }
    }

    return ResponseUtil.success(receipt);
  }

  async findByCustomerName(
    customerName: string,
    limit: number = 50,
    currentUser?: JwtPayloadWithRole
  ) {
    const queryBuilder = this.receiptRepository.createQueryBuilder("receipt");

    // Apply data isolation
    if (currentUser) {
      QueryFilterUtil.applyEntityFilter(
        queryBuilder,
        currentUser,
        "receipt.entityId"
      );

      // Managers can only see receipts in their branch
      if (currentUser.role === UserRole.MANAGER) {
        QueryFilterUtil.applyBranchFilter(
          queryBuilder,
          currentUser,
          "receipt.branchId"
        );
      } else if (currentUser.role === UserRole.EMPLOYEE) {
        // Employees can only see receipts they handled
        queryBuilder.andWhere("receipt.handledById = :handledById", {
          handledById: currentUser.sub,
        });
      }
    }

    queryBuilder
      .andWhere("receipt.customerName = :customerName", { customerName })
      .orderBy("receipt.generatedAt", "DESC")
      .take(limit);

    const receipts = await queryBuilder.getMany();

    return ResponseUtil.success(receipts);
  }

  async update(
    id: string,
    updateReceiptDto: UpdateReceiptDto,
    currentUser?: JwtPayloadWithRole
  ) {
    const receipt = await this.receiptRepository.findOne({ where: { id } });

    if (!receipt) {
      throw new NotFoundException("Receipt not found");
    }

    // Check access permissions
    if (currentUser) {
      if (!QueryFilterUtil.canAccessEntity(currentUser, receipt.entityId)) {
        throw new ForbiddenException(
          "Access denied: Cannot update receipt from another entity"
        );
      }

      // Managers can only update receipts in their branch
      if (currentUser.role === UserRole.MANAGER) {
        if (
          !QueryFilterUtil.canAccessBranch(
            currentUser,
            receipt.branchId || "",
            receipt.entityId
          )
        ) {
          throw new ForbiddenException(
            "Access denied: Cannot update receipt from another branch"
          );
        }
      } else if (currentUser.role === UserRole.EMPLOYEE) {
        throw new ForbiddenException(
          "Access denied: Employees cannot update receipts"
        );
      }
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
    await this.cacheService.deletePattern("receipt:list:*");

    return ResponseUtil.success(updatedReceipt, "Receipt updated successfully");
  }

  async markAsRefunded(
    id: string,
    refundReceiptId?: string,
    currentUser?: JwtPayloadWithRole
  ) {
    const receipt = await this.receiptRepository.findOne({ where: { id } });

    if (!receipt) {
      throw new NotFoundException("Receipt not found");
    }

    // Check access permissions
    if (currentUser) {
      if (!QueryFilterUtil.canAccessEntity(currentUser, receipt.entityId)) {
        throw new ForbiddenException(
          "Access denied: Cannot update receipt from another entity"
        );
      }

      // Only entity owners and managers can mark receipts as refunded
      if (currentUser.role === UserRole.EMPLOYEE) {
        throw new ForbiddenException(
          "Access denied: Employees cannot mark receipts as refunded"
        );
      }
    }

    receipt.status = ReceiptStatus.REFUNDED;

    const updatedReceipt = await this.receiptRepository.save(receipt);

    // Update cache
    await this.cacheService.set(
      `receipt:${updatedReceipt.id}`,
      updatedReceipt,
      this.CACHE_TTL
    );
    await this.cacheService.delete(`receipt:order:${updatedReceipt.orderId}`);
    await this.cacheService.deletePattern("receipt:list:*");

    // Emit receipt refunded event
    this.eventService.emit(EventType.RECEIPT_REFUNDED, {
      receiptId: updatedReceipt.id,
      orderId: updatedReceipt.orderId,
      orderCode: updatedReceipt.orderCode,
      entityId: updatedReceipt.entityId,
      branchId: updatedReceipt.branchId,
      userId: currentUser?.sub,
      amountPaid: updatedReceipt.amountPaid,
      status: updatedReceipt.status,
      eventType: EventType.RECEIPT_REFUNDED,
      timestamp: new Date(),
    } as any);

    return ResponseUtil.success(updatedReceipt, "Receipt marked as refunded");
  }

  async regenerateQRCode(id: string, currentUser?: JwtPayloadWithRole) {
    const receipt = await this.receiptRepository.findOne({ where: { id } });

    if (!receipt) {
      throw new NotFoundException("Receipt not found");
    }

    // Check access permissions
    if (currentUser) {
      if (!QueryFilterUtil.canAccessEntity(currentUser, receipt.entityId)) {
        throw new ForbiddenException(
          "Access denied: Cannot regenerate QR code for receipt from another entity"
        );
      }
    }

    // Regenerate QR payload
    const qrPayload = JSON.stringify({
      receiptId: receipt.id,
      orderCode: receipt.orderCode,
      amount: receipt.amountPaid,
      currency: receipt.currency,
    });

    receipt.qrPayload = qrPayload;

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

  async getStats(entityId?: string, currentUser?: JwtPayloadWithRole) {
    // Check access permissions
    if (
      currentUser &&
      entityId &&
      !QueryFilterUtil.canAccessEntity(currentUser, entityId)
    ) {
      throw new ForbiddenException(
        "Access denied: Cannot access receipt stats from another entity"
      );
    }

    const cacheKey = `receipt:stats:${entityId || "all"}:${currentUser?.role || ""}:${currentUser?.branchId || ""}`;
    let stats = await this.cacheService.get<any>(cacheKey);

    if (!stats) {
      const queryBuilder = this.receiptRepository.createQueryBuilder("receipt");

      // Apply data isolation
      if (currentUser) {
        QueryFilterUtil.applyEntityFilter(
          queryBuilder,
          currentUser,
          "receipt.entityId"
        );

        // Managers can only see stats for their branch
        if (currentUser.role === UserRole.MANAGER) {
          QueryFilterUtil.applyBranchFilter(
            queryBuilder,
            currentUser,
            "receipt.branchId"
          );
        } else if (currentUser.role === UserRole.EMPLOYEE) {
          // Employees can only see stats for receipts they handled
          queryBuilder.andWhere("receipt.handledById = :handledById", {
            handledById: currentUser.sub,
          });
        }
      }

      if (entityId) {
        queryBuilder.andWhere("receipt.entityId = :entityId", { entityId });
      }

      const totalReceipts = await queryBuilder.getCount();
      const totalRevenue = await queryBuilder
        .clone()
        .select("SUM(receipt.amountPaid)", "total")
        .getRawOne();

      const refundedReceipts = await queryBuilder
        .clone()
        .andWhere("receipt.status = :status", {
          status: ReceiptStatus.REFUNDED,
        })
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

  async remove(id: string, currentUser?: JwtPayloadWithRole) {
    const receipt = await this.receiptRepository.findOne({ where: { id } });

    if (!receipt) {
      throw new NotFoundException("Receipt not found");
    }

    // Check access permissions - only superadmin and entity owners can delete receipts
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        if (receipt.entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            "Access denied: Cannot delete receipt from another entity"
          );
        }
      } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          "Access denied: Only superadmin and entity owners can delete receipts"
        );
      }
    }

    receipt.status = ReceiptStatus.VOID;
    await this.receiptRepository.save(receipt);

    // Invalidate all receipt-related caches
    await this.cacheService.delete(`receipt:${id}`);
    await this.cacheService.delete(`receipt:order:${receipt.orderId}`);
    await this.cacheService.deletePattern("receipt:list:*");

    return ResponseUtil.success(null, "Receipt voided successfully");
  }
}
