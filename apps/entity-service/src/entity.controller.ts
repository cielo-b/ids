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
} from '@nestjs/common';
import { EntityService } from './entity.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { EntityCategory } from '@app/common';

@ApiTags('Entities')
@Controller()
export class EntityController {
  constructor(private readonly entityService: EntityService) {}

  // Entity Endpoints
  @Post('entities')
  @ApiOperation({ summary: 'Create a new entity' })
  @ApiResponse({ status: 201, description: 'Entity created successfully' })
  createEntity(@Body() createEntityDto: CreateEntityDto) {
    return this.entityService.createEntity(createEntityDto);
  }

  @Get('entities')
  @ApiOperation({ summary: 'Get all entities' })
  @ApiQuery({ name: 'category', required: false, enum: EntityCategory })
  @ApiQuery({ name: 'ownerId', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  findAllEntities(
    @Query('category') category?: EntityCategory,
    @Query('ownerId') ownerId?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.entityService.findAllEntities(category, ownerId, isActive);
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
  @ApiOperation({ summary: 'Get entity by ID' })
  findEntity(@Param('id') id: string) {
    return this.entityService.findEntity(id);
  }

  @Patch('entities/:id')
  @ApiOperation({ summary: 'Update entity' })
  updateEntity(
    @Param('id') id: string,
    @Body() updateEntityDto: UpdateEntityDto,
  ) {
    return this.entityService.updateEntity(id, updateEntityDto);
  }

  @Delete('entities/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete entity' })
  deleteEntity(@Param('id') id: string) {
    return this.entityService.deleteEntity(id);
  }

  // Branch Endpoints
  @Post('branches')
  @ApiOperation({ summary: 'Create a new branch' })
  @ApiResponse({ status: 201, description: 'Branch created successfully' })
  createBranch(@Body() createBranchDto: CreateBranchDto) {
    return this.entityService.createBranch(createBranchDto);
  }

  @Get('branches')
  @ApiOperation({ summary: 'Get all branches' })
  @ApiQuery({ name: 'entityId', required: false })
  findAllBranches(@Query('entityId') entityId?: string) {
    return this.entityService.findAllBranches(entityId);
  }

  @Get('branches/:id')
  @ApiOperation({ summary: 'Get branch by ID' })
  findBranch(@Param('id') id: string) {
    return this.entityService.findBranch(id);
  }

  @Patch('branches/:id')
  @ApiOperation({ summary: 'Update branch' })
  updateBranch(
    @Param('id') id: string,
    @Body() updateBranchDto: Partial<CreateBranchDto>,
  ) {
    return this.entityService.updateBranch(id, updateBranchDto);
  }

  @Patch('branches/:id/assign-manager/:managerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign manager to branch' })
  assignManager(
    @Param('id') id: string,
    @Param('managerId') managerId: string,
  ) {
    return this.entityService.assignManager(id, managerId);
  }

  @Delete('branches/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete branch' })
  deleteBranch(@Param('id') id: string) {
    return this.entityService.deleteBranch(id);
  }
}
