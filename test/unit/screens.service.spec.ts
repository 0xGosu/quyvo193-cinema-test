import { Test, TestingModule } from '@nestjs/testing';
import { ScreensService } from '../../src/screens/screens.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Screen } from '../../src/database/entities/screen.entity';
import { Repository } from 'typeorm';
import { CreateScreenDto } from '../../src/screens/dto/create-screen.dto';
import { SeatType } from '../../src/common/enums/seat-type.enum';

describe('ScreensService', () => {
  let service: ScreensService;
  let mockRepository: jest.Mocked<Repository<Screen>>;

  const mockScreen: Screen = {
    id: 'screen-uuid-1',
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

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreensService,
        {
          provide: getRepositoryToken(Screen),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<ScreensService>(ScreensService);
    mockRepository = module.get(getRepositoryToken(Screen));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateScreenDto = {
      name: 'Screen 1',
      seats: [
        { row: 'A', number: 1, seatType: SeatType.REGULAR },
        { row: 'A', number: 2, seatType: SeatType.PREMIUM },
      ],
    };

    it('should create a screen with seats successfully (positive case)', async () => {
      // Arrange
      mockRepository.create.mockReturnValue(mockScreen);
      mockRepository.save.mockResolvedValue(mockScreen);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockScreen);
      expect(result).toEqual(mockScreen);
    });

    it('should throw error if save fails due to duplicate seat constraint (negative case)', async () => {
      // Arrange
      mockRepository.create.mockReturnValue(mockScreen);
      mockRepository.save.mockRejectedValue(
        new Error('Duplicate seat constraint violation'),
      );

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(
        'Duplicate seat constraint violation',
      );
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all screens with seats (positive case)', async () => {
      // Arrange
      const screens = [mockScreen, { ...mockScreen, id: 'screen-uuid-2' }];
      mockRepository.find.mockResolvedValue(screens);

      // Act
      const result = await service.findAll();

      // Assert
      expect(mockRepository.find).toHaveBeenCalledWith({
        relations: ['seats'],
      });
      expect(result).toEqual(screens);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no screens exist (negative case)', async () => {
      // Arrange
      mockRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(mockRepository.find).toHaveBeenCalledWith({
        relations: ['seats'],
      });
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return a screen by id with seats (positive case)', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockScreen);

      // Act
      const result = await service.findOne('screen-uuid-1');

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'screen-uuid-1' },
        relations: ['seats'],
      });
      expect(result).toEqual(mockScreen);
    });

    it('should return null when screen not found (negative case)', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findOne('non-existent-id');

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
        relations: ['seats'],
      });
      expect(result).toBeNull();
    });
  });
});
