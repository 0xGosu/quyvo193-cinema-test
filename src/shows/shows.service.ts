import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Show } from '../database/entities/show.entity';
import { MoreThan, Repository } from 'typeorm';
import { CreateShowDto } from './dto/create-show.dto';
import { Movie } from '../database/entities/movie.entity';
import { Screen } from '../database/entities/screen.entity';
import { GetShowDto } from './dto/get-show.dto';

@Injectable()
export class ShowsService {
  constructor(
    @InjectRepository(Show)
    private showsRepository: Repository<Show>,
    @InjectRepository(Movie)
    private moviesRepository: Repository<Movie>,
    @InjectRepository(Screen)
    private screensRepository: Repository<Screen>,
  ) {}

  async create(createShowDto: CreateShowDto): Promise<Show> {
    const { movieId, screenId, startTime, duration, ...rest } = createShowDto;

    const movie = await this.moviesRepository.findOneBy({ id: movieId });
    if (!movie) {
      throw new NotFoundException(`Movie with ID ${movieId} not found`);
    }

    const screen = await this.screensRepository.findOneBy({ id: screenId });
    if (!screen) {
      throw new NotFoundException(`Screen with ID ${screenId} not found`);
    }

    // Convert to Date object
    const newShowStartTime = new Date(startTime);
    const newShowEndTime = new Date(
      newShowStartTime.getTime() + duration * 60000,
    ); // duration in minutes to milliseconds

    // Additional validation: Check if show is in the future
    if (newShowStartTime <= new Date()) {
      throw new BadRequestException('Show start time must be in the future');
    }
    const existingShows = await this.showsRepository.find({
      where: {
        screen: { id: screenId },
        startTime: MoreThan(new Date()),
      },
      relations: ['movie'],
    });

    // Check for conflicts manually
    for (const existingShow of existingShows) {
      const existingShowEndTime = new Date(
        existingShow.startTime.getTime() + existingShow.duration * 60000,
      );

      const hasConflict =
        (newShowStartTime >= existingShow.startTime &&
          newShowStartTime < existingShowEndTime) || // New show starts during existing
        (newShowEndTime > existingShow.startTime &&
          newShowEndTime <= existingShowEndTime) || // New show ends during existing
        (newShowStartTime <= existingShow.startTime &&
          newShowEndTime >= existingShowEndTime); // New show completely overlaps existing

      if (hasConflict) {
        throw new ConflictException(
          `Time conflict with show for "${existingShow.movie.title}" at ${existingShow.startTime}`,
        );
      }
    }

    const show = this.showsRepository.create({
      ...rest,
      startTime: newShowStartTime,
      duration,
      movie,
      screen,
    });

    return this.showsRepository.save(show);
  }

  findAllOfMovie(getShowDto: GetShowDto): Promise<Show[]> {
    return this.showsRepository.find({
      where: { movie: { id: getShowDto.movieId } },
      relations: ['movie', 'screen'],
    });
  }

  findOne(id: string): Promise<Show | null> {
    return this.showsRepository.findOne({
      where: { id },
      relations: ['movie', 'screen'],
    });
  }

  async getShowSeatsWithStatus(showId: string) {
    const show = await this.showsRepository.findOne({
      where: { id: showId },
      relations: ['screen', 'screen.seats'],
    });

    if (!show) {
      throw new NotFoundException('Show not found');
    }

    // Get reserved seats for this show
    const reservedSeats = await this.showsRepository.manager
      .createQueryBuilder(Show, 'show')
      .where('show.id = :showId', { showId })
      .innerJoin('show.reservations', 'reservation')
      .innerJoin('reservation.reservedSeats', 'reservedSeat')
      .innerJoin('reservedSeat.seat', 'seat')
      .andWhere('reservation.status IN (:...statuses)', {
        statuses: ['PENDING', 'CONFIRMED'],
      })
      .select(['seat.id as seat_id'])
      .getRawMany();

    const reservedSeatIds = reservedSeats.map((seat) => seat.seat_id);

    const availableSeats = show.screen.seats.map((seat) => {
      if (reservedSeatIds.includes(seat.id)) {
        return { ...seat, status: 'RESERVED' };
      }
      return { ...seat, status: 'AVAILABLE' };
    });

    return {
      show: {
        id: show.id,
        movie: show.movie,
        screen: show.screen.name,
        startTime: show.startTime,
        duration: show.duration,
      },
      totalSeats: show.screen.seats.length,
      reservedSeats: reservedSeatIds.length,
      availableSeats: availableSeats.length,
      seats: availableSeats,
    };
  }
}
