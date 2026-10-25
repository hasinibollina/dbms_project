-- Migration: Add venue hours and booking conflict safeguard trigger

-- 1. Add opening_time and closing_time to venues
ALTER TABLE venues
ADD COLUMN IF NOT EXISTS opening_time TIME DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS closing_time TIME DEFAULT '22:00:00';

-- 2. Populate sensible default hours for existing venues
UPDATE venues
SET opening_time = '08:00:00'
WHERE opening_time IS NULL;

UPDATE venues
SET closing_time = '22:00:00'
WHERE closing_time IS NULL;

-- 3. Replace placeholder 'string' test data with realistic venue data
UPDATE venues
SET name = 'Grand Palace Convention Center',
    address = '100 Silicon Boulevard',
    city = 'Bengaluru',
    capacity = 1500,
    price_per_hour = 5000.00,
    contact_phone = '+91 8023456789',
    description = 'State-of-the-art auditorium with high-speed fiber internet and acoustic design.'
WHERE venue_id = 1 AND name = 'string';

-- 4. Database-level safeguard trigger to prevent overlapping bookings for the same venue
CREATE OR REPLACE FUNCTION check_event_venue_conflict()
RETURNS TRIGGER AS $$
BEGIN
    -- If venue_id is NULL or status is cancelled, no conflict possible
    IF NEW.venue_id IS NULL OR NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;

    -- Overlap condition: existing.start_time < NEW.end_time AND existing.end_time > NEW.start_time
    -- Exclude cancelled events and exclude the row being updated (NEW.event_id)
    IF EXISTS (
        SELECT 1
        FROM events
        WHERE venue_id = NEW.venue_id
          AND status <> 'cancelled'
          AND (NEW.event_id IS NULL OR event_id <> NEW.event_id)
          AND start_time < NEW.end_time
          AND end_time > NEW.start_time
    ) THEN
        RAISE EXCEPTION 'Venue booking conflict: Another active event is already scheduled at this venue during the selected time period.'
            USING ERRCODE = '23P01';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_event_venue_conflict ON events;

CREATE TRIGGER trg_check_event_venue_conflict
BEFORE INSERT OR UPDATE OF venue_id, start_time, end_time, status ON events
FOR EACH ROW
EXECUTE FUNCTION check_event_venue_conflict();
