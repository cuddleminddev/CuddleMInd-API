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
import { diskStorage } from 'multer';
import { extname } from 'path';

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
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueName = `${Date.now()}-${Math.round(
            Math.random() * 1e9,
          )}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
    }),
  )
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateBannerDto,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const imageUrl = `/uploads/${file.filename}`;
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
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueName = `${Date.now()}-${Math.round(
            Math.random() * 1e9,
          )}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
    }),
  )
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
      updateData.imageUrl = `/uploads/${file.filename}`;
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
