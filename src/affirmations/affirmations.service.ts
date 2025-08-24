import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Affirmation } from '@prisma/client';

@Injectable()
export class AffirmationsService {
  constructor(private prisma: PrismaService) {}

  async getRandomAffirmation(): Promise<Affirmation | null> {
    // Get count of active affirmations
    const count = await this.prisma.affirmation.count({
      where: { isActive: true },
    });

    if (count === 0) {
      return null;
    }

    // Generate random index
    const randomIndex = Math.floor(Math.random() * count);

    // Get random affirmation using skip
    const affirmation = await this.prisma.affirmation.findFirst({
      where: { isActive: true },
      skip: randomIndex,
    });

    return affirmation;
  }

  async getAllAffirmations(): Promise<Affirmation[]> {
    return this.prisma.affirmation.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllAffirmationsForAdmin(): Promise<Affirmation[]> {
    return this.prisma.affirmation.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAffirmationById(id: string): Promise<Affirmation | null> {
    return this.prisma.affirmation.findUnique({
      where: { id },
    });
  }

  async createAffirmation(data: {
    quote: string;
    author: string;
    backgroundImage: string;
  }): Promise<Affirmation> {
    return this.prisma.affirmation.create({
      data,
    });
  }

  async updateAffirmation(
    id: string,
    data: {
      quote?: string;
      author?: string;
      backgroundImage?: string;
      isActive?: boolean;
    },
  ): Promise<Affirmation> {
    return this.prisma.affirmation.update({
      where: { id },
      data,
    });
  }

  async deleteAffirmation(id: string): Promise<Affirmation> {
    return this.prisma.affirmation.delete({
      where: { id },
    });
  }
}
