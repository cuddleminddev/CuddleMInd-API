import { Module } from '@nestjs/common';
import { MoodSupportController } from './mood-support.controller';
import { MoodSupportService } from './mood-support.service';
import { ResponseModule } from 'src/response/response.module';

@Module({
  imports: [ResponseModule],
  controllers: [MoodSupportController],
  providers: [MoodSupportService],
  exports: [MoodSupportService],
})
export class MoodSupportModule {}
