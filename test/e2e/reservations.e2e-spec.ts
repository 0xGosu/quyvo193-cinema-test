import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { Movie } from '../../src/database/entities/movie.entity';
import { Screen } from '../../src/database/entities/screen.entity';
import { Seat } from '../../src/database/entities/seat.entity';
import { Show } from '../../src/database/entities/show.entity';
import { SeatType } from '../../src/common/enums/seat-type.enum';
import { Reservation } from '../../src/database/entities/reservation.entity';
import { ReservedSeat } from '../../src/database/entities/reserved-seat.entity';
import { ReservationStatus } from '../../src/common/enums/reservation-status.enum';

describe('Reservations (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Pre-seeded data holders
  let testShow: Show;
  let testSeatA1: Seat;
  let testSeatA2: Seat;

  const user1 = 'e2e-user-1';
  const user2 = 'e2e-user-2';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Clean and seed database
    await cleanDatabase();
    await seedDatabase();
  });

  const cleanDatabase = async () => {
    // Delete in reverse order of foreign key constraints
    await dataSource.getRepository(ReservedSeat).delete({});
    await dataSource.getRepository(Reservation).delete({});
    await dataSource.getRepository(Show).delete({});
    await dataSource.getRepository(Seat).delete({});
    await dataSource.getRepository(Screen).delete({});
    await dataSource.getRepository(Movie).delete({});
  };

  const seedDatabase = async () => {
    const movieRepo = dataSource.getRepository(Movie);
    const screenRepo = dataSource.getRepository(Screen);
    const showRepo = dataSource.getRepository(Show);
    const seatRepo = dataSource.getRepository(Seat);

    const movie = await movieRepo.save({ title: 'E2E Test Movie' });
    const screen = await screenRepo.save({
      name: 'E2E Screen',
    });

    testSeatA1 = await seatRepo.save({
      screen: screen,
      row: 'A',
      number: 1,
      seatType: SeatType.REGULAR,
    });
    testSeatA2 = await seatRepo.save({
      screen: screen,
      row: 'A',
      number: 2,
      seatType: SeatType.PREMIUM,
    });

    testShow = await showRepo.save({
      movie: movie,
      screen: screen,
      startTime: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
      duration: 120,
      basePrice: 10,
    });
  };

  afterAll(async () => {
    await app.close();
  });

  describe('POST /reservations - Purchase Flow', () => {
    let reservationId: string;

    it('1. should reserve seats (positive flow)', () => {
      const dto = {
        showId: testShow.id,
        seatIds: [testSeatA1.id, testSeatA2.id],
      };

      return request(app.getHttpServer())
        .post('/reservations')
        .set('X-User-Id', user1)
        .send(dto)
        .expect(201)
        .then((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.status).toEqual(ReservationStatus.PENDING);
          expect(res.body.reservedSeats).toHaveLength(2);
          expect(res.body.reservedSeats[0].price).toEqual('10.00'); // Regular
          expect(res.body.reservedSeats[1].price).toEqual('15.00'); // Premium
          reservationId = res.body.id;
        });
    });

    it('2. should confirm the reservation (positive flow)', () => {
      return request(app.getHttpServer())
        .post(\`/reservations/\${reservationId}/confirm\`)
        .set('X-User-Id', user1)
        .expect(200)
        .then((res) => {
          expect(res.body.id).toEqual(reservationId);
          expect(res.body.status).toEqual(ReservationStatus.CONFIRMED);
          expect(res.body.expiresAt).toBeNull();
        });
    });

    it('3. should block sold seats from new reservation (negative conflict)', () => {
      const dto = {
        showId: testShow.id,
        seatIds: [testSeatA1.id], // Try to book one of the sold seats
      };

      return request(app.getHttpServer())
        .post('/reservations')
        .set('X-User-Id', user2) // Different user
        .send(dto)
        .expect(409) // Conflict
        .then((res) => {
          expect(res.body.message).toContain(
            'One or more seats are already reserved',
          );
        });
    });
  });

  describe('POST /reservations - PENDING Conflict', () => {
    beforeEach(async () => {
      // Clean reservations before this specific test suite
      await dataSource.getRepository(ReservedSeat).delete({});
      await dataSource.getRepository(Reservation).delete({});
    });

    it('should block pending seats from new reservation (negative conflict)', async () => {
      const dto = {
        showId: testShow.id,
        seatIds: [testSeatA1.id],
      };

      // 1. User 1 reserves seat A1
      await request(app.getHttpServer())
        .post('/reservations')
        .set('X-User-Id', user1)
        .send(dto)
        .expect(201);

      // 2. User 2 tries to reserve seat A1 while it's PENDING
      return request(app.getHttpServer())
        .post('/reservations')
        .set('X-User-Id', user2)
        .send(dto)
        .expect(409) // Conflict
        .then((res) => {
          expect(res.body.message).toContain(
            'One or more seats are already reserved',
          );
        });
    });
  });
});
