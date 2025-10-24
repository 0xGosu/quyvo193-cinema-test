import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Seat } from './seat.entity';
import { Show } from './show.entity';

@Entity()
export class Screen {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @OneToMany(() => Seat, (seat) => seat.screen, { cascade: true })
  seats: Seat[];

  @OneToMany(() => Show, (show) => show.screen)
  shows: Show[];
}
