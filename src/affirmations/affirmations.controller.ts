import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  NotFoundException,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { AffirmationsService } from './affirmations.service';
import { ResponseService } from 'src/response/response.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CreateAffirmationDto, UpdateAffirmationDto } from './dto';

@ApiTags('affirmations')
@Controller('affirmations')
export class AffirmationsController {
  constructor(
    private readonly affirmationsService: AffirmationsService,
    private readonly responseService: ResponseService,
  ) {}

  @Get('daily')
  @ApiOperation({ summary: 'Get a random daily affirmation' })
  @ApiResponse({
    status: 200,
    description: 'Random daily affirmation retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'No active affirmations found',
  })
  async getDailyAffirmation() {
    const affirmation = await this.affirmationsService.getRandomAffirmation();

    if (!affirmation) {
      throw new NotFoundException(
        'No active affirmations found. Please add some affirmations to the database.',
      );
    }

    return this.responseService.successResponse(
      'Daily affirmation retrieved successfully',
      affirmation,
    );
  }

  // Admin CRUD Operations
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  @ApiOperation({ summary: 'Get all affirmations (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'All affirmations retrieved successfully',
  })
  async getAllAffirmations() {
    const affirmations =
      await this.affirmationsService.getAllAffirmationsForAdmin();
    const activeCount = affirmations.filter((a) => a.isActive).length;
    const inactiveCount = affirmations.length - activeCount;

    return this.responseService.successResponse(
      'All affirmations retrieved successfully',
      {
        total: affirmations.length,
        active: activeCount,
        inactive: inactiveCount,
        affirmations,
      },
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get(':id')
  @ApiOperation({ summary: 'Get affirmation by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Affirmation ID' })
  @ApiResponse({
    status: 200,
    description: 'Affirmation retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Affirmation not found',
  })
  async getAffirmationById(@Param('id') id: string) {
    const affirmation = await this.affirmationsService.getAffirmationById(id);

    if (!affirmation) {
      throw new NotFoundException('Affirmation not found');
    }

    return this.responseService.successResponse(
      'Affirmation retrieved successfully',
      affirmation,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  @ApiOperation({ summary: 'Create new affirmation (Admin only)' })
  @ApiBody({ type: CreateAffirmationDto })
  @ApiResponse({
    status: 201,
    description: 'Affirmation created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  async createAffirmation(@Body() createAffirmationDto: CreateAffirmationDto) {
    try {
      const affirmation =
        await this.affirmationsService.createAffirmation(createAffirmationDto);
      return this.responseService.successResponse(
        'Affirmation created successfully',
        affirmation,
      );
    } catch (error) {
      throw new BadRequestException(
        'Failed to create affirmation: ' + error.message,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id')
  @ApiOperation({ summary: 'Update affirmation (Admin only)' })
  @ApiParam({ name: 'id', description: 'Affirmation ID' })
  @ApiBody({ type: UpdateAffirmationDto })
  @ApiResponse({
    status: 200,
    description: 'Affirmation updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Affirmation not found',
  })
  async updateAffirmation(
    @Param('id') id: string,
    @Body() updateAffirmationDto: UpdateAffirmationDto,
  ) {
    try {
      const affirmation = await this.affirmationsService.updateAffirmation(
        id,
        updateAffirmationDto,
      );
      return this.responseService.successResponse(
        'Affirmation updated successfully',
        affirmation,
      );
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Affirmation not found');
      }
      throw new BadRequestException(
        'Failed to update affirmation: ' + error.message,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete affirmation (Admin only)' })
  @ApiParam({ name: 'id', description: 'Affirmation ID' })
  @ApiResponse({
    status: 200,
    description: 'Affirmation deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Affirmation not found',
  })
  async deleteAffirmation(@Param('id') id: string) {
    try {
      const affirmation = await this.affirmationsService.deleteAffirmation(id);
      return this.responseService.successResponse(
        'Affirmation deleted successfully',
        {
          deletedId: id,
          deletedAffirmation: affirmation,
        },
      );
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Affirmation not found');
      }
      throw new BadRequestException(
        'Failed to delete affirmation: ' + error.message,
      );
    }
  }
}
