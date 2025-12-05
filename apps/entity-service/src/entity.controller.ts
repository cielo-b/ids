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
  ParseFloatPipe,
  ParseIntPipe,
  ParseEnumPipe,
  UseGuards,
} from '@nestjs/common';
import { EntityService } from './entity.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { CreatePumpDto } from './dto/create-pump.dto';
import { UpdatePumpDto } from './dto/update-pump.dto';
import { TableStatus } from './entities/table.entity';
import { PumpStatus } from './entities/pump.entity';
import { EntityAccess, BranchAccess } from '@app/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  EntityCategory,
  JwtAuthGuard,
  RolesGuard,
  Roles,
  UserRole,
  EntityGuard,
  BranchGuard,
  CurrentUser,
  JwtPayload,
} from '@app/common';

@ApiTags('Entities')
@Controller()
export class EntityController {
  constructor(private readonly entityService: EntityService) {}

  // Category Endpoints
  @Get('categories')
  @ApiOperation({ summary: 'Get all available entity categories' })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  getCategories() {
    return this.entityService.getCategories();
  }

  // Entity Endpoints
  @Post('entities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new entity (Superadmin only)' })
  @ApiResponse({ status: 201, description: 'Entity created successfully' })
  createEntity(@Body() createEntityDto: CreateEntityDto) {
    return this.entityService.createEntity(createEntityDto);
  }

  @Get('entities')
  @UseGuards(JwtAuthGuard, EntityGuard)
  @EntityAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all entities' })
  @ApiQuery({ name: 'category', required: false, enum: EntityCategory })
  @ApiQuery({ name: 'ownerId', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  findAllEntities(
    @Query('category') category?: EntityCategory,
    @Query('ownerId') ownerId?: string,
    @Query('isActive') isActive?: boolean,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.entityService.findAllEntities(
      category,
      ownerId,
      isActive,
      currentUser,
    );
  }

  @Get('entities/stats')
  @ApiOperation({ summary: 'Get entity statistics' })
  @ApiQuery({ name: 'entityId', required: false })
  getStats(@Query('entityId') entityId?: string) {
    return this.entityService.getEntityStats(entityId);
  }

  @Get('entities/nearby')
  @ApiOperation({ summary: 'Get nearby entities' })
  @ApiQuery({ name: 'latitude', required: true })
  @ApiQuery({ name: 'longitude', required: true })
  @ApiQuery({ name: 'radius', required: false })
  @ApiQuery({ name: 'category', required: false, enum: EntityCategory })
  getNearby(
    @Query('latitude', ParseFloatPipe) latitude: number,
    @Query('longitude', ParseFloatPipe) longitude: number,
    @Query('radius') radius?: number,
    @Query('category') category?: EntityCategory,
  ) {
    return this.entityService.getNearbyEntities(
      latitude,
      longitude,
      radius || 10,
      category,
    );
  }

  @Get('entities/owner/:ownerId')
  @ApiOperation({ summary: 'Get entities by owner' })
  findByOwner(@Param('ownerId') ownerId: string) {
    return this.entityService.findByOwner(ownerId);
  }

  @Get('entities/:id')
  @UseGuards(JwtAuthGuard, EntityGuard)
  @EntityAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get entity by ID' })
  findEntity(@Param('id') id: string, @CurrentUser() currentUser?: JwtPayload) {
    return this.entityService.findEntity(id, currentUser);
  }

  @Patch('entities/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER)
  @EntityAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update entity' })
  updateEntity(
    @Param('id') id: string,
    @Body() updateEntityDto: UpdateEntityDto,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.entityService.updateEntity(id, updateEntityDto, currentUser);
  }

  @Delete('entities/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @EntityAccess()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete entity (Superadmin only)' })
  deleteEntity(
    @Param('id') id: string,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.entityService.deleteEntity(id, currentUser);
  }

  // Branch Endpoints
  @Post('branches')
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER)
  @EntityAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new branch' })
  @ApiResponse({ status: 201, description: 'Branch created successfully' })
  createBranch(
    @Body() createBranchDto: CreateBranchDto,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.entityService.createBranch(createBranchDto, currentUser);
  }

  @Get('branches')
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all branches' })
  @ApiQuery({ name: 'entityId', required: false })
  findAllBranches(
    @Query('entityId') entityId?: string,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.entityService.findAllBranches(entityId, currentUser);
  }

  @Get('branches/:id')
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get branch by ID' })
  findBranch(@Param('id') id: string, @CurrentUser() currentUser?: JwtPayload) {
    return this.entityService.findBranch(id, currentUser);
  }

  @Patch('branches/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update branch' })
  updateBranch(
    @Param('id') id: string,
    @Body() updateBranchDto: Partial<CreateBranchDto>,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.entityService.updateBranch(id, updateBranchDto, currentUser);
  }

  @Patch('branches/:id/assign-manager/:managerId')
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER)
  @EntityAccess()
  @BranchAccess()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign manager to branch' })
  assignManager(
    @Param('id') id: string,
    @Param('managerId') managerId: string,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.entityService.assignManager(id, managerId, currentUser);
  }

  @Delete('branches/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER)
  @EntityAccess()
  @BranchAccess()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete branch' })
  deleteBranch(
    @Param('id') id: string,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.entityService.deleteBranch(id, currentUser);
  }

  // Table Endpoints (Restaurant-specific)
  @Post('tables')
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new table' })
  @ApiResponse({ status: 201, description: 'Table created successfully' })
  createTable(
    @Body() createTableDto: CreateTableDto,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.entityService.createTable(createTableDto, currentUser);
  }

  @Get('tables')
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all tables' })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TableStatus })
  findAllTables(
    @Query('entityId') entityId?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: TableStatus,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.entityService.findAllTables(
      entityId,
      branchId,
      status,
      currentUser,
    );
  }

  @Get('tables/:id')
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get table by ID' })
  findTable(@Param('id') id: string, @CurrentUser() currentUser?: JwtPayload) {
    return this.entityService.findTable(id, currentUser);
  }

  @Patch('tables/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update table' })
  updateTable(
    @Param('id') id: string,
    @Body() updateTableDto: UpdateTableDto,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.entityService.updateTable(id, updateTableDto, currentUser);
  }

  @Patch('tables/:id/status')
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update table status' })
  updateTableStatus(
    @Param('id') id: string,
    @Body('status') status: TableStatus,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.entityService.updateTableStatus(id, status, currentUser);
  }

  @Delete('tables/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @EntityAccess()
  @BranchAccess()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete table' })
  deleteTable(
    @Param('id') id: string,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.entityService.deleteTable(id, currentUser);
  }

  // Pump Endpoints (Gas Station-specific)
  @Post('pumps')
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @EntityAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new pump' })
  @ApiResponse({ status: 201, description: 'Pump created successfully' })
  createPump(
    @Body() createPumpDto: CreatePumpDto,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.entityService.createPump(createPumpDto, currentUser);
  }

  @Get('pumps')
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all pumps' })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: PumpStatus })
  findAllPumps(
    @Query('entityId') entityId?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: PumpStatus,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.entityService.findAllPumps(
      entityId,
      branchId,
      status,
      currentUser,
    );
  }

  @Get('pumps/:id')
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pump by ID' })
  findPump(@Param('id') id: string, @CurrentUser() currentUser?: JwtPayload) {
    return this.entityService.findPump(id, currentUser);
  }

  @Patch('pumps/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update pump' })
  updatePump(
    @Param('id') id: string,
    @Body() updatePumpDto: UpdatePumpDto,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.entityService.updatePump(id, updatePumpDto, currentUser);
  }

  @Patch('pumps/:id/status')
  @UseGuards(JwtAuthGuard, EntityGuard, BranchGuard)
  @EntityAccess()
  @BranchAccess()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update pump status' })
  @ApiResponse({ status: 200, description: 'Pump status updated successfully' })
  updatePumpStatus(
    @Param('id') id: string,
    @Body('status', new ParseEnumPipe(PumpStatus)) status: PumpStatus,
    @CurrentUser() currentUser?: JwtPayload,
  ) {
    return this.entityService.updatePumpStatus(id, status, currentUser);
  }

  @Delete('pumps/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, EntityGuard, BranchGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ENTITY_OWNER, UserRole.MANAGER)
  @EntityAccess()
  @BranchAccess()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete pump' })
  deletePump(@Param('id') id: string, @CurrentUser() currentUser?: JwtPayload) {
    return this.entityService.deletePump(id, currentUser);
  }
}
