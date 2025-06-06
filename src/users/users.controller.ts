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
import { Public } from '../auth/decorators/public.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { ResponseService } from 'src/response/response.service';

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
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return this.responseService.successResponse(
      'User Created Successfully',
      user,
    );
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findAll(@Query('role') role?: string) {
    const users = role
      ? await this.usersService.findByRole(role)
      : await this.usersService.findAll();
    return this.responseService.successResponse('Users Found', users);
  }

  @Get('roles')
  @Public()
  async getRoles() {
    const roles = await this.usersService.findallroles();
    return this.responseService.successResponse('Roles Found', roles);
  }

  @Get('staff')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findAllStaff() {
    const staff = await this.usersService.findByRole('staff');
    return this.responseService.successResponse('Staff Found', staff);
  }

  @Get('profile')
  async getProfile(@Request() req) {
    const user = await this.usersService.findOne(req.user.id);
    return this.responseService.successResponse('User Profile', user);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return this.responseService.successResponse('User Found', user);
  }

  @Patch('profile')
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(req.user.id, updateUserDto);
    return this.responseService.successResponse('Profile Updated', user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    return this.responseService.successResponse('User Updated', user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: string) {
    const result = await this.usersService.remove(id);
    return this.responseService.successResponse('User Deleted', result);
  }
}