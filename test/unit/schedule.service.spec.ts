import { Test, TestingModule } from '@nestjs/testing';
import { AppScheduleService } from '../../src/schedule/schedule.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Reservation } from '../../src/database/entities/reservation.entity';
import { Repository, LessThan, DeleteResult } from 'typeorm';
import { ReservationStatus } from '../../src/common/enums/reservation-status.enum';

describe('AppScheduleService', () => {
  let service: AppScheduleService;
  let mockRepository: jest.Mocked<Repository<Reservation>>;

  beforeEach(async () => {
    const mockRepo = {
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppScheduleService,
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<AppScheduleService>(AppScheduleService);
    mockRepository = module.get(getRepositoryToken(Reservation));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleCron', () => {
    it('should delete expired pending reservations (positive case)', async () => {
      // Arrange
      const deleteResult: DeleteResult = {
        affected: 3,
        raw: {},
      };
      mockRepository.delete.mockResolvedValue(deleteResult);

      // Spy on logger to verify it was called
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      // Act
      await service.handleCron();

      // Assert
      expect(mockRepository.delete).toHaveBeenCalledWith({
        status: ReservationStatus.PENDING,
        expiresAt: expect.any(Object), // LessThan(now)
      });
      expect(loggerSpy).toHaveBeenCalledWith('cron result', deleteResult);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Expired 3 pending reservation(s).',
      );
    });

    it('should not log expiration message when no reservations expired (negative case)', async () => {
      // Arrange
      const deleteResult: DeleteResult = {
        affected: 0,
        raw: {},
      };
      mockRepository.delete.mockResolvedValue(deleteResult);

      // Spy on logger to verify it was NOT called with expiration message
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      // Act
      await service.handleCron();

      // Assert
      expect(mockRepository.delete).toHaveBeenCalledWith({
        status: ReservationStatus.PENDING,
        expiresAt: expect.any(Object), // LessThan(now)
      });
      expect(loggerSpy).toHaveBeenCalledWith('cron result', deleteResult);
      expect(loggerSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Expired'),
      );
    });
  });
});
