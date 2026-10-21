-- Module: Vendor Management & Event Vendor Links
-- DDL schema for vendors and event_vendors many-to-many relationship

CREATE TABLE IF NOT EXISTS vendors (
    vendor_id    SERIAL PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    city         VARCHAR(80)  NOT NULL,
    phone        VARCHAR(20),
    price_min    DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price_min >= 0),
    price_max    DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price_max >= price_min),
    rating       DECIMAL(3,2)  NOT NULL DEFAULT 4.5 CHECK (rating BETWEEN 1 AND 5),
    status       VARCHAR(20)   NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_vendors (
    event_id     BIGINT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    vendor_id    INT NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    agreed_cost  DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (agreed_cost >= 0),
    booking_status VARCHAR(30) NOT NULL DEFAULT 'Confirmed',
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, vendor_id)
);

-- Indexes for efficient JOIN and GROUP BY analytics
CREATE INDEX IF NOT EXISTS idx_vendors_service_type ON vendors(service_type);
CREATE INDEX IF NOT EXISTS idx_vendors_city ON vendors(city);
CREATE INDEX IF NOT EXISTS idx_event_vendors_vendor ON event_vendors(vendor_id);
CREATE INDEX IF NOT EXISTS idx_event_vendors_event ON event_vendors(event_id);
