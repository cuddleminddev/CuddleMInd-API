import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import dayjs from 'dayjs';

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

  async getAvailableDoctorsInNext90Mins() {
    const now = new Date();
    const endWindow = dayjs(now).add(90, 'minute').toDate();

    // Get doctors who have no bookings or unavailability in the next 90 minutes
    const busyDoctorIds = await this.prisma.doctorUnavailability.findMany({
      where: {
        OR: [
          {
            startTime: { lte: endWindow },
            endTime: { gte: now },
          },
        ],
      },
      select: { doctorId: true },
    });

    const bookedDoctorIds = await this.prisma.booking.findMany({
      where: {
        scheduledAt: {
          gte: now,
          lte: endWindow,
        },
        status: {
          in: ['pending', 'confirmed'],
        },
      },
      select: { doctorId: true },
    });

    const excludeDoctorIds = [
      ...new Set([
        ...busyDoctorIds.map((d) => d.doctorId),
        ...bookedDoctorIds.map((d) => d.doctorId),
      ]),
    ];

    const availableDoctors = await this.prisma.user.findMany({
      where: {
        role: {
          name: 'doctor',
        },
        id: {
          notIn: excludeDoctorIds,
        },
        status: 'active',
      },
      include: {
        doctorProfile: true,
      },
    });

    return availableDoctors;
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
      include: {
        role: true,
        doctorProfile: true,
        userPlans: {
          include: {
            package: true,
            bookings: true,
          },
        },
        bookingsAsDoctor: {
          include: {
            patient: { select: { id: true, name: true } },
            review: true,
          },
        },
        bookingsAsPatient: {
          include: {
            doctor: { select: { id: true, name: true } },
            review: true,
          },
        },
        doctorReviews: {
          include: {
            patient: { select: { id: true, name: true } },
          },
        },
        patientReviews: {
          include: {
            doctor: { select: { id: true, name: true } },
          },
        },
        transactions: {
          include: {
            booking: true,
            plan: true,
          },
        },
        doctorUnavailabilities: true,
        chatSessionsAsPatient: {
          include: {
            support: { select: { id: true, name: true } },
          },
        },
        chatSessionsAsSupport: {
          include: {
            patient: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    delete user.password;

    const isDoctor = user.role.name === 'doctor';
    const isPatient = user.role.name === 'client';

    const nowUtc = new Date(new Date().toISOString());

    const nextBooking = await this.prisma.booking.findFirst({
      where: {
        ...(isDoctor ? { doctorId: id } : { patientId: id }),
        status: 'confirmed',
        scheduledAt: {
          gt: nowUtc,
        },
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        doctor: { select: { id: true, name: true } },
        patient: { select: { id: true, name: true } },
        userPlan: {
          include: {
            package: true,
          },
        },
      },
    });

    return {
      ...user,
      isDoctor,
      isPatient,
      nextBooking,
    };
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
