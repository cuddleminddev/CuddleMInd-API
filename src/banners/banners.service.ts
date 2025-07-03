import { Injectable, NotFoundException } from '@nestjs/common';
import { Banner } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BannersService {
  constructor(private prisma: PrismaService) {}

  private buildImageUrl(relativePath: string): string {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}${relativePath}`;
  }

  async create(data: { title: string; linkUrl?: string; imageUrl: string }) {
    return this.prisma.banner.create({ data });
  }

  async findAll(): Promise<Banner[]> {
    const banners = await this.prisma.banner.findMany();
    return banners.map((banner) => ({
      ...banner,
      imageUrl: this.buildImageUrl(banner.imageUrl),
    }));
  }

  async findOne(id: string): Promise<Banner | null> {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) return null;

    return {
      ...banner,
      imageUrl: this.buildImageUrl(banner.imageUrl),
    };
  }

  async update(id: string, data: Partial<Banner>) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });

    if (!banner) {
      throw new NotFoundException(`Banner with id ${id} not found`);
    }

    // If a new image is uploaded, delete the old one
    if (data.imageUrl && banner.imageUrl !== data.imageUrl) {
      const oldImagePath = banner.imageUrl.startsWith('/uploads/')
        ? banner.imageUrl
        : new URL(banner.imageUrl).pathname;

      const fullPath = path.join(__dirname, '..', '..', oldImagePath);
      try {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (err) {
        console.warn(
          `⚠️ Failed to delete old image file: ${fullPath}`,
          err.message,
        );
      }
    }

    return this.prisma.banner.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });

    if (!banner) {
      throw new NotFoundException(`Banner with id ${id} not found`);
    }

    // Extract image filename from the relative URL
    const imagePath = banner.imageUrl.startsWith('/uploads/')
      ? banner.imageUrl
      : new URL(banner.imageUrl).pathname;

    const fullPath = path.join(__dirname, '..', '..', imagePath);

    // Delete the file if it exists
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (err) {
      console.warn(`⚠️ Failed to delete file: ${fullPath}`, err.message);
    }

    return this.prisma.banner.delete({ where: { id } });
  }
}
