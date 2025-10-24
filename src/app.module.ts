import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppTypeOrmConfig } from './config/typeorm.config';
import { MoviesModule } from './movies/movies.module';
import { ScreensModule } from './screens/screens.module';
import { ShowsModule } from './shows/shows.module';
import { ReservationsModule } from './reservations/reservations.module';
import { ReportingModule } from './reporting/reporting.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AppScheduleModule } from './schedule/schedule.module';
import { SeedModule } from './database/seeds/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useClass: AppTypeOrmConfig,
    }),
    ScheduleModule.forRoot(),
    MoviesModule,
    ScreensModule,
    ShowsModule,
    ReservationsModule,
    ReportingModule,
    AppScheduleModule,
    SeedModule, // Included for the seeding script
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
