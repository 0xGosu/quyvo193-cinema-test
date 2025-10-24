import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Reservation } from '../database/entities/reservation.entity';
import { LessThan, Repository } from 'typeorm';
import { ReservationStatus } from '../common/enums/reservation-status.enum';

@Injectable()
export class AppScheduleService {
  private readonly logger = new Logger(AppScheduleService.name);

  constructor(
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.debug('Running job to expire pending reservations...');

    const now = new Date();
    const result = await this.reservationRepository.delete({
      status: ReservationStatus.PENDING,
      expiresAt: LessThan(now),
    });

    this.logger.log('cron result', result);

    if (result.affected) {
      this.logger.log(`Expired ${result.affected} pending reservation(s).`);
    }
  }
}
