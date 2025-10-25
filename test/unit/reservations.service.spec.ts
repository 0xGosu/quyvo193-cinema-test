import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from '../../src/reservations/reservations.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Show } from '../../src/database/entities/show.entity';
import { Seat } from '../../src/database/entities/seat.entity';
import { Reservation } from '../../src/database/entities/reservation.entity';
import { DataSource, In, MoreThan, Repository } from 'typeorm';
import { CreateReservationDto } from '../../src/reservations/dto/create-reservation.dto';
import { SeatType } from '../../src/common/enums/seat-type.enum';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ReservationStatus } from '../../src/common/enums/reservation-status.enum';

// Mock data
const mockShow = {
  id: 'show-uuid',
  basePrice: 10,
} as Show;

const mockSeats = [
  { id: 'seat-a1', seatType: SeatType.REGULAR },
  { id: 'seat-a2', seatType: SeatType.PREMIUM },
] as Seat[];

const mockReservation = {
  id: 'res-uuid',
  status: ReservationStatus.PENDING,
  reservedSeats: [],
} as Reservation;

describe('ReservationsService', () => {
  let service: ReservationsService;
  let mockDataSource: Partial<DataSource>;
  let mockReservationRepo: Partial<Repository<Reservation>>;

  // Mock query builder
  const mockQueryBuilder = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  // Mock transaction manager
  const mockEntityManager = {
    findOne: jest.fn(),
    findBy: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    create: jest.fn().mockReturnValue(mockReservation),
    save: jest.fn().mockResolvedValue(mockReservation),
  };

  beforeEach(async () => {
    // Mock the transaction wrapper
    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (isolation, callback) => {
        return callback(mockEntityManager);
      }),
    };

    mockReservationRepo = {
      // Mock methods for non-transactional calls like 'cancel' if needed
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: getRepositoryToken(Show),
          useValue: {}, // Not directly used, handled by transaction
        },
        {
          provide: getRepositoryToken(Seat),
          useValue: {}, // Not directly used, handled by transaction
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockReservationRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create (Unit)', () => {
    const dto: CreateReservationDto = {
      showId: 'show-uuid',
      seatIds: ['seat-a1', 'seat-a2'],
    };
    const userId = 'user-123';

    it('should create a reservation (positive case)', async () => {
      // Arrange
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockShow) // First call for finding the show
        .mockResolvedValueOnce(mockReservation); // Second call for reloading with relations
      mockEntityManager.findBy.mockResolvedValue(mockSeats);
      mockQueryBuilder.getMany.mockResolvedValue([]); // No conflicts

      // Act
      const result = await service.create(dto, userId);

      // Assert
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(Show, {
        where: { id: dto.showId },
      });
      expect(mockEntityManager.findBy).toHaveBeenCalledWith(Seat, {
        id: In(dto.seatIds),
      });
      expect(mockEntityManager.createQueryBuilder).toHaveBeenCalledWith(
        Reservation,
        'reservation',
      );
      expect(mockQueryBuilder.innerJoinAndSelect).toHaveBeenCalledWith(
        'reservation.reservedSeats',
        'reservedSeat',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'reservation.showId = :showId',
        { showId: dto.showId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
      expect(mockEntityManager.save).toHaveBeenCalled();
      expect(result).toEqual(mockReservation);
    });

    it('should throw ConflictException if seats are taken (negative case)', async () => {
      // Arrange
      mockEntityManager.findOne.mockResolvedValue(mockShow);
      mockEntityManager.findBy.mockResolvedValue(mockSeats);
      mockQueryBuilder.getMany.mockResolvedValue([mockReservation]); // Conflict found!

      // Act & Assert
      await expect(service.create(dto, userId)).rejects.toThrow(
        ConflictException,
      );
      expect(mockEntityManager.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if show not found (negative case)', async () => {
      // Arrange
      mockEntityManager.findOne.mockResolvedValue(null); // Show not found

      // Act & Assert
      await expect(service.create(dto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
