import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Reservation } from './reservation.entity';
import { Seat } from './seat.entity';

@Entity()
export class ReservedSeat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Reservation, (res) => res.reservedSeats)
  reservation: Reservation;

  @ManyToOne(() => Seat)
  seat: Seat;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number; // Price for this specific seat
}
