# DBMS Project: Event & Venue Management System

A relational database management system (DBMS) project designed for managing event venues, organizer bookings, categories, and user accounts using PostgreSQL, SQLAlchemy, and FastAPI.

---

## Project Structure

```
dbms_project/
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore configuration
├── requirements              # Python dependencies
├── README.md                 # Project documentation
├── backend/
│   ├── .env                  # Local environment file (ignored by git)
│   ├── database.py           # SQLAlchemy engine & session management
│   └── test_connection.py   # Database connection health check utility
├── database/
│   ├── member1_tables.sql    # DDL schema definitions (Users, Categories, Venues, Hours)
│   └── member1_seed.sql      # Initial seed dataset for development & testing
└── frontend/                 # Frontend assets (reserved)
```

---

## Database Schema (Member 1 Tables)

### 1. `Users`
Stores system accounts with role-based access control.
- **`user_id`**: `SERIAL PRIMARY KEY`
- **`full_name`**: `VARCHAR(100) NOT NULL`
- **`email`**: `VARCHAR(150) NOT NULL UNIQUE`
- **`password_hash`**: `VARCHAR(255) NOT NULL`
- **`phone`**: `VARCHAR(20)`
- **`role`**: `VARCHAR(20) NOT NULL DEFAULT 'Attendee'` (Constraint: `'Attendee'`, `'Organizer'`, `'Admin'`)
- **`created_at`**: `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`

### 2. `Categories`
Classifies events into domains.
- **`category_id`**: `SERIAL PRIMARY KEY`
- **`name`**: `VARCHAR(80) NOT NULL UNIQUE`
- **`description`**: `VARCHAR(255)`

### 3. `Venues`
Manages venue locations, capacity, and pricing.
- **`venue_id`**: `SERIAL PRIMARY KEY`
- **`name`**: `VARCHAR(120) NOT NULL`
- **`address`**: `VARCHAR(255) NOT NULL`
- **`city`**: `VARCHAR(80) NOT NULL`
- **`capacity`**: `INT NOT NULL CHECK (capacity > 0)`
- **`price_per_hour`**: `DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price_per_hour >= 0)`
- **`contact_phone`**: `VARCHAR(20)`
- **`description`**: `TEXT`
- **`image_url`**: `VARCHAR(255)`
- **`is_active`**: `BOOLEAN NOT NULL DEFAULT TRUE`
- **`created_at`**: `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`

### 4. `VenueOperatingHours`
Tracks daily operating hours for each venue.
- **`hours_id`**: `SERIAL PRIMARY KEY`
- **`venue_id`**: `INT NOT NULL REFERENCES Venues(venue_id) ON DELETE CASCADE`
- **`day_of_week`**: `INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6)` (0 = Monday ... 6 = Sunday)
- **`open_time`**: `TIME`
- **`close_time`**: `TIME`
- **`is_closed`**: `BOOLEAN NOT NULL DEFAULT FALSE`
- **Constraints**:
  - `UNIQUE (venue_id, day_of_week)`
  - `CHECK (is_closed OR (open_time IS NOT NULL AND close_time IS NOT NULL AND open_time < close_time))`

---

## Getting Started

### 1. Prerequisites
- Python 3.10+
- PostgreSQL database (or Supabase instance)

### 2. Environment Setup
Create a virtual environment and install the required dependencies:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements
```

### 3. Configure Database Credentials
Copy the example environment file:
```bash
cp .env.example backend/.env
```
Edit `backend/.env` with your PostgreSQL connection URL:
```env
DATABASE_URL=postgresql+pg8000://postgres:PASSWORD@HOST:5432/postgres
```

### 4. Test Database Connection
Run the connection health check utility:
```bash
python backend/test_connection.py
```
Expected output:
```
Testing database connection...
[SUCCESS] Connected to database successfully!
[INFO] Database Engine: postgresql
```

### 5. Initialize Schema & Seed Data
Execute the SQL files in your PostgreSQL client or via Supabase SQL Editor:
1. `database/member1_tables.sql`
2. `database/member1_seed.sql`
