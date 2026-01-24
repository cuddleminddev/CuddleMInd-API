import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactUs } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateContactUsDto } from './dto/create-contact-us.dto';
import { UpdateContactUsDto } from './dto/update-contact-us.dto';

@Injectable()
export class ContactUsService {
  constructor(private prisma: PrismaService) {}

  async create(createContactUsDto: CreateContactUsDto): Promise<ContactUs> {
    return this.prisma.contactUs.create({
      data: createContactUsDto,
    });
  }

  async findAll(): Promise<ContactUs[]> {
    return this.prisma.contactUs.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<ContactUs | null> {
    const contactUs = await this.prisma.contactUs.findUnique({
      where: { id },
    });

    if (!contactUs) {
      throw new NotFoundException(`Contact Us entry with id ${id} not found`);
    }

    return contactUs;
  }

  async update(
    id: string,
    updateContactUsDto: UpdateContactUsDto,
  ): Promise<ContactUs> {
    const contactUs = await this.prisma.contactUs.findUnique({
      where: { id },
    });

    if (!contactUs) {
      throw new NotFoundException(`Contact Us entry with id ${id} not found`);
    }

    return this.prisma.contactUs.update({
      where: { id },
      data: updateContactUsDto,
    });
  }

  async remove(id: string): Promise<ContactUs> {
    const contactUs = await this.prisma.contactUs.findUnique({
      where: { id },
    });

    if (!contactUs) {
      throw new NotFoundException(`Contact Us entry with id ${id} not found`);
    }

    return this.prisma.contactUs.delete({
      where: { id },
    });
  }
}
