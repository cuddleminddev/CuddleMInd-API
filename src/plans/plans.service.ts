import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

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
}
