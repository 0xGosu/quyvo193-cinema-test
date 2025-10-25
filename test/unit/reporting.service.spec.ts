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

    it('should handle multiple movies with different sales (positive case)', async () => {
      // Arrange
      const movies = [
        mockMovie,
        { ...mockMovie, id: 'movie-2', title: 'Inception' },
        { ...mockMovie, id: 'movie-3', title: 'Interstellar' },
      ];
      mockMovieRepository.find.mockResolvedValue(movies);

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest
          .fn()
          .mockResolvedValueOnce(45) // Movie 1: 45 tickets
          .mockResolvedValueOnce(45) // Movie 1 show tickets
          .mockResolvedValueOnce(30) // Movie 2: 30 tickets
          .mockResolvedValueOnce(30) // Movie 2 show tickets
          .mockResolvedValueOnce(0), // Movie 3: 0 tickets
      };

      (mockReservedSeatRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );

      mockShowRepository.find.mockResolvedValue([mockShow]);
      mockSeatRepository.count.mockResolvedValue(60);

      // Act
      const result = await service.getReport();

      // Assert
      expect(result).toHaveLength(2); // Only 2 movies with sales
      expect(result[0].totalTicketsSold).toBe(45);
      expect(result[1].totalTicketsSold).toBe(30);
    });

    it('should exclude shows with zero sales from movie report (positive case)', async () => {
      // Arrange
      mockMovieRepository.find.mockResolvedValue([mockMovie]);

      const show2 = { ...mockShow, id: 'show-2' };

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest
          .fn()
          .mockResolvedValueOnce(45) // Total movie tickets
          .mockResolvedValueOnce(45) // Show 1 tickets
          .mockResolvedValueOnce(0), // Show 2 tickets (should be excluded)
      };

      (mockReservedSeatRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );

      mockShowRepository.find.mockResolvedValue([mockShow, show2]);
      mockSeatRepository.count.mockResolvedValue(60);

      // Act
      const result = await service.getReport();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].shows).toHaveLength(1); // Only show with sales
      expect(result[0].shows[0].soldTickets).toBe(45);
    });

    it('should calculate remaining seats correctly (positive case)', async () => {
      // Arrange
      mockMovieRepository.find.mockResolvedValue([mockMovie]);

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest
          .fn()
          .mockResolvedValueOnce(25) // Total tickets
          .mockResolvedValueOnce(25), // Show tickets
      };

      (mockReservedSeatRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );

      mockShowRepository.find.mockResolvedValue([mockShow]);
      mockSeatRepository.count.mockResolvedValue(60);

      // Act
      const result = await service.getReport();

      // Assert
      expect(result[0].shows[0].totalSeats).toBe(60);
      expect(result[0].shows[0].soldTickets).toBe(25);
      expect(result[0].shows[0].remainingSeats).toBe(35);
    });

    it('should handle sold-out shows (positive case)', async () => {
      // Arrange
      mockMovieRepository.find.mockResolvedValue([mockMovie]);

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest
          .fn()
          .mockResolvedValueOnce(60) // Total tickets
          .mockResolvedValueOnce(60), // Show tickets (sold out)
      };

      (mockReservedSeatRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );

      mockShowRepository.find.mockResolvedValue([mockShow]);
      mockSeatRepository.count.mockResolvedValue(60);

      // Act
      const result = await service.getReport();

      // Assert
      expect(result[0].shows[0].soldTickets).toBe(60);
      expect(result[0].shows[0].remainingSeats).toBe(0);
    });
  });
});
