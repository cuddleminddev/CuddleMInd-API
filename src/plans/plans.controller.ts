import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Req,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ResponseService } from 'src/response/response.service';
import { StripeService } from 'src/stripe/stripe.service';
import { PrismaService } from 'src/prisma/prisma.service';

@ApiTags('Plans')
@Controller('plans')
export class PlansController {
  constructor(
    private readonly planService: PlansService,
    private readonly responseService: ResponseService,
    private readonly stripeService: StripeService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all active plans' })
  @ApiResponse({ status: 200, description: 'List of plans' })
  async findAll() {
    const plans = await this.planService.findAll();
    return this.responseService.successResponse(
      'Plans fetched successfully',
      plans,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('purchase')
  async purchasePlan(@Body('packageId') packageId: string, @Req() req: any) {
    const userId = req.user.id;

    const plan = await this.prisma.planPackage.findUnique({
      where: { id: packageId },
    });

    if (!plan) {
      throw new Error('Plan not found');
    }

    const metadata = {
      packageId,
    };

    const secret = await this.stripeService.createPaymentIntent(
      userId,
      Number(plan.amount),
      'plan',
      metadata,
    );
    return this.responseService.successResponse(
      'Sucess proceed to payment',
      secret,
    );
  }

  @Get('paginated')
  @ApiOperation({ summary: 'List active plans with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Paginated list of plans' })
  async findAllPaginated(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const data = await this.planService.findAllPaginated(page, limit);
    return this.responseService.successResponse(
      'Plans fetched successfully',
      data,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plan details by id' })
  async findOne(@Param('id') id: string) {
    const plan = await this.planService.findOne(id);
    return this.responseService.successResponse(
      'Plan fetched successfully',
      plan,
    );
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new plan (admin only)' })
  async create(@Body() createPlanDto: CreatePlanDto) {
    const plan = await this.planService.create(createPlanDto);
    return this.responseService.successResponse(
      'Plan created successfully',
      plan,
    );
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Update an existing plan (admin only)' })
  async update(@Param('id') id: string, @Body() updatePlanDto: UpdatePlanDto) {
    const updatedPlan = await this.planService.update(id, updatePlanDto);
    return this.responseService.successResponse(
      'Plan updated successfully',
      updatedPlan,
    );
  }

  @Patch(':id/deactivate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Deactivate a plan (admin only)' })
  async deactivate(@Param('id') id: string) {
    const result = await this.planService.deactivate(id);
    return this.responseService.successResponse(
      'Plan deactivated successfully',
      result,
    );
  }
}
