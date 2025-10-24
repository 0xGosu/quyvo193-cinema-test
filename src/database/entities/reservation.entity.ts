import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Show } from './show.entity';
import { ReservedSeat } from './reserved-seat.entity';
import { ReservationStatus } from '../../common/enums/reservation-status.enum';

@Entity()
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string; // From X-User-Id header

  @ManyToOne(() => Show, (show) => show.reservations)
  show: Show;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date; // 10-minute lock

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => ReservedSeat, (rs) => rs.reservation, { cascade: true })
  reservedSeats: ReservedSeat[];
}
