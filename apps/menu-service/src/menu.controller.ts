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
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { MenuService } from "./menu.service";
import { CreateMenuItemDto } from "./dto/create-menu-item.dto";
import { UpdateMenuItemDto } from "./dto/update-menu-item.dto";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CreatePromotionDto } from "./dto/create-promotion.dto";
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
  JwtPayloadWithRole,
} from "@app/common";

@ApiTags("Menu")
@Controller()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // Menu Items Endpoints
  @Post("items")
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @EntityAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new menu item" })
  @ApiResponse({ status: 201, description: "Menu item created successfully" })
  createMenuItem(
    @Body() createMenuItemDto: CreateMenuItemDto,
    @CurrentUser() currentUser?: JwtPayloadWithRole
  ) {
    return this.menuService.createMenuItem(createMenuItemDto, currentUser);
  }

  @Post("items/upload")
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @EntityAccess()
  @UseInterceptors(FileInterceptor("file"))
  @ApiBearerAuth()
  @ApiOperation({ summary: "Upload menu items from Excel/CSV file" })
  @ApiResponse({
    status: 201,
    description: "Menu items uploaded successfully",
  })
  @ApiResponse({ status: 400, description: "Invalid file format or data" })
  uploadMenuItems(
    @UploadedFile() file: any,
    @Query("entityId") entityId: string,
    @Query("branchId") branchId?: string,
    @CurrentUser() currentUser?: JwtPayloadWithRole
  ) {
    if (!file) {
      throw new Error("File is required");
    }
    return this.menuService.uploadMenuItemsFromFile(
      file,
      entityId,
      branchId,
      currentUser
    );
  }

  @Get("items")
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all menu items" })
  @ApiQuery({ name: "entityId", required: false })
  @ApiQuery({ name: "branchId", required: false })
  @ApiQuery({ name: "category", required: false })
  @ApiQuery({ name: "isAvailable", required: false })
  findAllMenuItems(
    @Query("entityId") entityId?: string,
    @Query("branchId") branchId?: string,
    @Query("category") category?: string,
    @Query("isAvailable") isAvailable?: boolean,
    @CurrentUser() currentUser?: JwtPayloadWithRole
  ) {
    return this.menuService.findAllMenuItems(
      entityId,
      branchId,
      category,
      isAvailable,
      currentUser
    );
  }

  @Get("items/low-stock/:entityId")
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get low stock items" })
  getLowStockItems(
    @Param("entityId") entityId: string,
    @CurrentUser() currentUser?: JwtPayloadWithRole
  ) {
    return this.menuService.getLowStockItems(entityId, currentUser);
  }

  @Get("items/:id")
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get menu item by ID" })
  findMenuItem(
    @Param("id") id: string,
    @CurrentUser() currentUser?: JwtPayloadWithRole
  ) {
    return this.menuService.findMenuItem(id, currentUser);
  }

  @Patch("items/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update menu item" })
  updateMenuItem(
    @Param("id") id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
    @CurrentUser() currentUser?: JwtPayloadWithRole
  ) {
    return this.menuService.updateMenuItem(id, updateMenuItemDto, currentUser);
  }

  @Patch("items/:id/stock/:quantity")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update menu item stock" })
  updateStock(
    @Param("id") id: string,
    @Param("quantity", ParseIntPipe) quantity: number
  ) {
    return this.menuService.updateStock(id, quantity);
  }

  @Patch("items/:id/decrement-stock/:quantity")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Decrement menu item stock" })
  decrementStock(
    @Param("id") id: string,
    @Param("quantity", ParseIntPipe) quantity: number
  ) {
    return this.menuService.decrementStock(id, quantity);
  }

  @Patch("items/:id/increment-orders")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Increment total orders count" })
  incrementOrders(@Param("id") id: string) {
    return this.menuService.incrementOrders(id);
  }

  @Patch("items/:id/rating/:rating")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update menu item rating" })
  updateRating(
    @Param("id") id: string,
    @Param("rating", ParseIntPipe) rating: number
  ) {
    return this.menuService.updateRating(id, rating);
  }

  @Delete("items/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @EntityAccess()
  @BranchAccess()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete menu item" })
  deleteMenuItem(
    @Param("id") id: string,
    @CurrentUser() currentUser?: JwtPayloadWithRole
  ) {
    return this.menuService.deleteMenuItem(id, currentUser);
  }

  // Categories Endpoints
  @Post("categories")
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER)
  @EntityAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new category" })
  createCategory(
    @Body() createCategoryDto: CreateCategoryDto,
    @CurrentUser() currentUser?: JwtPayloadWithRole
  ) {
    return this.menuService.createCategory(createCategoryDto, currentUser);
  }

  @Get("categories")
  @UseGuards(JwtAuthGuard, EntityGuard)
  @EntityAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all categories" })
  @ApiQuery({ name: "entityId", required: false })
  findAllCategories(
    @Query("entityId") entityId?: string,
    @CurrentUser() currentUser?: JwtPayloadWithRole
  ) {
    return this.menuService.findAllCategories(entityId, currentUser);
  }

  @Get("categories/:id")
  @UseGuards(JwtAuthGuard, EntityGuard)
  @EntityAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get category by ID" })
  findCategory(
    @Param("id") id: string,
    @CurrentUser() currentUser?: JwtPayloadWithRole
  ) {
    return this.menuService.findCategory(id, currentUser);
  }

  @Delete("categories/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER)
  @EntityAccess()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete category" })
  deleteCategory(
    @Param("id") id: string,
    @CurrentUser() currentUser?: JwtPayloadWithRole
  ) {
    return this.menuService.deleteCategory(id, currentUser);
  }

  // Promotions Endpoints
  @Post("promotions")
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER)
  @EntityAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new promotion" })
  createPromotion(
    @Body() createPromotionDto: CreatePromotionDto,
    @CurrentUser() currentUser?: JwtPayloadWithRole
  ) {
    return this.menuService.createPromotion(createPromotionDto, currentUser);
  }

  @Get("promotions")
  @UseGuards(JwtAuthGuard, EntityGuard)
  @EntityAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all promotions" })
  @ApiQuery({ name: "entityId", required: false })
  @ApiQuery({ name: "isActive", required: false })
  findAllPromotions(
    @Query("entityId") entityId?: string,
    @Query("isActive") isActive?: boolean,
    @CurrentUser() currentUser?: JwtPayloadWithRole
  ) {
    return this.menuService.findAllPromotions(entityId, isActive, currentUser);
  }

  @Get("promotions/:id")
  @UseGuards(JwtAuthGuard, EntityGuard)
  @EntityAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get promotion by ID" })
  findPromotion(
    @Param("id") id: string,
    @CurrentUser() currentUser?: JwtPayloadWithRole
  ) {
    return this.menuService.findPromotion(id, currentUser);
  }

  @Post("promotions/:id/apply")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Apply promotion to order" })
  applyPromotion(
    @Param("id") id: string,
    @Body() body: { orderAmount: number; itemIds: string[] }
  ) {
    return this.menuService.applyPromotion(id, body.orderAmount, body.itemIds);
  }

  @Delete("promotions/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER)
  @EntityAccess()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete promotion" })
  deletePromotion(
    @Param("id") id: string,
    @CurrentUser() currentUser?: JwtPayloadWithRole
  ) {
    return this.menuService.deletePromotion(id, currentUser);
  }

  // Statistics
  @Get("stats/:entityId")
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get menu statistics for entity" })
  getMenuStats(
    @Param("entityId") entityId: string,
    @CurrentUser() currentUser?: JwtPayloadWithRole
  ) {
    return this.menuService.getMenuStats(entityId, currentUser);
  }
}
