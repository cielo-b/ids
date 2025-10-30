import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { MenuItem } from './entities/menu-item.entity';
import { Category } from './entities/category.entity';
import { Promotion } from './entities/promotion.entity';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { ResponseUtil, QRCodeUtil } from '@app/common';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
  ) {}

  // Menu Items
  async createMenuItem(createMenuItemDto: CreateMenuItemDto) {
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

    return ResponseUtil.success(savedMenuItem, 'Menu item created successfully');
  }

  async findAllMenuItems(
    entityId?: string,
    branchId?: string,
    category?: string,
    isAvailable?: boolean,
  ) {
    const queryBuilder = this.menuItemRepository.createQueryBuilder('item');

    if (entityId) {
      queryBuilder.andWhere('item.entityId = :entityId', { entityId });
    }

    if (branchId) {
      queryBuilder.andWhere('item.branchId = :branchId', { branchId });
    }

    if (category) {
      queryBuilder.andWhere('item.category = :category', { category });
    }

    if (isAvailable !== undefined) {
      queryBuilder.andWhere('item.isAvailable = :isAvailable', { isAvailable });
    }

    queryBuilder.andWhere('item.isActive = :isActive', { isActive: true });

    const items = await queryBuilder.orderBy('item.category', 'ASC').getMany();

    return ResponseUtil.success(items);
  }

  async findMenuItem(id: string) {
    const menuItem = await this.menuItemRepository.findOne({ where: { id } });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    return ResponseUtil.success(menuItem);
  }

  async updateMenuItem(id: string, updateMenuItemDto: UpdateMenuItemDto) {
    const menuItem = await this.menuItemRepository.findOne({ where: { id } });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
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

    return ResponseUtil.success(updatedMenuItem, 'Menu item updated successfully');
  }

  async deleteMenuItem(id: string) {
    const menuItem = await this.menuItemRepository.findOne({ where: { id } });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    menuItem.isActive = false;
    await this.menuItemRepository.save(menuItem);

    return ResponseUtil.success(null, 'Menu item deleted successfully');
  }

  async updateStock(id: string, quantity: number) {
    const menuItem = await this.menuItemRepository.findOne({ where: { id } });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    menuItem.stockQuantity = quantity;
    menuItem.inStock = quantity > 0;

    await this.menuItemRepository.save(menuItem);

    return ResponseUtil.success(null, 'Stock updated successfully');
  }

  async decrementStock(id: string, quantity: number) {
    const menuItem = await this.menuItemRepository.findOne({ where: { id } });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    menuItem.stockQuantity = Math.max(0, menuItem.stockQuantity - quantity);
    menuItem.inStock = menuItem.stockQuantity > 0;

    await this.menuItemRepository.save(menuItem);

    return ResponseUtil.success(null, 'Stock decremented successfully');
  }

  async getLowStockItems(entityId: string) {
    const items = await this.menuItemRepository
      .createQueryBuilder('item')
      .where('item.entityId = :entityId', { entityId })
      .andWhere('item.stockQuantity <= item.lowStockThreshold')
      .andWhere('item.lowStockThreshold > 0')
      .getMany();

    return ResponseUtil.success(items);
  }

  async incrementOrders(id: string) {
    await this.menuItemRepository.increment({ id }, 'totalOrders', 1);

    return ResponseUtil.success(null, 'Total orders incremented');
  }

  async updateRating(id: string, rating: number) {
    const menuItem = await this.menuItemRepository.findOne({ where: { id } });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    const totalRatings = menuItem.totalRatings + 1;
    const currentAverage = parseFloat(menuItem.rating.toString());
    const newAverage =
      (currentAverage * menuItem.totalRatings + rating) / totalRatings;

    menuItem.rating = newAverage;
    menuItem.totalRatings = totalRatings;

    await this.menuItemRepository.save(menuItem);

    return ResponseUtil.success(null, 'Rating updated successfully');
  }

  // Categories
  async createCategory(createCategoryDto: CreateCategoryDto) {
    const category = this.categoryRepository.create(createCategoryDto);
    const savedCategory = await this.categoryRepository.save(category);

    return ResponseUtil.success(savedCategory, 'Category created successfully');
  }

  async findAllCategories(entityId?: string) {
    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    if (entityId) {
      queryBuilder.where('category.entityId = :entityId', { entityId });
    }

    queryBuilder
      .andWhere('category.isActive = :isActive', { isActive: true })
      .orderBy('category.displayOrder', 'ASC');

    const categories = await queryBuilder.getMany();

    return ResponseUtil.success(categories);
  }

  async findCategory(id: string) {
    const category = await this.categoryRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return ResponseUtil.success(category);
  }

  async deleteCategory(id: string) {
    const category = await this.categoryRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    category.isActive = false;
    await this.categoryRepository.save(category);

    return ResponseUtil.success(null, 'Category deleted successfully');
  }

  // Promotions
  async createPromotion(createPromotionDto: CreatePromotionDto) {
    const promotion = this.promotionRepository.create(createPromotionDto);
    const savedPromotion = await this.promotionRepository.save(promotion);

    return ResponseUtil.success(savedPromotion, 'Promotion created successfully');
  }

  async findAllPromotions(entityId?: string, isActive?: boolean) {
    const queryBuilder = this.promotionRepository.createQueryBuilder('promotion');

    if (entityId) {
      queryBuilder.where('promotion.entityId = :entityId', { entityId });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('promotion.isActive = :isActive', { isActive });
    }

    const now = new Date();
    queryBuilder
      .andWhere('promotion.startDate <= :now', { now })
      .andWhere('promotion.endDate >= :now', { now });

    const promotions = await queryBuilder.getMany();

    return ResponseUtil.success(promotions);
  }

  async findPromotion(id: string) {
    const promotion = await this.promotionRepository.findOne({ where: { id } });

    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    return ResponseUtil.success(promotion);
  }

  async applyPromotion(promotionId: string, orderAmount: number, itemIds: string[]) {
    const promotion = await this.promotionRepository.findOne({
      where: { id: promotionId },
    });

    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    if (!promotion.isActive) {
      throw new ConflictException('Promotion is not active');
    }

    const now = new Date();
    if (now < promotion.startDate || now > promotion.endDate) {
      throw new ConflictException('Promotion is not valid at this time');
    }

    if (
      promotion.minimumOrderAmount &&
      orderAmount < parseFloat(promotion.minimumOrderAmount.toString())
    ) {
      throw new ConflictException('Order amount does not meet minimum requirement');
    }

    if (
      promotion.usageLimit &&
      promotion.usageCount >= promotion.usageLimit
    ) {
      throw new ConflictException('Promotion usage limit reached');
    }

    let discount = 0;

    if (promotion.discountType === 'PERCENTAGE') {
      discount = (orderAmount * parseFloat(promotion.discountValue.toString())) / 100;
    } else if (promotion.discountType === 'FIXED_AMOUNT') {
      discount = parseFloat(promotion.discountValue.toString());
    }

    // Increment usage count
    promotion.usageCount += 1;
    await this.promotionRepository.save(promotion);

    return ResponseUtil.success({ discount }, 'Promotion applied successfully');
  }

  async deletePromotion(id: string) {
    const promotion = await this.promotionRepository.findOne({ where: { id } });

    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    promotion.isActive = false;
    await this.promotionRepository.save(promotion);

    return ResponseUtil.success(null, 'Promotion deleted successfully');
  }

  async getMenuStats(entityId: string) {
    const totalItems = await this.menuItemRepository.count({
      where: { entityId, isActive: true },
    });

    const availableItems = await this.menuItemRepository.count({
      where: { entityId, isActive: true, isAvailable: true },
    });

    const lowStockItems = await this.menuItemRepository.count({
      where: { entityId, isActive: true },
    });

    const topItems = await this.menuItemRepository.find({
      where: { entityId, isActive: true },
      order: { totalOrders: 'DESC' },
      take: 10,
    });

    const categories = await this.categoryRepository.count({
      where: { entityId, isActive: true },
    });

    return ResponseUtil.success({
      totalItems,
      availableItems,
      lowStockItems,
      topItems,
      categories,
    });
  }
}

