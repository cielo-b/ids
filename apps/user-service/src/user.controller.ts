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
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  findAll(@Query() query: QueryUserDto) {
    return this.userService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStats() {
    return this.userService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Get('email/:email')
  @ApiOperation({ summary: 'Get user by email' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findByEmail(@Param('email') email: string) {
    return this.userService.findByEmail(email);
  }

  @Get('phone/:phoneNumber')
  @ApiOperation({ summary: 'Get user by phone number' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findByPhoneNumber(@Param('phoneNumber') phoneNumber: string) {
    return this.userService.findByPhoneNumber(phoneNumber);
  }

  @Get('entity/:entityId')
  @ApiOperation({ summary: 'Get users by entity ID' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  getUsersByEntity(@Param('entityId') entityId: string) {
    return this.userService.getUsersByEntity(entityId);
  }

  @Get('role/:role')
  @ApiOperation({ summary: 'Get users by role' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  getUsersByRole(@Param('role') role: string) {
    return this.userService.getUsersByRole(role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Patch(':id/verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify user email' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  verifyEmail(@Param('id') id: string) {
    return this.userService.verifyEmail(id);
  }

  @Patch(':id/verify-phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify user phone' })
  @ApiResponse({ status: 200, description: 'Phone verified successfully' })
  verifyPhone(@Param('id') id: string) {
    return this.userService.verifyPhone(id);
  }

  @Patch(':id/last-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update last login timestamp' })
  @ApiResponse({ status: 200, description: 'Last login updated successfully' })
  updateLastLogin(@Param('id') id: string) {
    return this.userService.updateLastLogin(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}

