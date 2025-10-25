import { Test, TestingModule } from '@nestjs/testing';
import { MoviesService } from '../../src/movies/movies.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Movie } from '../../src/database/entities/movie.entity';
import { Repository } from 'typeorm';
import { CreateMovieDto } from '../../src/movies/dto/create-movie.dto';

describe('MoviesService', () => {
  let service: MoviesService;
  let mockRepository: jest.Mocked<Repository<Movie>>;

  const mockMovie: Movie = {
    id: 'movie-uuid-1',
    title: 'The Matrix',
    description: 'A computer hacker learns about the true nature of reality',
    duration: 136,
    shows: [],
  };

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOneBy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoviesService,
        {
          provide: getRepositoryToken(Movie),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<MoviesService>(MoviesService);
    mockRepository = module.get(getRepositoryToken(Movie));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateMovieDto = {
      title: 'The Matrix',
      description: 'A computer hacker learns about the true nature of reality',
      duration: 136,
    };

    it('should create a movie successfully (positive case)', async () => {
      // Arrange
      mockRepository.create.mockReturnValue(mockMovie);
      mockRepository.save.mockResolvedValue(mockMovie);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockMovie);
      expect(result).toEqual(mockMovie);
    });

    it('should throw error if save fails (negative case)', async () => {
      // Arrange
      mockRepository.create.mockReturnValue(mockMovie);
      mockRepository.save.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(
        'Database connection failed',
      );
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should create movie with minimal data (positive case)', async () => {
      // Arrange
      const minimalDto: CreateMovieDto = {
        title: 'Short Film',
        duration: 30,
      };

      const minimalMovie = {
        id: 'movie-uuid-2',
        title: 'Short Film',
        description: undefined,
        duration: 30,
        shows: [],
      } as Movie;

      mockRepository.create.mockReturnValue(minimalMovie);
      mockRepository.save.mockResolvedValue(minimalMovie);

      // Act
      const result = await service.create(minimalDto);

      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith(minimalDto);
      expect(result.description).toBeUndefined();
      expect(result.title).toBe('Short Film');
    });

    it('should handle database constraint violations (negative case)', async () => {
      // Arrange
      mockRepository.create.mockReturnValue(mockMovie);
      mockRepository.save.mockRejectedValue(
        new Error('Unique constraint violation'),
      );

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(
        'Unique constraint violation',
      );
    });
  });

  describe('findAll', () => {
    it('should return all movies (positive case)', async () => {
      // Arrange
      const movies = [mockMovie, { ...mockMovie, id: 'movie-uuid-2' }];
      mockRepository.find.mockResolvedValue(movies);

      // Act
      const result = await service.findAll();

      // Assert
      expect(mockRepository.find).toHaveBeenCalled();
      expect(result).toEqual(movies);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no movies exist (negative case)', async () => {
      // Arrange
      mockRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(mockRepository.find).toHaveBeenCalled();
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle large datasets (positive case)', async () => {
      // Arrange
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        ...mockMovie,
        id: `movie-uuid-${i}`,
        title: `Movie ${i}`,
      }));
      mockRepository.find.mockResolvedValue(largeDataset);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toHaveLength(100);
      expect(mockRepository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a movie by id (positive case)', async () => {
      // Arrange
      mockRepository.findOneBy.mockResolvedValue(mockMovie);

      // Act
      const result = await service.findOne('movie-uuid-1');

      // Assert
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        id: 'movie-uuid-1',
      });
      expect(result).toEqual(mockMovie);
    });

    it('should return null when movie not found (negative case)', async () => {
      // Arrange
      mockRepository.findOneBy.mockResolvedValue(null);

      // Act
      const result = await service.findOne('non-existent-id');

      // Assert
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        id: 'non-existent-id',
      });
      expect(result).toBeNull();
    });
  });
});
