import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Seat } from 'src/database/entities/seat.entity';
import { Show } from 'src/database/entities/show.entity';
import { ReservedSeat } from 'src/database/entities/reserved-seat.entity';
import { Movie } from 'src/database/entities/movie.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Movie, ReservedSeat, Show, Seat])],
  controllers: [ReportingController],
  providers: [ReportingService],
})
export class ReportingModule {}
