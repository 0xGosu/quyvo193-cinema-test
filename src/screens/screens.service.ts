import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Screen } from '../database/entities/screen.entity';
import { Repository } from 'typeorm';
import { CreateScreenDto } from './dto/create-screen.dto';

@Injectable()
export class ScreensService {
  constructor(
    @InjectRepository(Screen)
    private screensRepository: Repository<Screen>,
  ) {}

  create(createScreenDto: CreateScreenDto): Promise<Screen> {
    // TypeORM's cascade insert will create the seats
    const screen = this.screensRepository.create(createScreenDto);
    return this.screensRepository.save(screen);
  }

  findAll(): Promise<Screen[]> {
    return this.screensRepository.find({ relations: ['seats'] });
  }

  findOne(id: string): Promise<Screen | null> {
    return this.screensRepository.findOne({
      where: { id },
      relations: ['seats'],
    });
  }
}
