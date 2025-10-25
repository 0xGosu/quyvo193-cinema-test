import { Test, TestingModule } from '@nestjs/testing';
import { ShowsService } from '../../src/shows/shows.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Show } from '../../src/database/entities/show.entity';
import { Movie } from '../../src/database/entities/movie.entity';
import { Screen } from '../../src/database/entities/screen.entity';
import { Repository } from 'typeorm';
import { CreateShowDto } from '../../src/shows/dto/create-show.dto';
import { GetShowDto } from '../../src/shows/dto/get-show.dto';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { SeatType } from '../../src/common/enums/seat-type.enum';

describe('ShowsService', () => {
  let service: ShowsService;
  let mockShowsRepository: jest.Mocked<Repository<Show>>;
  let mockMoviesRepository: jest.Mocked<Repository<Movie>>;
  let mockScreensRepository: jest.Mocked<Repository<Screen>>;

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
    seats: [
      {
        id: 'seat-uuid-1',
        row: 'A',
        number: 1,
        seatType: SeatType.REGULAR,
        screen: null,
        reservedSeats: [],
      },
    ],
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
    const mockShowRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      manager: {
        createQueryBuilder: jest.fn(),
      },
    };

    const mockMovieRepo = {
      findOneBy: jest.fn(),
    };

    const mockScreenRepo = {
      findOneBy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowsService,
        {
          provide: getRepositoryToken(Show),
          useValue: mockShowRepo,
        },
        {
          provide: getRepositoryToken(Movie),
          useValue: mockMovieRepo,
        },
        {
          provide: getRepositoryToken(Screen),
          useValue: mockScreenRepo,
        },
      ],
    }).compile();

    service = module.get<ShowsService>(ShowsService);
    mockShowsRepository = module.get(getRepositoryToken(Show));
    mockMoviesRepository = module.get(getRepositoryToken(Movie));
    mockScreensRepository = module.get(getRepositoryToken(Screen));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateShowDto = {
      movieId: 'movie-uuid',
      screenId: 'screen-uuid',
      startTime: '2025-12-25T19:00:00Z',
      duration: 136,
      basePrice: 15.0,
    };

    it('should create a show successfully (positive case)', async () => {
      // Arrange
      mockMoviesRepository.findOneBy.mockResolvedValue(mockMovie);
      mockScreensRepository.findOneBy.mockResolvedValue(mockScreen);
      mockShowsRepository.find.mockResolvedValue([]); // No conflicting shows
      mockShowsRepository.create.mockReturnValue(mockShow);
      mockShowsRepository.save.mockResolvedValue(mockShow);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(mockMoviesRepository.findOneBy).toHaveBeenCalledWith({
        id: 'movie-uuid',
      });
      expect(mockScreensRepository.findOneBy).toHaveBeenCalledWith({
        id: 'screen-uuid',
      });
      expect(mockShowsRepository.find).toHaveBeenCalled();
      expect(mockShowsRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockShow);
    });

    it('should throw NotFoundException if movie not found (negative case)', async () => {
      // Arrange
      mockMoviesRepository.findOneBy.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Movie with ID movie-uuid not found',
      );
      expect(mockMoviesRepository.findOneBy).toHaveBeenCalled();
      expect(mockShowsRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if screen not found (negative case)', async () => {
      // Arrange
      mockMoviesRepository.findOneBy.mockResolvedValue(mockMovie);
      mockScreensRepository.findOneBy.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Screen with ID screen-uuid not found',
      );
      expect(mockScreensRepository.findOneBy).toHaveBeenCalled();
      expect(mockShowsRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if start time is in the past (negative case)', async () => {
      // Arrange
      const pastDto = {
        ...createDto,
        startTime: '2020-01-01T19:00:00Z',
      };
      mockMoviesRepository.findOneBy.mockResolvedValue(mockMovie);
      mockScreensRepository.findOneBy.mockResolvedValue(mockScreen);

      // Act & Assert
      await expect(service.create(pastDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(pastDto)).rejects.toThrow(
        'Show start time must be in the future',
      );
      expect(mockShowsRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if show times conflict (negative case)', async () => {
      // Arrange
      const conflictingShow = {
        ...mockShow,
        startTime: new Date('2025-12-25T18:30:00Z'),
        duration: 120,
      };
      mockMoviesRepository.findOneBy.mockResolvedValue(mockMovie);
      mockScreensRepository.findOneBy.mockResolvedValue(mockScreen);
      mockShowsRepository.find.mockResolvedValue([conflictingShow]);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockShowsRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAllOfMovie', () => {
    const getShowDto: GetShowDto = {
      movieId: 'movie-uuid',
    };

    it('should return all shows for a movie (positive case)', async () => {
      // Arrange
      const shows = [mockShow, { ...mockShow, id: 'show-uuid-2' }];
      mockShowsRepository.find.mockResolvedValue(shows);

      // Act
      const result = await service.findAllOfMovie(getShowDto);

      // Assert
      expect(mockShowsRepository.find).toHaveBeenCalledWith({
        where: { movie: { id: 'movie-uuid' } },
        relations: ['movie', 'screen'],
      });
      expect(result).toEqual(shows);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no shows exist for movie (negative case)', async () => {
      // Arrange
      mockShowsRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findAllOfMovie(getShowDto);

      // Assert
      expect(mockShowsRepository.find).toHaveBeenCalledWith({
        where: { movie: { id: 'movie-uuid' } },
        relations: ['movie', 'screen'],
      });
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return a show by id (positive case)', async () => {
      // Arrange
      mockShowsRepository.findOne.mockResolvedValue(mockShow);

      // Act
      const result = await service.findOne('show-uuid');

      // Assert
      expect(mockShowsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'show-uuid' },
        relations: ['movie', 'screen'],
      });
      expect(result).toEqual(mockShow);
    });

    it('should return null when show not found (negative case)', async () => {
      // Arrange
      mockShowsRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findOne('non-existent-id');

      // Assert
      expect(mockShowsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
        relations: ['movie', 'screen'],
      });
      expect(result).toBeNull();
    });
  });

  describe('getShowSeatsWithStatus', () => {
    const mockShowWithSeats = {
      ...mockShow,
      screen: {
        ...mockScreen,
        seats: [
          {
            id: 'seat-uuid-1',
            row: 'A',
            number: 1,
            seatType: SeatType.REGULAR,
            screen: null,
            reservedSeats: [],
          },
          {
            id: 'seat-uuid-2',
            row: 'A',
            number: 2,
            seatType: SeatType.REGULAR,
            screen: null,
            reservedSeats: [],
          },
        ],
      },
    };

    it('should return show seats with availability status (positive case)', async () => {
      // Arrange
      mockShowsRepository.findOne.mockResolvedValue(mockShowWithSeats);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ seat_id: 'seat-uuid-1' }]),
      };

      (mockShowsRepository.manager.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );

      // Act
      const result = await service.getShowSeatsWithStatus('show-uuid');

      // Assert
      expect(mockShowsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'show-uuid' },
        relations: ['screen', 'screen.seats'],
      });
      expect(result.totalSeats).toBe(2);
      expect(result.seats).toHaveLength(2);
      expect(result.seats[0].status).toBe('RESERVED');
      expect(result.seats[1].status).toBe('AVAILABLE');
    });

    it('should throw NotFoundException when show not found (negative case)', async () => {
      // Arrange
      mockShowsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getShowSeatsWithStatus('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getShowSeatsWithStatus('non-existent-id'),
      ).rejects.toThrow('Show not found');
    });
  });
});
