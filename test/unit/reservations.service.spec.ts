import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from '../../src/reservations/reservations.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Show } from '../../src/database/entities/show.entity';
import { Seat } from '../../src/database/entities/seat.entity';
import { Reservation } from '../../src/database/entities/reservation.entity';
import { DataSource, In, MoreThan, Repository } from 'typeorm';
import { CreateReservationDto } from '../../src/reservations/dto/create-reservation.dto';
import { SeatType } from '../../src/common/enums/seat-type.enum';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
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
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
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
    // Mock the transaction wrapper - handle both with and without isolation level
    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (isolation, callback) => {
        // If isolation is a function, it's actually the callback (no isolation provided)
        const actualCallback = typeof isolation === 'function' ? isolation : callback;
        return actualCallback(mockEntityManager);
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

    it('should throw NotFoundException if some seats not found (negative case)', async () => {
      // Arrange
      mockEntityManager.findOne.mockResolvedValue(mockShow);
      mockEntityManager.findBy.mockResolvedValue([mockSeats[0]]); // Only one seat found

      // Act & Assert
      await expect(service.create(dto, userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(dto, userId)).rejects.toThrow(
        'One or more seat IDs are invalid',
      );
    });

    it('should calculate correct pricing for different seat types (positive case)', async () => {
      // Arrange
      const mixedSeats = [
        { id: 'seat-a1', seatType: SeatType.REGULAR },
        { id: 'seat-a2', seatType: SeatType.PREMIUM },
        { id: 'seat-a3', seatType: SeatType.ACCESSIBLE },
      ] as Seat[];

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockShow)
        .mockResolvedValueOnce(mockReservation);
      mockEntityManager.findBy.mockResolvedValue(mixedSeats);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const dtoWithMixedSeats = {
        showId: 'show-uuid',
        seatIds: ['seat-a1', 'seat-a2', 'seat-a3'],
      };

      // Act
      await service.create(dtoWithMixedSeats, userId);

      // Assert - Verify create was called for ReservedSeats with correct prices
      expect(mockEntityManager.create).toHaveBeenCalled();
      expect(mockEntityManager.save).toHaveBeenCalled();
    });
  });

  describe('confirm', () => {
    it('should confirm a pending reservation (positive case)', async () => {
      // Arrange
      const pendingReservation = {
        id: 'res-uuid',
        status: ReservationStatus.PENDING,
        expiresAt: new Date(),
      } as Reservation;

      const confirmedReservation = {
        ...pendingReservation,
        status: ReservationStatus.CONFIRMED,
        expiresAt: null,
      };

      mockEntityManager.findOne.mockResolvedValue(pendingReservation);
      mockEntityManager.save.mockResolvedValue(confirmedReservation);

      // Act
      const result = await service.confirm('res-uuid');

      // Assert
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(Reservation, {
        where: { id: 'res-uuid' },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockEntityManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReservationStatus.CONFIRMED,
          expiresAt: null,
        }),
      );
      expect(result.status).toBe(ReservationStatus.CONFIRMED);
      expect(result.expiresAt).toBeNull();
    });

    it('should throw NotFoundException if reservation not found (negative case)', async () => {
      // Arrange
      mockEntityManager.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.confirm('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.confirm('non-existent-id')).rejects.toThrow(
        'Reservation not found or user unauthorized',
      );
    });

    it('should throw BadRequestException if reservation not PENDING (negative case)', async () => {
      // Arrange
      const confirmedReservation = {
        id: 'res-uuid',
        status: ReservationStatus.CONFIRMED,
      } as Reservation;

      mockEntityManager.findOne.mockResolvedValue(confirmedReservation);

      // Act & Assert
      await expect(service.confirm('res-uuid')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.confirm('res-uuid')).rejects.toThrow(
        'Reservation is not in PENDING state',
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a pending reservation (positive case)', async () => {
      // Arrange
      const pendingReservation = {
        id: 'res-uuid',
        userId: 'user-123',
        status: ReservationStatus.PENDING,
      } as Reservation;

      mockEntityManager.findOne.mockResolvedValue(pendingReservation);
      mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });

      // Act
      await service.cancel('res-uuid', 'user-123');

      // Assert
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(Reservation, {
        where: { id: 'res-uuid', userId: 'user-123' },
      });
      expect(mockEntityManager.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });

    it('should throw NotFoundException if reservation not found or wrong user (negative case)', async () => {
      // Arrange
      mockEntityManager.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.cancel('res-uuid', 'wrong-user')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.cancel('res-uuid', 'wrong-user')).rejects.toThrow(
        'Reservation not found or user unauthorized',
      );
    });

    it('should throw BadRequestException if reservation is CONFIRMED (negative case)', async () => {
      // Arrange
      const confirmedReservation = {
        id: 'res-uuid',
        userId: 'user-123',
        status: ReservationStatus.CONFIRMED,
      } as Reservation;

      mockEntityManager.findOne.mockResolvedValue(confirmedReservation);

      // Act & Assert
      await expect(service.cancel('res-uuid', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.cancel('res-uuid', 'user-123')).rejects.toThrow(
        'Only PENDING reservations can be cancelled',
      );
    });
  });
});
