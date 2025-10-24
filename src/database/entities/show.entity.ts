import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Movie } from './movie.entity';
import { Screen } from './screen.entity';
import { Reservation } from './reservation.entity';

@Entity()
export class Show {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Movie, (movie) => movie.shows)
  movie: Movie;

  @ManyToOne(() => Screen, (screen) => screen.shows)
  screen: Screen;

  @Column({ type: 'timestamptz' })
  startTime: Date;

  @Column()
  duration: number; // in minutes

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @OneToMany(() => Reservation, (reservation) => reservation.show)
  reservations: Reservation[];
}
