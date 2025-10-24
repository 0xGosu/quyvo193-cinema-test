import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Screen } from './screen.entity';
import { SeatType } from '../../common/enums/seat-type.enum';

@Entity()
@Unique(['screen', 'row', 'number']) // A seat (e.g., A5) is unique per screen
export class Seat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Screen, (screen) => screen.seats)
  screen: Screen;

  @Column()
  row: string;

  @Column()
  number: number;

  @Column({
    type: 'enum',
    enum: SeatType,
    default: SeatType.REGULAR,
  })
  seatType: SeatType;
}
