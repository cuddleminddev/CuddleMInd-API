import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ResponseService } from 'src/response/response.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly responseService: ResponseService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new user (admin only)' })
  @ApiResponse({ status: 201, description: 'User Created Successfully' })
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    const { password: _, ...sanitizedUser } = user;
    return this.responseService.successResponse(
      'User Created Successfully',
      sanitizedUser,
    );
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get all users (admin only)' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by role' })
  @ApiResponse({ status: 200, description: 'Users Found' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('name') name?: string,
    @Query('email') email?: string,
    @Query('role') role?: string,
  ) {
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      name,
      email,
      role,
    };
    const result = await this.usersService.findAll(options);
    return this.responseService.successResponse('Users Found', result);
  }

  @Get('doctors')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  @ApiOperation({ summary: 'Get all doctor users' })
  @ApiResponse({ status: 200, description: 'Doctors Found' })
  async findAvailableDoctors() {
    const staff = await this.usersService.getAvailableDoctorsInNext90Mins();
    return this.responseService.successResponse('Doctors Found', staff);
  }

  @Get('staff')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get all staff users (admin only)' })
  @ApiResponse({ status: 200, description: 'Staff Found' })
  async findAllStaff() {
    const staff = await this.usersService.findByRole('staff');
    return this.responseService.successResponse('Staff Found', staff);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User Profile' })
  async getProfile(@Request() req) {
    const user = await this.usersService.findOne(req.user.id);
    return this.responseService.successResponse('User Profile', user);
  }

  @Get('roles')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get all available roles (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'List of available roles',
    schema: {
      example: {
        status: true,
        message: 'Roles fetched successfully',
        data: [
          {
            id: '421671c8-657f-433c-9361-1784b8fc378b',
            name: 'admin',
          },
          {
            id: 'c02a95c3-f27c-49a2-bc94-f20ca0a21d07',
            name: 'client',
          },
          {
            id: 'a98c5d46-a984-49eb-94df-450aa0eeb763',
            name: 'doctor',
          },
          {
            id: 'e6104795-3b8d-4f43-a09f-06db7b46ce5d',
            name: 'staff',
          },
        ],
      },
    },
  })
  async getRoles() {
    const roles = await this.usersService.findallroles();
    return this.responseService.successResponse(
      'Roles fetched successfully',
      roles,
    );
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'User Found' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return this.responseService.successResponse('User Found', user);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile Updated' })
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(req.user.id, updateUserDto);
    return this.responseService.successResponse('Profile Updated', user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Update user by ID (admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'User Updated' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    return this.responseService.successResponse('User Updated', user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Delete user by ID (admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'User Deleted' })
  async remove(@Param('id') id: string) {
    const result = await this.usersService.remove(id);
    return this.responseService.successResponse('User Deleted', result);
  }
}
