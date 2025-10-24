import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from '../database/entities/reservation.entity';
import { AppScheduleService } from './schedule.service';
import { ReservationsService } from 'src/reservations/reservations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation])],
  providers: [AppScheduleService, ReservationsService],
})
export class AppScheduleModule {}
