import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from '../database/entities/reservation.entity';
import { Show } from '../database/entities/show.entity';
import { Seat } from '../database/entities/seat.entity';
import { ReservedSeat } from '../database/entities/reserved-seat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, ReservedSeat, Show, Seat])],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
