import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, DataSource } from "typeorm";
import * as XLSX from "xlsx";
import { MenuItem } from "./entities/menu-item.entity";
import { Category } from "./entities/category.entity";
import { Promotion } from "./entities/promotion.entity";
import { CreateMenuItemDto } from "./dto/create-menu-item.dto";
import { UpdateMenuItemDto } from "./dto/update-menu-item.dto";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CreatePromotionDto } from "./dto/create-promotion.dto";
import {
  ResponseUtil,
  QRCodeUtil,
  UserRole,
  JwtPayload,
  JwtPayloadWithRole,
  QueryFilterUtil,
  EventService,
  EventType,
} from "@app/common";

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    private readonly dataSource: DataSource,
    private readonly eventService: EventService
  ) {}

  // Menu Items
  async createMenuItem(
    createMenuItemDto: CreateMenuItemDto,
    currentUser?: JwtPayloadWithRole
  ) {
    // Check access permissions
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        if (createMenuItemDto.entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            "Access denied: Cannot create menu items for other entities"
          );
        }
      } else if (currentUser.role === UserRole.MANAGER) {
        if (createMenuItemDto.entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            "Access denied: Cannot create menu items for other entities"
          );
        }
        if (
          createMenuItemDto.branchId &&
          createMenuItemDto.branchId !== currentUser.branchId
        ) {
          throw new ForbiddenException(
            "Access denied: Managers can only create menu items for their branch"
          );
        }
      } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          "Access denied: Insufficient permissions to create menu items"
        );
      }
    }

    const menuItem = this.menuItemRepository.create(createMenuItemDto);

    // Generate QR code for the menu item
    const qrData = JSON.stringify({
      id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      entityId: menuItem.entityId,
    });

    menuItem.qrCode = await QRCodeUtil.generate(qrData);

    const savedMenuItem = await this.menuItemRepository.save(menuItem);

    // Emit menu item created event
    this.eventService.emit(EventType.MENU_ITEM_CREATED, {
      menuItemId: savedMenuItem.id,
      entityId: savedMenuItem.entityId,
      branchId: savedMenuItem.branchId,
      name: savedMenuItem.name,
      category: savedMenuItem.category,
      price: savedMenuItem.price,
    } as any);

    return ResponseUtil.success(
      savedMenuItem,
      "Menu item created successfully"
    );
  }

  async findAllMenuItems(
    entityId?: string,
    branchId?: string,
    category?: string,
    isAvailable?: boolean,
    currentUser?: JwtPayloadWithRole
  ) {
    const queryBuilder = this.menuItemRepository.createQueryBuilder("item");

    // Apply data isolation
    if (currentUser) {
      QueryFilterUtil.applyEntityFilter(
        queryBuilder,
        currentUser,
        "item.entityId"
      );

      // Managers can only see menu items in their branch
      if (currentUser.role === UserRole.MANAGER) {
        QueryFilterUtil.applyBranchFilter(
          queryBuilder,
          currentUser,
          "item.branchId"
        );
      }
    }

    if (entityId) {
      queryBuilder.andWhere("item.entityId = :entityId", { entityId });
    }

    if (branchId) {
      queryBuilder.andWhere("item.branchId = :branchId", { branchId });
    }

    if (category) {
      queryBuilder.andWhere("item.category = :category", { category });
    }

    if (isAvailable !== undefined) {
      queryBuilder.andWhere("item.isAvailable = :isAvailable", { isAvailable });
    }

    queryBuilder.andWhere("item.isActive = :isActive", { isActive: true });

    const items = await queryBuilder.orderBy("item.category", "ASC").getMany();

    return ResponseUtil.success(items);
  }

  async findMenuItem(id: string, currentUser?: JwtPayloadWithRole) {
    const menuItem = await this.menuItemRepository.findOne({ where: { id } });

    if (!menuItem) {
      throw new NotFoundException("Menu item not found");
    }

    // Check access permissions
    if (currentUser) {
      if (!QueryFilterUtil.canAccessEntity(currentUser, menuItem.entityId)) {
        throw new ForbiddenException(
          "Access denied: Cannot access menu item from another entity"
        );
      }

      // Managers can only access menu items in their branch
      if (currentUser.role === UserRole.MANAGER) {
        if (
          !QueryFilterUtil.canAccessBranch(
            currentUser,
            menuItem.branchId || "",
            menuItem.entityId
          )
        ) {
          throw new ForbiddenException(
            "Access denied: Cannot access menu item from another branch"
          );
        }
      }
    }

    return ResponseUtil.success(menuItem);
  }

  async updateMenuItem(
    id: string,
    updateMenuItemDto: UpdateMenuItemDto,
    currentUser?: JwtPayloadWithRole
  ) {
    const menuItem = await this.menuItemRepository.findOne({ where: { id } });

    if (!menuItem) {
      throw new NotFoundException("Menu item not found");
    }

    // Check access permissions
    if (currentUser) {
      if (!QueryFilterUtil.canAccessEntity(currentUser, menuItem.entityId)) {
        throw new ForbiddenException(
          "Access denied: Cannot update menu item from another entity"
        );
      }

      // Managers can only update menu items in their branch
      if (currentUser.role === UserRole.MANAGER) {
        if (
          !QueryFilterUtil.canAccessBranch(
            currentUser,
            menuItem.branchId || "",
            menuItem.entityId
          )
        ) {
          throw new ForbiddenException(
            "Access denied: Managers can only update menu items in their branch"
          );
        }
      } else if (currentUser.role === UserRole.EMPLOYEE) {
        throw new ForbiddenException(
          "Access denied: Employees cannot update menu items"
        );
      }
    }

    Object.assign(menuItem, updateMenuItemDto);

    // Regenerate QR code if relevant data changed
    if (
      updateMenuItemDto.name ||
      updateMenuItemDto.price ||
      updateMenuItemDto.discountedPrice
    ) {
      const qrData = JSON.stringify({
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.discountedPrice || menuItem.price,
        entityId: menuItem.entityId,
      });

      menuItem.qrCode = await QRCodeUtil.generate(qrData);
    }

    const updatedMenuItem = await this.menuItemRepository.save(menuItem);

    // Emit menu item updated event
    this.eventService.emit(EventType.MENU_ITEM_UPDATED, {
      menuItemId: updatedMenuItem.id,
      entityId: updatedMenuItem.entityId,
      branchId: updatedMenuItem.branchId,
      name: updatedMenuItem.name,
      price: updatedMenuItem.price,
    } as any);

    return ResponseUtil.success(
      updatedMenuItem,
      "Menu item updated successfully"
    );
  }

  async deleteMenuItem(id: string, currentUser?: JwtPayloadWithRole) {
    const menuItem = await this.menuItemRepository.findOne({ where: { id } });

    if (!menuItem) {
      throw new NotFoundException("Menu item not found");
    }

    // Check access permissions
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        if (menuItem.entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            "Access denied: Cannot delete menu item from another entity"
          );
        }
      } else if (currentUser.role === UserRole.MANAGER) {
        if (
          menuItem.entityId !== currentUser.entityId ||
          menuItem.branchId !== currentUser.branchId
        ) {
          throw new ForbiddenException(
            "Access denied: Managers can only delete menu items in their branch"
          );
        }
      } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          "Access denied: Only superadmin, entity owners, and managers can delete menu items"
        );
      }
    }

    // Emit menu item deleted event before deletion
    this.eventService.emit(EventType.MENU_ITEM_DELETED, {
      menuItemId: menuItem.id,
      entityId: menuItem.entityId,
      branchId: menuItem.branchId,
      name: menuItem.name,
    } as any);

    menuItem.isActive = false;
    await this.menuItemRepository.save(menuItem);

    return ResponseUtil.success(null, "Menu item deleted successfully");
  }

  async updateStock(id: string, quantity: number) {
    const menuItem = await this.menuItemRepository.findOne({ where: { id } });

    if (!menuItem) {
      throw new NotFoundException("Menu item not found");
    }

    menuItem.stockQuantity = quantity;
    menuItem.inStock = quantity > 0;

    await this.menuItemRepository.save(menuItem);

    return ResponseUtil.success(null, "Stock updated successfully");
  }

  async decrementStock(id: string, quantity: number) {
    const menuItem = await this.menuItemRepository.findOne({ where: { id } });

    if (!menuItem) {
      throw new NotFoundException("Menu item not found");
    }

    menuItem.stockQuantity = Math.max(0, menuItem.stockQuantity - quantity);
    menuItem.inStock = menuItem.stockQuantity > 0;

    await this.menuItemRepository.save(menuItem);

    return ResponseUtil.success(null, "Stock decremented successfully");
  }

  async getLowStockItems(entityId: string, currentUser?: JwtPayloadWithRole) {
    // Check access permissions
    if (
      currentUser &&
      !QueryFilterUtil.canAccessEntity(currentUser, entityId)
    ) {
      throw new ForbiddenException(
        "Access denied: Cannot access low stock items from another entity"
      );
    }

    const queryBuilder = this.menuItemRepository
      .createQueryBuilder("item")
      .where("item.entityId = :entityId", { entityId })
      .andWhere("item.stockQuantity <= item.lowStockThreshold")
      .andWhere("item.lowStockThreshold > 0");

    // Apply branch filter for managers
    if (currentUser && currentUser.role === UserRole.MANAGER) {
      QueryFilterUtil.applyBranchFilter(
        queryBuilder,
        currentUser,
        "item.branchId"
      );
    }

    const items = await queryBuilder.getMany();

    return ResponseUtil.success(items);
  }

  async incrementOrders(id: string) {
    await this.menuItemRepository.increment({ id }, "totalOrders", 1);

    return ResponseUtil.success(null, "Total orders incremented");
  }

  async updateRating(id: string, rating: number) {
    const menuItem = await this.menuItemRepository.findOne({ where: { id } });

    if (!menuItem) {
      throw new NotFoundException("Menu item not found");
    }

    const totalRatings = menuItem.totalRatings + 1;
    const currentAverage = parseFloat(menuItem.rating.toString());
    const newAverage =
      (currentAverage * menuItem.totalRatings + rating) / totalRatings;

    menuItem.rating = newAverage;
    menuItem.totalRatings = totalRatings;

    await this.menuItemRepository.save(menuItem);

    return ResponseUtil.success(null, "Rating updated successfully");
  }

  // Categories
  async createCategory(
    createCategoryDto: CreateCategoryDto,
    currentUser?: JwtPayloadWithRole
  ) {
    // Check access permissions
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        if (createCategoryDto.entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            "Access denied: Cannot create categories for other entities"
          );
        }
      } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          "Access denied: Only superadmin and entity owners can create categories"
        );
      }
    }

    const category = this.categoryRepository.create(createCategoryDto);
    const savedCategory = await this.categoryRepository.save(category);

    return ResponseUtil.success(savedCategory, "Category created successfully");
  }

  async findAllCategories(entityId?: string, currentUser?: JwtPayloadWithRole) {
    const queryBuilder = this.categoryRepository.createQueryBuilder("category");

    // Apply data isolation
    if (currentUser) {
      QueryFilterUtil.applyEntityFilter(
        queryBuilder,
        currentUser,
        "category.entityId"
      );
    }

    if (entityId) {
      queryBuilder.andWhere("category.entityId = :entityId", { entityId });
    }

    queryBuilder
      .andWhere("category.isActive = :isActive", { isActive: true })
      .orderBy("category.displayOrder", "ASC");

    const categories = await queryBuilder.getMany();

    return ResponseUtil.success(categories);
  }

  async findCategory(id: string, currentUser?: JwtPayloadWithRole) {
    const category = await this.categoryRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    // Check access permissions
    if (
      currentUser &&
      !QueryFilterUtil.canAccessEntity(currentUser, category.entityId)
    ) {
      throw new ForbiddenException(
        "Access denied: Cannot access category from another entity"
      );
    }

    return ResponseUtil.success(category);
  }

  async deleteCategory(id: string, currentUser?: JwtPayloadWithRole) {
    const category = await this.categoryRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    // Check access permissions
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        if (category.entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            "Access denied: Cannot delete category from another entity"
          );
        }
      } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          "Access denied: Only superadmin and entity owners can delete categories"
        );
      }
    }

    category.isActive = false;
    await this.categoryRepository.save(category);

    return ResponseUtil.success(null, "Category deleted successfully");
  }

  // Promotions
  async createPromotion(
    createPromotionDto: CreatePromotionDto,
    currentUser?: JwtPayloadWithRole
  ) {
    // Check access permissions
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        if (createPromotionDto.entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            "Access denied: Cannot create promotions for other entities"
          );
        }
      } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          "Access denied: Only superadmin and entity owners can create promotions"
        );
      }
    }

    const promotion = this.promotionRepository.create(createPromotionDto);
    const savedPromotion = await this.promotionRepository.save(promotion);

    // Emit promotion created event
    this.eventService.emit(EventType.PROMOTION_CREATED, {
      promotionId: savedPromotion.id,
      entityId: savedPromotion.entityId,
      name: savedPromotion.name,
      discountType: savedPromotion.discountType,
      discountValue: savedPromotion.discountValue,
    } as any);

    return ResponseUtil.success(
      savedPromotion,
      "Promotion created successfully"
    );
  }

  async findAllPromotions(
    entityId?: string,
    isActive?: boolean,
    currentUser?: JwtPayloadWithRole
  ) {
    const queryBuilder =
      this.promotionRepository.createQueryBuilder("promotion");

    // Apply data isolation
    if (currentUser) {
      QueryFilterUtil.applyEntityFilter(
        queryBuilder,
        currentUser,
        "promotion.entityId"
      );

      // Managers can only see promotions for their branch if branchId is specified
      if (currentUser.role === UserRole.MANAGER && currentUser.branchId) {
        // Note: Promotions are typically entity-level, but we can filter by branch if needed
        // This depends on business logic - for now, managers see all entity promotions
      }
    }

    if (entityId) {
      queryBuilder.andWhere("promotion.entityId = :entityId", { entityId });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere("promotion.isActive = :isActive", { isActive });
    }

    const now = new Date();
    queryBuilder
      .andWhere("promotion.startDate <= :now", { now })
      .andWhere("promotion.endDate >= :now", { now });

    const promotions = await queryBuilder.getMany();

    return ResponseUtil.success(promotions);
  }

  async findPromotion(id: string, currentUser?: JwtPayloadWithRole) {
    const promotion = await this.promotionRepository.findOne({ where: { id } });

    if (!promotion) {
      throw new NotFoundException("Promotion not found");
    }

    // Check access permissions
    if (
      currentUser &&
      !QueryFilterUtil.canAccessEntity(currentUser, promotion.entityId)
    ) {
      throw new ForbiddenException(
        "Access denied: Cannot access promotion from another entity"
      );
    }

    return ResponseUtil.success(promotion);
  }

  async applyPromotion(
    promotionId: string,
    orderAmount: number,
    itemIds: string[]
  ) {
    const promotion = await this.promotionRepository.findOne({
      where: { id: promotionId },
    });

    if (!promotion) {
      throw new NotFoundException("Promotion not found");
    }

    if (!promotion.isActive) {
      throw new ConflictException("Promotion is not active");
    }

    const now = new Date();
    if (now < promotion.startDate || now > promotion.endDate) {
      throw new ConflictException("Promotion is not valid at this time");
    }

    if (
      promotion.minimumOrderAmount &&
      orderAmount < parseFloat(promotion.minimumOrderAmount.toString())
    ) {
      throw new ConflictException(
        "Order amount does not meet minimum requirement"
      );
    }

    if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
      throw new ConflictException("Promotion usage limit reached");
    }

    let discount = 0;

    if (promotion.discountType === "PERCENTAGE") {
      discount =
        (orderAmount * parseFloat(promotion.discountValue.toString())) / 100;
    } else if (promotion.discountType === "FIXED_AMOUNT") {
      discount = parseFloat(promotion.discountValue.toString());
    }

    // Increment usage count
    promotion.usageCount += 1;
    await this.promotionRepository.save(promotion);

    return ResponseUtil.success({ discount }, "Promotion applied successfully");
  }

  async deletePromotion(id: string, currentUser?: JwtPayloadWithRole) {
    const promotion = await this.promotionRepository.findOne({ where: { id } });

    if (!promotion) {
      throw new NotFoundException("Promotion not found");
    }

    // Check access permissions
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        if (promotion.entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            "Access denied: Cannot delete promotion from another entity"
          );
        }
      } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          "Access denied: Only superadmin and entity owners can delete promotions"
        );
      }
    }

    promotion.isActive = false;
    await this.promotionRepository.save(promotion);

    return ResponseUtil.success(null, "Promotion deleted successfully");
  }

  async getMenuStats(entityId: string, currentUser?: JwtPayloadWithRole) {
    // Check access permissions
    if (
      currentUser &&
      !QueryFilterUtil.canAccessEntity(currentUser, entityId)
    ) {
      throw new ForbiddenException(
        "Access denied: Cannot access menu stats from another entity"
      );
    }

    const queryBuilder = this.menuItemRepository
      .createQueryBuilder("item")
      .where("item.entityId = :entityId", { entityId })
      .andWhere("item.isActive = :isActive", { isActive: true });

    // Apply branch filter for managers
    if (currentUser && currentUser.role === UserRole.MANAGER) {
      QueryFilterUtil.applyBranchFilter(
        queryBuilder,
        currentUser,
        "item.branchId"
      );
    }

    const totalItems = await queryBuilder.getCount();

    const availableItemsQuery = queryBuilder.clone();
    availableItemsQuery.andWhere("item.isAvailable = :isAvailable", {
      isAvailable: true,
    });
    const availableItems = await availableItemsQuery.getCount();

    const lowStockItemsQuery = queryBuilder.clone();
    lowStockItemsQuery
      .andWhere("item.stockQuantity <= item.lowStockThreshold")
      .andWhere("item.lowStockThreshold > 0");
    const lowStockItems = await lowStockItemsQuery.getCount();

    const topItemsQuery = queryBuilder.clone();
    const topItems = await topItemsQuery
      .orderBy("item.totalOrders", "DESC")
      .take(10)
      .getMany();

    const categoryQueryBuilder = this.categoryRepository
      .createQueryBuilder("category")
      .where("category.entityId = :entityId", { entityId })
      .andWhere("category.isActive = :isActive", { isActive: true });
    const categories = await categoryQueryBuilder.getCount();

    return ResponseUtil.success({
      totalItems,
      availableItems,
      lowStockItems,
      topItems,
      categories,
    });
  }

  /**
   * Upload menu items from Excel/CSV file
   */
  async uploadMenuItemsFromFile(
    file: any,
    entityId: string,
    branchId: string | undefined,
    currentUser?: JwtPayloadWithRole
  ) {
    // Validate file
    if (!file) {
      throw new BadRequestException("File is required");
    }

    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv", // .csv
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        "Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed."
      );
    }

    // Check access permissions
    if (currentUser) {
      if (currentUser.role === UserRole.ENTITY_OWNER) {
        if (entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            "Access denied: Cannot upload menu items for other entities"
          );
        }
      } else if (currentUser.role === UserRole.MANAGER) {
        if (entityId !== currentUser.entityId) {
          throw new ForbiddenException(
            "Access denied: Cannot upload menu items for other entities"
          );
        }
        if (branchId && branchId !== currentUser.branchId) {
          throw new ForbiddenException(
            "Access denied: Managers can only upload menu items for their branch"
          );
        }
      } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          "Access denied: Insufficient permissions to upload menu items"
        );
      }
    }

    // Parse Excel file
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(file.buffer, { type: "buffer" });
    } catch (error) {
      throw new BadRequestException(
        "Failed to parse Excel file: " + error.message
      );
    }

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException(
        "Excel file must contain at least one sheet"
      );
    }

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    if (!data || data.length === 0) {
      throw new BadRequestException("Excel file is empty or has no data");
    }

    // Expected columns: name, category, price, description (optional), sku (optional), barcode (optional), stockQuantity (optional)
    const menuItems: CreateMenuItemDto[] = [];
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      const rowNumber = i + 2; // +2 because Excel rows start at 1 and we have header

      try {
        // Validate required fields
        if (!row.name || !row.category || !row.price) {
          errors.push({
            row: rowNumber,
            error:
              "Missing required fields: name, category, and price are required",
          });
          continue;
        }

        // Parse price
        const price = parseFloat(row.price);
        if (isNaN(price) || price < 0) {
          errors.push({
            row: rowNumber,
            error: `Invalid price: ${row.price}`,
          });
          continue;
        }

        // Parse discounted price if provided
        let discountedPrice: number | undefined;
        if (row.discountedPrice) {
          discountedPrice = parseFloat(row.discountedPrice);
          if (isNaN(discountedPrice) || discountedPrice < 0) {
            errors.push({
              row: rowNumber,
              error: `Invalid discounted price: ${row.discountedPrice}`,
            });
            continue;
          }
        }

        // Parse stock quantity if provided
        let stockQuantity: number | undefined;
        if (row.stockQuantity) {
          stockQuantity = parseInt(row.stockQuantity);
          if (isNaN(stockQuantity) || stockQuantity < 0) {
            errors.push({
              row: rowNumber,
              error: `Invalid stock quantity: ${row.stockQuantity}`,
            });
            continue;
          }
        }

        // Parse low stock threshold if provided
        let lowStockThreshold: number | undefined;
        if (row.lowStockThreshold) {
          lowStockThreshold = parseInt(row.lowStockThreshold);
          if (isNaN(lowStockThreshold) || lowStockThreshold < 0) {
            errors.push({
              row: rowNumber,
              error: `Invalid low stock threshold: ${row.lowStockThreshold}`,
            });
            continue;
          }
        }

        const menuItem: CreateMenuItemDto = {
          entityId,
          branchId: branchId || undefined,
          name: String(row.name).trim(),
          category: String(row.category).trim(),
          price,
          description: row.description
            ? String(row.description).trim()
            : undefined,
          sku: row.sku ? String(row.sku).trim() : undefined,
          barcode: row.barcode ? String(row.barcode).trim() : undefined,
          discountedPrice,
          stockQuantity,
          lowStockThreshold,
        };

        menuItems.push(menuItem);
      } catch (error) {
        errors.push({
          row: rowNumber,
          error: error.message || "Unknown error",
        });
      }
    }

    if (menuItems.length === 0) {
      throw new BadRequestException(
        "No valid menu items found in the file. Please check the data format."
      );
    }

    // Bulk insert menu items in a transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const savedItems: MenuItem[] = [];
      const failedItems: Array<{ item: CreateMenuItemDto; error: string }> = [];

      for (const itemDto of menuItems) {
        try {
          const menuItem = this.menuItemRepository.create(itemDto);

          // Generate QR code
          const qrData = JSON.stringify({
            id: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            entityId: menuItem.entityId,
          });
          menuItem.qrCode = await QRCodeUtil.generate(qrData);

          const savedItem = await queryRunner.manager.save(MenuItem, menuItem);
          savedItems.push(savedItem);
        } catch (error) {
          failedItems.push({
            item: itemDto,
            error: error.message || "Unknown error",
          });
        }
      }

      await queryRunner.commitTransaction();

      return ResponseUtil.success(
        {
          totalRows: data.length,
          successful: savedItems.length,
          failed: failedItems.length + errors.length,
          errors: [
            ...errors,
            ...failedItems.map((f) => ({ row: "N/A", error: f.error })),
          ],
          items: savedItems,
        },
        `Successfully uploaded ${savedItems.length} menu items`
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        "Failed to upload menu items: " + error.message
      );
    } finally {
      await queryRunner.release();
    }
  }
}
