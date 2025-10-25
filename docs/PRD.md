# Product Requirements Document (PRD)
## Cinema Ticketing System - Backend API

---

<div align="center">

**Version:** 1.0
**Status:** Active
**Last Updated:** 2025-10-25
**Document Type:** Product Requirements Document

</div>

---

## 📋 Table of Contents

- [1. Overview](#1-overview)
  - [1.1 Goal](#11-goal)
  - [1.2 Scope](#12-scope)
- [2. Technical Requirements](#2-technical-requirements)
  - [2.1 Technology Stack](#21-technology-stack)
  - [2.2 Non-Functional Constraints](#22-non-functional-constraints)
- [3. Functional Requirements](#3-functional-requirements)
  - [3.1 Movies & Shows](#31-movies--shows)
  - [3.2 Screens & Seats](#32-screens--seats)
  - [3.3 Reservations & Purchases](#33-reservations--purchases)
  - [3.4 Pricing](#34-pricing)
  - [3.5 Reporting](#35-reporting)
- [4. Data Models](#4-data-models)
- [5. API Specifications](#5-api-specifications)
- [6. Concurrency & Consistency](#6-concurrency--consistency)
- [7. Authentication & Authorization](#7-authentication--authorization)
- [8. Testing Requirements](#8-testing-requirements)
- [9. Success Criteria](#9-success-criteria)

---

## 1. Overview

### 1.1 Goal

Build a **simplified backend for a cinema ticketing system** using TypeScript, NestJS, TypeORM, and PostgreSQL.

Deliver a **clean, tested REST API** that supports:
- 🎬 Movie show management
- 💺 Seat reservation
- 💳 Purchase flow
- 📊 Basic reporting

### 1.2 Scope

**In Scope:**
- Backend REST API only
- Core ticketing functionality
- Database design and migrations
- Unit and integration tests
- Basic authentication (header-based)

**Out of Scope:**
- Frontend/UI implementation
- Full OAuth/JWT authentication
- Payment gateway integration
- Email/SMS notifications
- Admin dashboard

---

## 2. Technical Requirements

### 2.1 Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| **Framework** | NestJS | Latest |
| **Language** | TypeScript | Latest |
| **ORM** | TypeORM | Latest |
| **Database** | PostgreSQL | Latest |
| **Testing** | Jest + SuperTest | Latest |
| **Runtime** | Node.js | LTS |

### 2.2 Non-Functional Constraints

#### ✅ Required

1. **Framework & ORM**
   - Use NestJS framework
   - Use TypeORM for database operations

2. **Database**
   - PostgreSQL as the relational database
   - Use migrations OR schema SQL scripts
   - Proper indexing for performance

3. **Testing Coverage**
   - Write **unit tests for all source code**
   - Coverage: **1 positive and 1 negative case per method**
   - Write **1 positive integration test** for purchase flow with multiple seats
   - Write **1 negative integration test** for seat reservation conflict

4. **Authentication**
   - Simple header-based: `X-User-Id`
   - No full OAuth/JWT required for MVP

5. **Code Quality**
   - Clean, maintainable code
   - Proper error handling
   - TypeScript strict mode
   - No frontend implementation required

---

## 3. Functional Requirements

### 3.1 Movies & Shows

#### Movies

A **movie** represents a film that can be shown in the cinema.

**Requirements:**
- ✅ Create new movies
- ✅ Read/retrieve movie details
- ✅ List all movies

**Movie Attributes:**
- `id` - Unique identifier (UUID)
- `title` - Movie title (required)
- `description` - Movie description (optional)
- `duration` - Runtime in minutes (required)

#### Shows

A **show** is a specific screening of a movie in a screen at a particular time.

**Requirements:**
- ✅ Create new shows
- ✅ Read/retrieve show details
- ✅ List shows (filtered by movie)

**Show Attributes:**
- `id` - Unique identifier (UUID)
- `movie_id` - Foreign key to Movie
- `screen_id` - Foreign key to Screen
- `start_time` - Show start timestamp (required)
- `duration` - Duration in minutes (can inherit from movie)
- `base_price` - Base ticket price for this show

**Business Rules:**
- Shows must not overlap on the same screen
- Show start time must be in the future
- Duration must be positive

---

### 3.2 Screens & Seats

#### Screens

A **screen** (auditorium/hall) is a physical location where movies are shown.

**Requirements:**
- ✅ Define screens with names
- ✅ Associate seats with screens
- ✅ List all screens with their seats

**Screen Attributes:**
- `id` - Unique identifier (UUID)
- `name` - Screen name (e.g., "Screen 1", "IMAX Hall")

#### Seats

A **seat** is an individual seating position within a screen.

**Requirements:**
- ✅ Define seat layout (row + number)
- ✅ Categorize seats by type
- ✅ Ensure unique seats per screen

**Seat Attributes:**
- `id` - Unique identifier (UUID)
- `screen_id` - Foreign key to Screen
- `row` - Row identifier (e.g., "A", "B", "C")
- `number` - Seat number within row (e.g., 1, 2, 3)
- `seat_type` - Enum: `REGULAR`, `PREMIUM`, `ACCESSIBLE`

**Seat Types:**

| Type | Description | Price Multiplier |
|------|-------------|------------------|
| `REGULAR` | Standard seating | 1.0× |
| `PREMIUM` | Premium seating (e.g., recliners) | 1.5× |
| `ACCESSIBLE` | Wheelchair accessible | 1.2× |

**Constraints:**
- Seat combination `(screen_id, row, number)` must be unique
- Each screen can have multiple seats
- Seat type affects pricing (see section 3.4)

---

### 3.3 Reservations & Purchases

#### Reservation Lifecycle

```
┌──────────┐    Reserve Seats    ┌──────────┐    Confirm     ┌───────────┐
│          │ ──────────────────> │          │ ────────────> │           │
│   NONE   │                     │ PENDING  │               │ CONFIRMED │
│          │ <────────────────── │          │               │           │
└──────────┘   Cancel/Expire     └──────────┘               └───────────┘
                                      │
                                      │ 10 min timeout
                                      ↓
                                  [DELETED]
```

#### Requirements

**1. Reserve Seats (Temporary Lock)**
- ✅ User can reserve one or more seats for a show
- ✅ Reservation creates a **PENDING** status
- ✅ Lock duration: **10 minutes**
- ✅ Prevent double-booking (concurrency-safe)

**2. Confirm Purchase**
- ✅ Convert PENDING reservation to CONFIRMED
- ✅ Finalize purchase and create ticket records
- ✅ Clear expiration time (permanent reservation)

**3. Release Reservation**
- ✅ Explicit cancellation by user (DELETE endpoint)
- ✅ Automatic expiration after 10 minutes if not confirmed
- ✅ Clean up reservation and associated seat locks

**4. Double-Booking Prevention**
- ✅ **Atomic transaction** to check and reserve seats
- ✅ Database-level constraints
- ✅ Handle concurrent requests safely

#### Reservation Attributes

**Reservation:**
- `id` - Unique identifier (UUID)
- `user_id` - User who made reservation (from X-User-Id header)
- `show_id` - Foreign key to Show
- `status` - Enum: `PENDING`, `CONFIRMED`
- `total_amount` - Total price calculated
- `expires_at` - Expiration timestamp (10 min from creation, null when confirmed)
- `created_at` - Creation timestamp

**ReservedSeat (join table):**
- `id` - Unique identifier (UUID)
- `reservation_id` - Foreign key to Reservation
- `seat_id` - Foreign key to Seat
- `price` - Price for this specific seat

---

### 3.4 Pricing

#### Pricing Formula

```
Seat Price = Show Base Price × Seat Type Multiplier
Total Amount = Sum of all Seat Prices in reservation
```

#### Seat Type Multipliers

| Seat Type | Multiplier | Example (Base Price = $10) |
|-----------|------------|----------------------------|
| **REGULAR** | 1.0 | $10.00 |
| **PREMIUM** | 1.5 | $15.00 |
| **ACCESSIBLE** | 1.2 | $12.00 |

#### Example Calculation

```
Show Base Price: $20

Reservation with:
- 2 × REGULAR seats   = 2 × ($20 × 1.0) = $40.00
- 1 × PREMIUM seat    = 1 × ($20 × 1.5) = $30.00
- 1 × ACCESSIBLE seat = 1 × ($20 × 1.2) = $24.00
                                 Total = $94.00
```

#### Requirements

- ✅ Calculate price per seat based on type
- ✅ Store individual seat price in `reserved_seat.price`
- ✅ Store total amount in `reservation.total_amount`
- ✅ Price calculation must be atomic with reservation creation

---

### 3.5 Reporting

#### Sales Report Endpoint

**Endpoint:** `GET /api/report`

**Purpose:** Generate a sales report showing movies with ticket sales.

#### Requirements

✅ Return **only movies that have at least 1 ticket sold**

For each movie, include:
1. **Movie Information**
   - `id` - Movie UUID
   - `title` - Movie title

2. **Shows List** (only shows with sales)
   - `id` - Show UUID
   - `screen` - Screen information (id, name)
   - `start_time` - Show start time
   - `remaining_seats` - Available seats for that show

3. **Aggregate Data**
   - `total_tickets_sold` - Total confirmed tickets across all shows for this movie

#### Example Response Structure

```json
[
  {
    "movie": {
      "id": "uuid-1",
      "title": "The Matrix"
    },
    "shows": [
      {
        "id": "show-uuid-1",
        "screen": {
          "id": "screen-uuid-1",
          "name": "Screen 1"
        },
        "start_time": "2025-10-25T19:00:00Z",
        "total_seats": 60,
        "sold_tickets": 45,
        "remaining_seats": 15
      }
    ],
    "total_tickets_sold": 45
  }
]
```

#### Business Rules

- Only count **CONFIRMED** reservations
- Exclude movies with zero sales
- Show remaining seats calculation: `total_seats - sold_tickets`

---

## 4. Data Models

### Entity Relationship Diagram

```
┌─────────┐         ┌──────────┐         ┌─────────┐
│  Movie  │────────<│   Show   │>────────│ Screen  │
└─────────┘         └──────────┘         └─────────┘
                         │                    │
                         │                    │
                         ↓                    ↓
                    ┌──────────────┐     ┌────────┐
                    │ Reservation  │     │  Seat  │
                    └──────────────┘     └────────┘
                         │                    │
                         └───────┬────────────┘
                                 ↓
                         ┌──────────────┐
                         │ReservedSeat  │
                         └──────────────┘
```

### Database Schema

#### `movies`
```sql
CREATE TABLE movies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  duration    INTEGER NOT NULL -- minutes
);
```

#### `screens`
```sql
CREATE TABLE screens (
  id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL
);
```

#### `seats`
```sql
CREATE TABLE seats (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  row       VARCHAR(10) NOT NULL,
  number    INTEGER NOT NULL,
  seat_type VARCHAR(20) NOT NULL CHECK (seat_type IN ('REGULAR', 'PREMIUM', 'ACCESSIBLE')),
  UNIQUE (screen_id, row, number)
);
```

#### `shows`
```sql
CREATE TABLE shows (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  movie_id   UUID NOT NULL REFERENCES movies(id) ON DELETE RESTRICT,
  screen_id  UUID NOT NULL REFERENCES screens(id) ON DELETE RESTRICT,
  start_time TIMESTAMPTZ NOT NULL,
  duration   INTEGER NOT NULL, -- minutes
  base_price DECIMAL(10, 2) NOT NULL
);
```

#### `reservations`
```sql
CREATE TABLE reservations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      VARCHAR(100) NOT NULL,
  show_id      UUID NOT NULL REFERENCES shows(id) ON DELETE RESTRICT,
  status       VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED')),
  total_amount DECIMAL(10, 2) NOT NULL,
  expires_at   TIMESTAMPTZ, -- NULL when confirmed
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `reserved_seats`
```sql
CREATE TABLE reserved_seats (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  seat_id        UUID NOT NULL REFERENCES seats(id) ON DELETE RESTRICT,
  price          DECIMAL(10, 2) NOT NULL
);
```

---

## 5. API Specifications

### Base URL
```
http://localhost:3000/api
```

### Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| **Movies** |
| POST | `/movies` | Create a new movie | No |
| GET | `/movies` | List all movies | No |
| GET | `/movies/:id` | Get movie by ID | No |
| **Screens** |
| POST | `/screens` | Create screen with seats | No |
| GET | `/screens` | List all screens | No |
| GET | `/screens/:id` | Get screen by ID | No |
| **Shows** |
| POST | `/shows` | Create a new show | No |
| GET | `/shows` | Get shows (by movie) | No |
| GET | `/shows/:id` | Get show by ID | No |
| GET | `/shows/:id/seats` | Get seat availability | No |
| **Reservations** |
| POST | `/reservations` | Reserve seats | **Yes** |
| POST | `/reservations/:id/confirm` | Confirm reservation | **Yes** |
| DELETE | `/reservations/:id` | Cancel reservation | **Yes** |
| **Reporting** |
| GET | `/report` | Get sales report | No |

---

### Detailed API Specifications

#### 1. Create Movie
```http
POST /api/movies
Content-Type: application/json

{
  "title": "The Matrix",
  "description": "A computer hacker learns about the true nature of reality",
  "duration": 136
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "title": "The Matrix",
  "description": "...",
  "duration": 136
}
```

---

#### 2. Create Show
```http
POST /api/shows
Content-Type: application/json

{
  "movieId": "movie-uuid",
  "screenId": "screen-uuid",
  "startTime": "2025-10-25T19:00:00Z",
  "duration": 136,
  "basePrice": 15.00
}
```

**Validation:**
- Start time must be in the future
- No overlapping shows on the same screen

**Response (201 Created):**
```json
{
  "id": "show-uuid",
  "movie": { "id": "...", "title": "..." },
  "screen": { "id": "...", "name": "..." },
  "startTime": "2025-10-25T19:00:00Z",
  "duration": 136,
  "basePrice": 15.00
}
```

---

#### 3. Reserve Seats
```http
POST /api/reservations
Content-Type: application/json
X-User-Id: user-123

{
  "showId": "show-uuid",
  "seatIds": ["seat-uuid-1", "seat-uuid-2"]
}
```

**Response (201 Created):**
```json
{
  "id": "reservation-uuid",
  "userId": "user-123",
  "show": { "id": "...", "movie": {...}, "startTime": "..." },
  "status": "PENDING",
  "totalAmount": 25.00,
  "expiresAt": "2025-10-25T19:10:00Z",
  "createdAt": "2025-10-25T19:00:00Z",
  "reservedSeats": [
    {
      "id": "reserved-seat-1",
      "seat": { "id": "...", "row": "A", "number": 1, "seatType": "REGULAR" },
      "price": 10.00
    },
    {
      "id": "reserved-seat-2",
      "seat": { "id": "...", "row": "A", "number": 2, "seatType": "PREMIUM" },
      "price": 15.00
    }
  ]
}
```

**Errors:**
- `409 Conflict` - One or more seats already reserved
- `404 Not Found` - Show or seat not found
- `401 Unauthorized` - Missing X-User-Id header

---

#### 4. Confirm Reservation
```http
POST /api/reservations/:id/confirm
X-User-Id: user-123
```

**Response (200 OK):**
```json
{
  "id": "reservation-uuid",
  "status": "CONFIRMED",
  "expiresAt": null,
  "totalAmount": 25.00
}
```

**Errors:**
- `404 Not Found` - Reservation not found or unauthorized
- `400 Bad Request` - Reservation not in PENDING state

---

#### 5. Get Sales Report
```http
GET /api/report
```

**Response (200 OK):**
```json
[
  {
    "movie": {
      "id": "uuid-1",
      "title": "The Matrix"
    },
    "shows": [
      {
        "id": "show-uuid-1",
        "screen": { "id": "...", "name": "Screen 1" },
        "startTime": "2025-10-25T19:00:00Z",
        "totalSeats": 60,
        "soldTickets": 45,
        "remainingSeats": 15
      }
    ],
    "totalTicketsSold": 45
  }
]
```

---

## 6. Concurrency & Consistency

### Requirements

#### ✅ Atomic Reservation Creation

**The reservation process MUST atomically:**

1. ✅ Check seats are not already reserved/confirmed for that show
2. ✅ Create reservation record with PENDING status
3. ✅ Create reserved_seats records for each seat
4. ✅ Calculate and store total pricing

#### ✅ Database Transaction Requirements

**Use database transactions to:**
- Prevent double-booking
- Ensure data integrity
- Handle concurrent requests safely

#### Transaction Isolation Level

**Required:** `SERIALIZABLE` or `REPEATABLE READ`

```typescript
// Example transaction structure
await dataSource.transaction('SERIALIZABLE', async (manager) => {
  // 1. Check seat availability
  const existingReservations = await manager
    .find(/* query for existing reservations */);

  if (existingReservations.length > 0) {
    throw new ConflictException('Seats already reserved');
  }

  // 2. Create reservation
  const reservation = await manager.save(/* new reservation */);

  // 3. Create reserved seats
  await manager.save(/* reserved seats */);

  return reservation;
});
```

#### Race Condition Prevention

**Scenario:** Two users try to book the same seat simultaneously

```
User A: Check availability ──┐
                             ├──> Database ensures only one succeeds
User B: Check availability ──┘
```

**Solution:**
- Use SERIALIZABLE transaction isolation
- Database-level locking mechanisms
- Atomic check-and-set operations

---

## 7. Authentication & Authorization

### Simple Header-Based Authentication

**Method:** HTTP Header `X-User-Id`

#### Requirements

✅ **For all reservation endpoints:**
- Accept `X-User-Id` HTTP header as user identity
- Use for reservation ownership tracking
- Use for audit logging

✅ **No password/token required** for MVP

#### Header Format
```http
X-User-Id: user-123
```

#### Implementation

**Extract User ID:**
```typescript
@Get()
async getReservations(@Headers('x-user-id') userId: string) {
  if (!userId) {
    throw new UnauthorizedException('X-User-Id header is required');
  }
  // ... use userId
}
```

**Authorization:**
- Users can only cancel their own reservations
- Validate `reservation.userId === currentUserId` before deletion

#### Security Note

⚠️ This is a **simplified authentication** for MVP only.
Production systems should use:
- JWT tokens
- OAuth 2.0
- Proper session management

---

## 8. Testing Requirements

### Unit Tests

#### Coverage Requirements

**✅ REQUIRED:** Write unit tests for **all source code**

**Coverage Standard:**
- **1 positive test case** per method
- **1 negative test case** per method

#### Example Test Cases

**For `ReservationsService.create()`:**

```typescript
// ✅ Positive case
it('should create a reservation successfully', async () => {
  // Given: Valid show, available seats
  // When: Create reservation
  // Then: Returns reservation with PENDING status
});

// ✅ Negative case
it('should throw ConflictException when seats already reserved', async () => {
  // Given: Seats already reserved
  // When: Attempt to create reservation
  // Then: Throws ConflictException
});
```

#### Required Test Coverage

| Service/Component | Methods to Test | Positive Cases | Negative Cases |
|-------------------|----------------|----------------|----------------|
| MoviesService | create, findAll, findOne | 3 | 3 |
| ScreensService | create, findAll, findOne | 3 | 3 |
| ShowsService | create, findAll, findOne, getSeats | 4 | 4 |
| ReservationsService | create, confirm, cancel | 3 | 3 |
| ReportingService | getReport | 1 | 1 |
| ScheduleService | expireReservations | 1 | 1 |

**Total:** Minimum 15 positive + 15 negative = **30 test cases**

---

### Integration Tests

#### E2E Test Requirements

**✅ Required Integration Tests:**

1. **Positive Test: Complete Purchase Flow**
   ```typescript
   it('should complete purchase flow with multiple seats', async () => {
     // 1. Create movie, screen, show
     // 2. Reserve 2+ seats (PENDING)
     // 3. Confirm reservation (CONFIRMED)
     // 4. Verify seats are locked
     // 5. Verify pricing calculation
   });
   ```

2. **Negative Test: Seat Reservation Conflict**
   ```typescript
   it('should prevent double-booking', async () => {
     // 1. User A reserves seat
     // 2. User B attempts to reserve same seat
     // 3. Verify User B gets ConflictException
     // 4. Verify only User A has reservation
   });
   ```

#### Test Environment

- ✅ Use real PostgreSQL database (test instance)
- ✅ Clean database before/after tests
- ✅ Test concurrent requests
- ✅ Verify transaction rollbacks on errors

---

## 9. Success Criteria

### Functional Requirements

- ✅ All CRUD operations for movies, screens, shows work correctly
- ✅ Seat reservation prevents double-booking
- ✅ 10-minute reservation expiry works automatically
- ✅ Pricing calculation correct for all seat types
- ✅ Sales report shows accurate data

### Technical Requirements

- ✅ All unit tests pass (100% coverage of methods)
- ✅ All integration tests pass (purchase flow + conflicts)
- ✅ No race conditions in concurrent reservation scenarios
- ✅ Database migrations exist and run cleanly
- ✅ TypeScript strict mode with no errors
- ✅ Clean code with proper error handling

### Performance

- ✅ Reservation creation < 500ms
- ✅ Report generation < 2s for 1000 movies
- ✅ Concurrent requests handled safely

### Documentation

- ✅ API endpoints documented
- ✅ Database schema documented
- ✅ Setup instructions in README

---

## Appendix A: Sample Data Seed

### Sample Movies
```typescript
const movies = [
  { title: "The Matrix", duration: 136 },
  { title: "Inception", duration: 148 },
  { title: "Interstellar", duration: 169 }
];
```

### Sample Screen Layout (60 seats)
```
Rows: A-F (6 rows)
Seats per row: 10

Row A: PREMIUM (seats 1-10)
Row B: PREMIUM (seats 1-10)
Row C: REGULAR (seats 1-10)
Row D: REGULAR (seats 1-10)
Row E: REGULAR (seats 1-10)
Row F: ACCESSIBLE (seats 1, 10), REGULAR (seats 2-9)
```

### Sample Shows
```typescript
const shows = [
  {
    movieId: "matrix-id",
    screenId: "screen-1",
    startTime: "2025-10-25T14:00:00Z",
    duration: 136,
    basePrice: 12.00
  },
  {
    movieId: "matrix-id",
    screenId: "screen-2",
    startTime: "2025-10-25T19:00:00Z",
    duration: 136,
    basePrice: 15.00
  }
];
```

---

## Appendix B: Error Handling

### Standard HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Successful GET/PUT/DELETE |
| 201 | Successful POST (resource created) |
| 400 | Bad Request (validation errors) |
| 401 | Unauthorized (missing X-User-Id) |
| 404 | Resource not found |
| 409 | Conflict (seats already reserved, show time conflict) |
| 500 | Internal server error |

### Error Response Format

```json
{
  "statusCode": 409,
  "message": "One or more seats are already reserved",
  "error": "Conflict"
}
```

---

## Appendix C: Future Enhancements (Out of Scope for MVP)

- 🔮 Payment gateway integration
- 🔮 Email/SMS ticket delivery
- 🔮 QR code generation for tickets
- 🔮 Seat selection UI/visualization
- 🔮 Multiple pricing tiers (matinee, evening, weekend)
- 🔮 Loyalty programs and discounts
- 🔮 Admin dashboard
- 🔮 Analytics and business intelligence
- 🔮 Multi-language support
- 🔮 Mobile app integration

---

<div align="center">

**Document End**

For questions or clarifications, please contact the product team.

</div>
