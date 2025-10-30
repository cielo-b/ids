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
  ParseBoolPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('Menu')
@Controller()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // Menu Items Endpoints
  @Post('items')
  @ApiOperation({ summary: 'Create a new menu item' })
  @ApiResponse({ status: 201, description: 'Menu item created successfully' })
  createMenuItem(@Body() createMenuItemDto: CreateMenuItemDto) {
    return this.menuService.createMenuItem(createMenuItemDto);
  }

  @Get('items')
  @ApiOperation({ summary: 'Get all menu items' })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'isAvailable', required: false })
  findAllMenuItems(
    @Query('entityId') entityId?: string,
    @Query('branchId') branchId?: string,
    @Query('category') category?: string,
    @Query('isAvailable') isAvailable?: boolean,
  ) {
    return this.menuService.findAllMenuItems(entityId, branchId, category, isAvailable);
  }

  @Get('items/low-stock/:entityId')
  @ApiOperation({ summary: 'Get low stock items' })
  getLowStockItems(@Param('entityId') entityId: string) {
    return this.menuService.getLowStockItems(entityId);
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Get menu item by ID' })
  findMenuItem(@Param('id') id: string) {
    return this.menuService.findMenuItem(id);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update menu item' })
  updateMenuItem(
    @Param('id') id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
  ) {
    return this.menuService.updateMenuItem(id, updateMenuItemDto);
  }

  @Patch('items/:id/stock/:quantity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update menu item stock' })
  updateStock(
    @Param('id') id: string,
    @Param('quantity', ParseIntPipe) quantity: number,
  ) {
    return this.menuService.updateStock(id, quantity);
  }

  @Patch('items/:id/decrement-stock/:quantity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decrement menu item stock' })
  decrementStock(
    @Param('id') id: string,
    @Param('quantity', ParseIntPipe) quantity: number,
  ) {
    return this.menuService.decrementStock(id, quantity);
  }

  @Patch('items/:id/increment-orders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Increment total orders count' })
  incrementOrders(@Param('id') id: string) {
    return this.menuService.incrementOrders(id);
  }

  @Patch('items/:id/rating/:rating')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update menu item rating' })
  updateRating(
    @Param('id') id: string,
    @Param('rating', ParseIntPipe) rating: number,
  ) {
    return this.menuService.updateRating(id, rating);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete menu item' })
  deleteMenuItem(@Param('id') id: string) {
    return this.menuService.deleteMenuItem(id);
  }

  // Categories Endpoints
  @Post('categories')
  @ApiOperation({ summary: 'Create a new category' })
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.menuService.createCategory(createCategoryDto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories' })
  @ApiQuery({ name: 'entityId', required: false })
  findAllCategories(@Query('entityId') entityId?: string) {
    return this.menuService.findAllCategories(entityId);
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get category by ID' })
  findCategory(@Param('id') id: string) {
    return this.menuService.findCategory(id);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete category' })
  deleteCategory(@Param('id') id: string) {
    return this.menuService.deleteCategory(id);
  }

  // Promotions Endpoints
  @Post('promotions')
  @ApiOperation({ summary: 'Create a new promotion' })
  createPromotion(@Body() createPromotionDto: CreatePromotionDto) {
    return this.menuService.createPromotion(createPromotionDto);
  }

  @Get('promotions')
  @ApiOperation({ summary: 'Get all promotions' })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  findAllPromotions(
    @Query('entityId') entityId?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.menuService.findAllPromotions(entityId, isActive);
  }

  @Get('promotions/:id')
  @ApiOperation({ summary: 'Get promotion by ID' })
  findPromotion(@Param('id') id: string) {
    return this.menuService.findPromotion(id);
  }

  @Post('promotions/:id/apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply promotion to order' })
  applyPromotion(
    @Param('id') id: string,
    @Body() body: { orderAmount: number; itemIds: string[] },
  ) {
    return this.menuService.applyPromotion(id, body.orderAmount, body.itemIds);
  }

  @Delete('promotions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete promotion' })
  deletePromotion(@Param('id') id: string) {
    return this.menuService.deletePromotion(id);
  }

  // Statistics
  @Get('stats/:entityId')
  @ApiOperation({ summary: 'Get menu statistics for entity' })
  getMenuStats(@Param('entityId') entityId: string) {
    return this.menuService.getMenuStats(entityId);
  }
}

