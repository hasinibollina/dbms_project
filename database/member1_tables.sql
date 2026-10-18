-- Member 1 Schema Definitions
-- Module: User & Account Management

CREATE TABLE Users (
    user_id       SERIAL PRIMARY KEY,
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone         VARCHAR(20),
    role          VARCHAR(20) NOT NULL DEFAULT 'Attendee'
                  CHECK (role IN ('Attendee', 'Organizer', 'Admin')),
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Module: Event Categories
CREATE TABLE Categories (
    category_id SERIAL PRIMARY KEY,
    name        VARCHAR(80) NOT NULL UNIQUE,
    description VARCHAR(255)
);

-- Module: Venue Management
CREATE TABLE Venues (
    venue_id       SERIAL PRIMARY KEY,
    name           VARCHAR(120) NOT NULL,
    address        VARCHAR(255) NOT NULL,
    city           VARCHAR(80)  NOT NULL,
    capacity       INT NOT NULL CHECK (capacity > 0),
    price_per_hour DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price_per_hour >= 0),
    contact_phone  VARCHAR(20),
    description    TEXT,
    image_url      VARCHAR(255),
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
