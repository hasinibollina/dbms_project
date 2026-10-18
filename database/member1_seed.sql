-- Member 1 Seed Data
-- Inserts sample records for Users, Categories, Venues, and VenueOperatingHours

-- 1. Insert Sample Users
INSERT INTO Users (full_name, email, password_hash, phone, role) VALUES
('Sneha Admin', 'admin@eventhub.com', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', '+91 9876543210', 'Admin'),
('Arjun Mehta', 'arjun.organizer@gmail.com', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', '+91 9811122233', 'Organizer'),
('Priya Sharma', 'priya.events@gmail.com', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', '+91 9822233344', 'Organizer'),
('Rohan Verma', 'rohan.v@outlook.com', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', '+91 9833344455', 'Attendee'),
('Ananya Rao', 'ananya.rao@gmail.com', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', '+91 9844455566', 'Attendee')
ON CONFLICT (email) DO NOTHING;

-- 2. Insert Sample Categories
INSERT INTO Categories (name, description) VALUES
('Technology & AI', 'Conferences, hackathons, and tech workshops'),
('Music & Concerts', 'Live music performances, bands, and DJ nights'),
('Business & Networking', 'Investor summits, trade fairs, and entrepreneur meetups'),
('Arts & Theatre', 'Exhibitions, drama, and creative showcases'),
('Workshops & Learning', 'Hands-on skill building bootcamps')
ON CONFLICT (name) DO NOTHING;

-- 3. Insert Sample Venues
INSERT INTO Venues (name, address, city, capacity, price_per_hour, contact_phone, description, image_url, is_active) VALUES
('Apex Convention Center', '100 Silicon Boulevard', 'Bengaluru', 1500, 5000.00, '+91 8023456789', 'State-of-the-art auditorium with high-speed fiber internet and acoustic design.', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87', TRUE),
('Symphony Amphitheatre', '45 Green Meadows Road', 'Hyderabad', 800, 3500.00, '+91 4023456780', 'Open air amphitheatre surrounded by lush gardens, ideal for concerts.', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745', TRUE),
('Innovate Cowork & Hall', '12 MG Road', 'Mumbai', 250, 1500.00, '+91 2223456781', 'Modern modular event space with AV projectors and breakout rooms.', 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205', TRUE)
ON CONFLICT DO NOTHING;

-- 4. Insert Operating Hours for Venues (Mon-Sat 9 AM to 10 PM)
INSERT INTO VenueOperatingHours (venue_id, day_of_week, open_time, close_time, is_closed)
SELECT v.venue_id, d.day, '09:00:00'::TIME, '22:00:00'::TIME, FALSE
FROM Venues v
CROSS JOIN (SELECT generate_series(0, 5) AS day) d
ON CONFLICT DO NOTHING;
