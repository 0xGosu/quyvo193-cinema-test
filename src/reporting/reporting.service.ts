import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ReservationStatus } from '../common/enums/reservation-status.enum';
import { Movie } from 'src/database/entities/movie.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ReservedSeat } from 'src/database/entities/reserved-seat.entity';
import { Show } from 'src/database/entities/show.entity';
import { Seat } from 'src/database/entities/seat.entity';

// movie-reporting.dto.ts
export class MovieReportingDto {
  movie: {
    id: string;
    title: string;
  };
  shows: ShowSeatInfoDto[];
  totalTicketsSold: number;
}

// show-seat-info.dto.ts
export class ShowSeatInfoDto {
  id: string;
  screen: {
    id: string;
    name: string;
  };
  startTime: Date;
  totalSeats: number;
  soldTickets: number;
  remainingSeats: number;
}

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(Movie)
    private movieRepository: Repository<Movie>,

    @InjectRepository(ReservedSeat)
    private reservedRepository: Repository<ReservedSeat>,

    @InjectRepository(Show)
    private showRepository: Repository<Show>,

    @InjectRepository(Seat)
    private seatsRepository: Repository<Seat>,
  ) {}
  async getReport(): Promise<MovieReportingDto[]> {
    // Step 1: Get all movies from database
    const allMovies = await this.movieRepository.find({
      select: ['id', 'title'],
    });

    const result: MovieReportingDto[] = [];

    // Step 2: Check each movie for ticket sales
    for (const movie of allMovies) {
      // Step 3: Get total tickets sold for this movie
      const totalTicketsSold = await this.reservedRepository
        .createQueryBuilder('reservedSeat')
        .innerJoin('reservedSeat.reservation', 'reservation')
        .innerJoin('reservation.show', 'show')
        .where('show.movieId = :movieId', { movieId: movie.id })
        .andWhere('reservation.status = :status', {
          status: ReservationStatus.CONFIRMED,
        })
        .getCount();

      // Step 4: Only include movies with at least 1 ticket sold
      if (totalTicketsSold > 0) {
        // Step 5: Get shows for this movie with seat information
        const shows = await this.showRepository.find({
          where: { movie: { id: movie.id } },
          relations: ['screen'],
        });

        const showsWithSeatInfo = [];

        for (const show of shows) {
          // Get seat information for each show
          const totalSeats = await this.seatsRepository.count({
            where: { screen: { id: show.screen.id } },
          });

          const soldTicketsForShow = await this.reservedRepository
            .createQueryBuilder('reservedSeat')
            .innerJoin('reservedSeat.reservation', 'reservation')
            .where('reservation.showId = :showId', { showId: show.id })
            .andWhere('reservation.status = :status', {
              status: ReservationStatus.CONFIRMED,
            })
            .getCount();

          const remainingSeats = totalSeats - soldTicketsForShow;

          // Only include shows that have ticket sales
          if (soldTicketsForShow > 0) {
            showsWithSeatInfo.push({
              id: show.id,
              screen: {
                id: show.screen.id,
                name: show.screen.name,
              },
              startTime: show.startTime,
              totalSeats,
              soldTickets: soldTicketsForShow,
              remainingSeats,
            });
          }
        }

        // Add to result if the movie has shows with ticket sales
        if (showsWithSeatInfo.length > 0) {
          result.push({
            movie: {
              id: movie.id,
              title: movie.title,
            },
            shows: showsWithSeatInfo,
            totalTicketsSold,
          });
        }
      }
    }

    return result;
  }
}
