import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Movie } from '../entities/movie.entity';
import { Repository } from 'typeorm';
import { Screen } from '../entities/screen.entity';
import { Show } from '../entities/show.entity';
import { SeatType } from '../../common/enums/seat-type.enum';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(Movie) private movieRepo: Repository<Movie>,
    @InjectRepository(Screen) private screenRepo: Repository<Screen>,
    @InjectRepository(Show) private showRepo: Repository<Show>,
  ) {}

  async seed() {
    await this.seedMovies();
    await this.seedScreens();
    await this.seedShows();
    return { message: 'Database seeded successfully' };
  }

  async seedMovies() {
    const movies = [
      {
        title: 'The Matrix',
        description:
          'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.',
        duration: 136,
      },
      {
        title: 'Dune: Part Two',
        description:
          'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
        duration: 166,
      },
      {
        title: 'Inception',
        description:
          'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
        duration: 148,
      },
      {
        title: 'The Dark Knight',
        description:
          'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
        duration: 152,
      },
      {
        title: 'Interstellar',
        description:
          "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
        duration: 169,
      },
      {
        title: 'Avengers: Endgame',
        description:
          "After the devastating events of Infinity War, the Avengers assemble once more to reverse Thanos' actions and restore balance to the universe.",
        duration: 181,
      },
      {
        title: 'Spider-Man: Across the Spider-Verse',
        description:
          'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.',
        duration: 140,
      },
      {
        title: 'Oppenheimer',
        description:
          'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
        duration: 180,
      },
      {
        title: 'John Wick: Chapter 4',
        description:
          'John Wick uncovers a path to defeating The High Table. But before he can earn his freedom, Wick must face off against a new enemy with powerful alliances across the globe.',
        duration: 169,
      },
      {
        title: 'Barbie',
        description:
          'Barbie and Ken are having the time of their lives in the colorful and seemingly perfect world of Barbie Land. However, when they get a chance to go to the real world, they soon discover the joys and perils of living among humans.',
        duration: 114,
      },
    ];
    await this.movieRepo.save(movies);
  }

  async seedScreens() {
    const screens = [];
    const screenNames = ['A', 'B', 'C', 'D', 'E', 'F'];

    for (const screenName of screenNames) {
      const seats = [];
      const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
      const seatsPerRow = 10;

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        for (let seatNum = 1; seatNum <= seatsPerRow; seatNum++) {
          // Determine seat type based on row
          let seatType = SeatType.REGULAR;
          if (row === 'A' || row === 'B') {
            seatType = SeatType.PREMIUM;
          } else if (row === 'F' && (seatNum === 1 || seatNum === 10)) {
            seatType = SeatType.ACCESSIBLE;
          }

          seats.push({
            row: row,
            number: seatNum,
            seatType: seatType,
          });
        }
      }

      const screen = this.screenRepo.create({
        name: `Screen ${screenName}`,
        seats: seats,
      });
      screens.push(screen);
    }

    await this.screenRepo.save(screens);
  }

  async seedShows() {
    const movies = await this.movieRepo.find();
    const screens = await this.screenRepo.find();

    const shows = [];

    // Create 4 shows for each movie
    for (const movie of movies) {
      for (let i = 0; i < 4; i++) {
        // Distribute shows across different screens
        const screen = screens[i % screens.length];

        // Create shows at different times (today + next 7 days)
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + Math.floor(i / 2)); // Spread across days
        startTime.setHours(10 + i * 3, 0, 0, 0); // 10:00, 13:00, 16:00, 19:00

        // Different base prices based on movie popularity/screen
        const basePrice = this.calculateBasePrice(movie.title, screen.name);

        const show = this.showRepo.create({
          movie: movie,
          screen: screen,
          startTime: startTime,
          duration: movie.duration,
          basePrice: basePrice,
        });

        shows.push(show);
      }
    }

    await this.showRepo.save(shows);
  }

  private calculateBasePrice(movieTitle: string, screenName: string): number {
    let price = 12.0;

    // Premium movies get higher base price
    const premiumMovies = [
      'Avengers: Endgame',
      'Dune: Part Two',
      'Oppenheimer',
    ];
    if (premiumMovies.includes(movieTitle)) {
      price += 3.0;
    }

    // Premium screens (A, B) get higher price
    if (screenName === 'Screen A' || screenName === 'Screen B') {
      price += 2.0;
    }

    // Weekend pricing (for shows that would fall on weekend)
    // This is simplified - in real app you'd check actual dates

    return parseFloat(price.toFixed(2));
  }
}
