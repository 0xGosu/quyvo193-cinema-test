import { Module } from '@nestjs/common';
import { ScreensService } from './screens.service';
import { ScreensController } from './screens.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Screen } from '../database/entities/screen.entity';
import { Seat } from '../database/entities/seat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Screen, Seat])],
  controllers: [ScreensController],
  providers: [ScreensService],
})
export class ScreensModule {}
