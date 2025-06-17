import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UserPlan } from '@prisma/client';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPlanDto: CreatePlanDto) {
    return this.prisma.planPackage.create({
      data: createPlanDto,
    });
  }

  async findAll() {
    return this.prisma.planPackage.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllPaginated(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [plans, total] = await this.prisma.$transaction([
      this.prisma.planPackage.findMany({
        where: { isActive: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.planPackage.count({ where: { isActive: true } }),
    ]);
    return {
      plans,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const plan = await this.prisma.planPackage.findUnique({
      where: { id },
    });
    if (!plan || !plan.isActive) {
      throw new NotFoundException('Plan not found');
    }
    return plan;
  }

  async update(id: string, updatePlanDto: UpdatePlanDto) {
    const plan = await this.prisma.planPackage.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    return this.prisma.planPackage.update({
      where: { id },
      data: updatePlanDto,
    });
  }

  async deactivate(id: string) {
    const plan = await this.prisma.planPackage.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    return this.prisma.planPackage.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async createInactiveUserPlan(userId: string, packageId: string) {
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1);

    const userPlan = await this.prisma.userPlan.create({
      data: {
        patientId: userId,
        packageId,
        startDate: start,
        endDate: end,
        isActive: false,
        bookingsPending: 4, // Or dynamic based on plan
      },
    });

    return userPlan.id;
  }

  async findActivePlansByUserId(userId: string) {
    return this.prisma.userPlan.findMany({
      where: {
        patientId: userId,
        isActive: true,
      },
      include: { package: true },
    });
  }

  async assignPlanToUser(userId: string, packageId: string): Promise<UserPlan> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const plan = await this.prisma.planPackage.findUnique({
      where: { id: packageId },
    });

    if (!user || !plan) throw new NotFoundException('User or Plan not found');

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + plan.timePeriod);

    const userPlan = await this.prisma.userPlan.create({
      data: {
        patientId: userId,
        packageId,
        bookingsPending: plan.bookingFrequency,
        startDate,
        endDate,
        isActive: true,
      },
    });

    await this.prisma.transaction.create({
      data: {
        userId,
        planId: packageId,
        amount: plan.amount,
        status: 'success',
        paymentType: 'plan',
        remainingUses: plan.bookingFrequency,
      },
    });

    return userPlan;
  }
}
