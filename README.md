# Cinema Ticket Purchasing API
This is a simplified backend REST API for a cinema ticketing system, built with NestJS, TypeORM, and PostgreSQL.

## Features

- **Movies & Shows**: CRUD for movies and shows.
- **Screens & Seats**: Define auditoriums with seat layouts (REGULAR, PREMIUM, ACCESSIBLE).
- **Reservations**: Atomically reserve seats with a 10-minute lock.
- **Purchases**: Confirm reservations to finalize them as "sold".
- **Concurrency**: Uses `SERIALIZABLE` database transactions to prevent double-booking.
- **Reporting**: An endpoint to get a sales report for movies with sold tickets.
- **Auth**: Simple `X-User-Id` header-based user identification.

## Setup & Installation

### 1. Prerequisites

- Node.js (v22+)
- NPM
- Docker (for PostgreSQL)

### 2. Environment

This project was initialized with a script. The `.env` file should already be created from `.env.example`.

### 3. Start Database

Run the PostgreSQL database using Docker:

```bash
docker-compose up -d
```

### 4.Create and run migration

```bash
name=init-db npm run migration:generate
npm run migration:run
```

### 5. Seed Sample Data (Optional)

To populate the database with sample movies, screens, and shows, run the seeder:

```bash
npm run seed
```

### 6. Run the Application

```bash
npm run start:dev
```

The API will be running at `http://localhost:3000`.
