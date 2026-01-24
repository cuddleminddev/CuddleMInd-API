import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ContactUsService } from './contact-us.service';
import { CreateContactUsDto } from './dto/create-contact-us.dto';
import { UpdateContactUsDto } from './dto/update-contact-us.dto';
import { ResponseService } from 'src/response/response.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('contact-us')
export class ContactUsController {
  constructor(
    private readonly contactUsService: ContactUsService,
    private readonly responseService: ResponseService,
  ) {}

  @Post()
  async create(@Body() createContactUsDto: CreateContactUsDto) {
    const contactUs = await this.contactUsService.create(createContactUsDto);
    return this.responseService.successResponse(
      'Contact Us submission received successfully',
      contactUs,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  async findAll() {
    const contactUsEntries = await this.contactUsService.findAll();
    return this.responseService.successResponse(
      'Contact Us entries retrieved successfully',
      contactUsEntries,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const contactUs = await this.contactUsService.findOne(id);
    return this.responseService.successResponse(
      'Contact Us entry retrieved successfully',
      contactUs,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateContactUsDto: UpdateContactUsDto,
  ) {
    const contactUs = await this.contactUsService.update(
      id,
      updateContactUsDto,
    );
    return this.responseService.successResponse(
      'Contact Us entry updated successfully',
      contactUs,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const contactUs = await this.contactUsService.remove(id);
    return this.responseService.successResponse(
      'Contact Us entry deleted successfully',
      contactUs,
    );
  }
}
