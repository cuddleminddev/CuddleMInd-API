import {
  Controller,
  Post,
  Delete,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { ResponseService } from '../response/response.service';
import { SetFcmTokenDto } from './dto/set-fcm-token.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly responseService: ResponseService,
  ) {}

  /**
   * POST /v1/notifications/fcm-token
   * Save or update the FCM push-notification token for the authenticated user.
   */
  @Post('fcm-token')
  @ApiOperation({
    summary: 'Register / update FCM push token',
    description:
      'Store the device FCM token so the server can send push notifications to this user. ' +
      'Call this every time the app starts or when the FCM token is refreshed.',
  })
  @ApiResponse({ status: 201, description: 'FCM token saved successfully' })
  async setFcmToken(@Request() req, @Body() dto: SetFcmTokenDto) {
    await this.notificationsService.setFcmToken(req.user.id, dto.fcmToken);
    return this.responseService.successResponse('FCM token saved successfully', {
      userId: req.user.id,
    });
  }

  /**
   * DELETE /v1/notifications/fcm-token
   * Remove the FCM token (e.g. on logout / account switch).
   */
  @Delete('fcm-token')
  @ApiOperation({
    summary: 'Remove FCM push token',
    description:
      'Clear the stored FCM token for the authenticated user. ' +
      'Call this on logout so the user no longer receives push notifications on this device.',
  })
  @ApiResponse({ status: 200, description: 'FCM token removed' })
  async removeFcmToken(@Request() req) {
    await this.notificationsService.removeFcmToken(req.user.id);
    return this.responseService.successResponse('FCM token removed', {
      userId: req.user.id,
    });
  }
}
