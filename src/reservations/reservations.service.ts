import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Show } from '../database/entities/show.entity';
import { DataSource, In } from 'typeorm';
import { Seat } from '../database/entities/seat.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationStatus } from '../common/enums/reservation-status.enum';
import {
  RESERVATION_EXPIRY_MINUTES,
  SEAT_PRICE_MULTIPLIERS,
} from './reservations.constants';
import { ReservedSeat } from '../database/entities/reserved-seat.entity';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private dataSource: DataSource,
  ) {}

  /**
   * Creates a new PENDING reservation atomically.
   */
  async create(
    createReservationDto: CreateReservationDto,
    userId: string,
  ): Promise<Reservation | null> {
    const { showId, seatIds } = createReservationDto;

    return this.dataSource.transaction(
      'SERIALIZABLE',
      async (transactionalEntityManager) => {
        // 1. Find the show and requested seats
        const show = await transactionalEntityManager.findOne(Show, {
          where: { id: showId },
        });

        if (!show) {
          throw new NotFoundException(`Show with ID ${showId} not found`);
        }

        const seats = await transactionalEntityManager.findBy(Seat, {
          id: In(seatIds),
        });

        if (seats.length !== seatIds.length) {
          throw new NotFoundException('One or more seat IDs are invalid');
        }

        // 2. Check if seats are already reserved or confirmed
        const existingReservations = await transactionalEntityManager
          .createQueryBuilder(Reservation, 'reservation')
          .innerJoinAndSelect('reservation.reservedSeats', 'reservedSeat')
          .innerJoinAndSelect('reservedSeat.seat', 'seat')
          .where('reservation.showId = :showId', { showId })
          .andWhere('seat.id IN (:...seatIds)', { seatIds })
          .andWhere('reservation.status IN (:...statuses)', {
            statuses: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING],
          })
          .andWhere('reservation.expiresAt > :now', { now: new Date() })
          .getMany();

        if (existingReservations.length > 0) {
          throw new ConflictException('One or more seats are already reserved');
        }

        // 3. Calculate total price
        const totalAmount = seats.reduce((total, seat) => {
          const multiplier = SEAT_PRICE_MULTIPLIERS[seat.seatType];
          return total + show.basePrice * multiplier;
        }, 0);

        console.log({ totalAmount });

        // 4. Create reservation
        const expiryTime = new Date();
        expiryTime.setMinutes(
          expiryTime.getMinutes() + RESERVATION_EXPIRY_MINUTES,
        );

        const reservation = transactionalEntityManager.create(Reservation, {
          userId,
          show,
          status: ReservationStatus.PENDING,
          expiresAt: expiryTime,
          totalAmount,
        });

        // Save reservation first to get the ID
        const savedReservation =
          await transactionalEntityManager.save(reservation);

        // 5. Batch create reserved seats
        const reservedSeats = seats.map((seat) => {
          const multiplier = SEAT_PRICE_MULTIPLIERS[seat.seatType];
          const price = show.basePrice * multiplier;

          return transactionalEntityManager.create(ReservedSeat, {
            seat,
            reservation: savedReservation,
            price,
          });
        });

        // Batch save all reserved seats
        await transactionalEntityManager.save(reservedSeats);

        // 6. Reload the reservation with relations to return complete data
        return await transactionalEntityManager.findOne(Reservation, {
          where: { id: savedReservation.id },
          relations: [
            'show',
            'show.movie',
            'reservedSeats',
            'reservedSeats.seat',
          ],
        });
      },
    );
  }

  /**
   * Confirms a PENDING reservation.
   */
  async confirm(reservationId: string): Promise<Reservation> {
    // Also use a transaction for this update
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      const reservation = await transactionalEntityManager.findOne(
        Reservation,
        {
          where: { id: reservationId },
          // Lock the row for update
          lock: { mode: 'pessimistic_write' },
        },
      );

      if (!reservation) {
        throw new NotFoundException(
          `Reservation not found or user unauthorized`,
        );
      }

      if (reservation.status !== ReservationStatus.PENDING) {
        throw new BadRequestException('Reservation is not in PENDING state');
      }

      // Finalize the purchase
      reservation.status = ReservationStatus.CONFIRMED;

      return transactionalEntityManager.save(reservation);
    });
  }

  /**
   * Explicitly cancels a PENDING reservation.
   */
  async cancel(reservationId: string, userId: string): Promise<void> {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      // Verify reservation exists and user is authorized
      const reservation = await transactionalEntityManager.findOne(
        Reservation,
        {
          where: { id: reservationId, userId },
        },
      );

      if (!reservation) {
        throw new NotFoundException(
          `Reservation not found or user unauthorized`,
        );
      }

      if (reservation.status !== ReservationStatus.PENDING) {
        throw new BadRequestException(
          'Only PENDING reservations can be cancelled',
        );
      }

      // Delete reserved seats
      await transactionalEntityManager
        .createQueryBuilder()
        .delete()
        .from(ReservedSeat)
        .where('reservationId = :reservationId', { reservationId })
        .execute();

      // Delete the reservation
      await transactionalEntityManager
        .createQueryBuilder()
        .delete()
        .from(Reservation)
        .where('id = :reservationId', { reservationId })
        .execute();
    });
  }
}
