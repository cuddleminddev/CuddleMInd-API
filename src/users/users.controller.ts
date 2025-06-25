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
  HttpStatus,
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
  async create(@Body() createUserDto: CreateUserDto) {
    try {
      const user = await this.usersService.create(createUserDto);
      const { password: _, ...sanitizedUser } = user;
      return this.responseService.successResponse(
        'User Created Successfully',
        sanitizedUser,
      );
    } catch (err) {
      return this.responseService.errorResponse(
        err.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get all users (admin only)' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('name') name?: string,
    @Query('email') email?: string,
    @Query('role') role?: string,
  ) {
    try {
      const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        name,
        email,
        role,
      };
      const result = await this.usersService.findAll(options);
      return this.responseService.successResponse('Users Found', result);
    } catch (err) {
      return this.responseService.errorResponse(
        err.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('doctors')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  @ApiOperation({ summary: 'Get all doctor users' })
  async findAvailableDoctors() {
    try {
      const staff = await this.usersService.getAvailableDoctorsInNext90Mins();
      return this.responseService.successResponse('Doctors Found', staff);
    } catch (err) {
      return this.responseService.errorResponse(
        err.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('staff')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get all staff users (admin only)' })
  async findAllStaff() {
    try {
      const staff = await this.usersService.findByRole('staff');
      return this.responseService.successResponse('Staff Found', staff);
    } catch (err) {
      return this.responseService.errorResponse(
        err.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req) {
    try {
      const user = await this.usersService.findOne(req.user.id);
      return this.responseService.successResponse('User Profile', user);
    } catch (err) {
      return this.responseService.errorResponse(
        err.message,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Get('roles')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get all available roles (Admin only)' })
  async getRoles() {
    try {
      const roles = await this.usersService.findallroles();
      return this.responseService.successResponse(
        'Roles fetched successfully',
        roles,
      );
    } catch (err) {
      return this.responseService.errorResponse(
        err.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  async findOne(@Param('id') id: string) {
    try {
      const user = await this.usersService.findOne(id);
      return this.responseService.successResponse('User Found', user);
    } catch (err) {
      return this.responseService.errorResponse(
        err.message,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    try {
      const user = await this.usersService.update(req.user.id, updateUserDto);
      return this.responseService.successResponse('Profile Updated', user);
    } catch (err) {
      return this.responseService.errorResponse(
        err.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Update user by ID (admin only)' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    try {
      const user = await this.usersService.update(id, updateUserDto);
      return this.responseService.successResponse('User Updated', user);
    } catch (err) {
      return this.responseService.errorResponse(
        err.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Delete user by ID (admin only)' })
  async remove(@Param('id') id: string) {
    try {
      const result = await this.usersService.remove(id);
      return this.responseService.successResponse('User Deleted', result);
    } catch (err) {
      return this.responseService.errorResponse(
        err.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
