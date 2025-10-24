import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie } from '../entities/movie.entity';
import { Screen } from '../entities/screen.entity';
import { Seat } from '../entities/seat.entity';
import { Show } from '../entities/show.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Movie, Screen, Seat, Show])],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
