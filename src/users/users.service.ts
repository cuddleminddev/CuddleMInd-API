import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

export interface FindAllOptions {
  page: number;
  limit: number;
  name?: string;
  email?: string;
  role?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { name, email, phone, password, role } = createUserDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) throw new ConflictException('Email already in use');

    const roleEntity = await this.prisma.role.findUnique({
      where: { name: role },
    });
    if (!roleEntity) throw new NotFoundException('Role not found');

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        roleId: roleEntity.id,
      },
      include: { role: true },
    });

    delete user.password;
    return user;
  }

  async findAll(options: FindAllOptions) {
    const { page, limit, name, email, role } = options;

    const where: any = {};
    if (name) where.name = { contains: name, mode: 'insensitive' };
    if (email) where.email = { contains: email, mode: 'insensitive' };
    if (role) {
      where.role = {
        name: {
          contains: role,
        },
      };
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByRole(roleName: string) {
    const users = await this.prisma.user.findMany({
      where: { role: { name: roleName } },
      include: { role: true },
    });
    return users.map(({ password, ...user }) => user);
  }

  async findallroles() {
    return this.prisma.role.findMany({
      select: { id: true, name: true },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    delete user.password;
    return user;
  }

  async findOrCreateUser(data: {
    email: string;
    name: string;
    role: string;
    phone?: string;
  }) {
    let user = await this.findByEmail(data.email);
    if (!user) user = await this.create(data);
    return user;
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
    if (user) delete user.password;
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id); // Ensures user exists

    const updateData: any = { ...updateUserDto };

    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });

    delete updatedUser.password;
    return updatedUser;
  }

  async remove(id: string) {
    await this.findOne(id); // Ensures user exists
    await this.prisma.user.delete({ where: { id } });
    return { message: `User with ID ${id} deleted successfully` };
  }
}
