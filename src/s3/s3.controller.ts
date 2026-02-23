import {
  Controller,
  Post,
  Delete,
  Body,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { S3Service } from './s3.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UploadResponseDto } from './dto/upload-response.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('S3')
@Controller('s3')
export class S3Controller {
  constructor(private readonly s3Service: S3Service) { }

  /**
   * Upload a single image
   * POST /s3/upload
   */
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.s3Service.uploadFile(file, folder || 'products');
  }

  /**
   * Upload multiple images
   * POST /s3/upload-multiple
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folder') folder?: string,
  ): Promise<UploadResponseDto[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    return this.s3Service.uploadMultipleFiles(files, folder || 'products');
  }

  /**
   * Delete a file from S3
   * DELETE /s3/delete
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('delete')
  async deleteFile(@Body('key') key: string): Promise<{ message: string }> {
    if (!key) {
      throw new BadRequestException('File key is required');
    }
    await this.s3Service.deleteFile(key);
    return { message: 'File deleted successfully' };
  }

  /**
   * Delete multiple files from S3
   * DELETE /s3/delete-multiple
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('delete-multiple')
  async deleteMultipleFiles(
    @Body('keys') keys: string[],
  ): Promise<{ message: string }> {
    if (!keys || keys.length === 0) {
      throw new BadRequestException('File keys are required');
    }
    await this.s3Service.deleteMultipleFiles(keys);
    return { message: 'Files deleted successfully' };
  }
}
