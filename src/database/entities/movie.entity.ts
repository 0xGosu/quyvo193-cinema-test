import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Show } from './show.entity';

@Entity()
export class Movie {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  duration: number; // in minutes

  @OneToMany(() => Show, (show) => show.movie)
  shows: Show[];
}
