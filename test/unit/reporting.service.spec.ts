import { Test, TestingModule } from '@nestjs/testing';
import { ReportingService } from '../../src/reporting/reporting.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Movie } from '../../src/database/entities/movie.entity';
import { Show } from '../../src/database/entities/show.entity';
import { Seat } from '../../src/database/entities/seat.entity';
import { ReservedSeat } from '../../src/database/entities/reserved-seat.entity';
import { Repository } from 'typeorm';
import { Screen } from '../../src/database/entities/screen.entity';
import { SeatType } from '../../src/common/enums/seat-type.enum';

describe('ReportingService', () => {
  let service: ReportingService;
  let mockMovieRepository: jest.Mocked<Repository<Movie>>;
  let mockReservedSeatRepository: jest.Mocked<Repository<ReservedSeat>>;
  let mockShowRepository: jest.Mocked<Repository<Show>>;
  let mockSeatRepository: jest.Mocked<Repository<Seat>>;

  const mockMovie: Movie = {
    id: 'movie-uuid',
    title: 'The Matrix',
    description: 'Test',
    duration: 136,
    shows: [],
  };

  const mockScreen: Screen = {
    id: 'screen-uuid',
    name: 'Screen 1',
    seats: [],
    shows: [],
  };

  const mockShow: Show = {
    id: 'show-uuid',
    movie: mockMovie,
    screen: mockScreen,
    startTime: new Date('2025-12-25T19:00:00Z'),
    duration: 136,
    basePrice: 15.0,
    reservations: [],
  };

  beforeEach(async () => {
    const mockMovieRepo = {
      find: jest.fn(),
    };

    const mockReservedSeatQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
    };

    const mockReservedSeatRepo = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValue(mockReservedSeatQueryBuilder),
    };

    const mockShowRepo = {
      find: jest.fn(),
    };

    const mockSeatRepo = {
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        {
          provide: getRepositoryToken(Movie),
          useValue: mockMovieRepo,
        },
        {
          provide: getRepositoryToken(ReservedSeat),
          useValue: mockReservedSeatRepo,
        },
        {
          provide: getRepositoryToken(Show),
          useValue: mockShowRepo,
        },
        {
          provide: getRepositoryToken(Seat),
          useValue: mockSeatRepo,
        },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
    mockMovieRepository = module.get(getRepositoryToken(Movie));
    mockReservedSeatRepository = module.get(getRepositoryToken(ReservedSeat));
    mockShowRepository = module.get(getRepositoryToken(Show));
    mockSeatRepository = module.get(getRepositoryToken(Seat));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getReport', () => {
    it('should return sales report for movies with ticket sales (positive case)', async () => {
      // Arrange
      mockMovieRepository.find.mockResolvedValue([mockMovie]);

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
      };

      // First call for total tickets sold (returns 45)
      mockQueryBuilder.getCount.mockResolvedValueOnce(45);
      // Second call for show-specific tickets (returns 45)
      mockQueryBuilder.getCount.mockResolvedValueOnce(45);

      (mockReservedSeatRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );

      mockShowRepository.find.mockResolvedValue([mockShow]);
      mockSeatRepository.count.mockResolvedValue(60);

      // Act
      const result = await service.getReport();

      // Assert
      expect(mockMovieRepository.find).toHaveBeenCalledWith({
        select: ['id', 'title'],
      });
      expect(result).toHaveLength(1);
      expect(result[0].movie.id).toBe('movie-uuid');
      expect(result[0].movie.title).toBe('The Matrix');
      expect(result[0].totalTicketsSold).toBe(45);
      expect(result[0].shows).toHaveLength(1);
      expect(result[0].shows[0].totalSeats).toBe(60);
      expect(result[0].shows[0].soldTickets).toBe(45);
      expect(result[0].shows[0].remainingSeats).toBe(15);
    });

    it('should return empty array when no movies have ticket sales (negative case)', async () => {
      // Arrange
      mockMovieRepository.find.mockResolvedValue([mockMovie]);

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0), // No tickets sold
      };

      (mockReservedSeatRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );

      // Act
      const result = await service.getReport();

      // Assert
      expect(mockMovieRepository.find).toHaveBeenCalled();
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
      expect(mockShowRepository.find).not.toHaveBeenCalled(); // Should not query shows if no sales
    });
  });
});
