import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from 'src/s3/s3.service';

import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { ResponseService } from 'src/response/response.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('banners')
export class BannersController {
  constructor(
    private readonly bannersService: BannersService,
    private readonly responseService: ResponseService,
    private readonly s3Service: S3Service,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateBannerDto,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    // Upload image to S3
    const uploadResult = await this.s3Service.uploadFile(file, 'banners');
    const imageUrl = uploadResult.url;

    const banner = await this.bannersService.create({
      ...body,
      imageUrl,
    });

    return this.responseService.successResponse(
      'Banner created successfully',
      banner,
    );
  }

  @Get()
  async findAll() {
    const banners = await this.bannersService.findAll();
    return this.responseService.successResponse('Banners retrieved', banners);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const banner = await this.bannersService.findOne(id);
    if (!banner) {
      throw new NotFoundException('banner not found');
    }
    return this.responseService.successResponse('Banner retrieved', banner);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title?: string; linkUrl?: string },
  ) {
    const updateData: any = {
      title: body.title,
      linkUrl: body.linkUrl,
    };

    if (file) {
      // Upload new image to S3
      const uploadResult = await this.s3Service.uploadFile(file, 'banners');
      updateData.imageUrl = uploadResult.url;
    }

    const banner = await this.bannersService.update(id, updateData);
    return this.responseService.successResponse('Banner updated', banner);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deleted = await this.bannersService.remove(id);
    return this.responseService.successResponse('Banner deleted', deleted);
  }
}
