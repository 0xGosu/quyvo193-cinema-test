import { Module } from '@nestjs/common';
import { ShowsService } from './shows.service';
import { ShowsController } from './shows.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Show } from '../database/entities/show.entity';
import { Movie } from '../database/entities/movie.entity';
import { Screen } from '../database/entities/screen.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Show, Movie, Screen])],
  controllers: [ShowsController],
  providers: [ShowsService],
})
export class ShowsModule {}
