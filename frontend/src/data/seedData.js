/**
 * Eventilion DBMS Seed Data & Storage Helpers
 * Aligned strictly with PostgreSQL database schema:
 * - Users (database/member1_tables.sql)
 * - Categories (database/member1_tables.sql)
 * - Venues & VenueOperatingHours (database/member1_tables.sql)
 * - Events & TicketType (database/member2_tables.sql)
 * - Vendors & EventVendors (database/vendors_schema.sql)
 * - Bookings, Payments, Reviews (database/member3_tables.sql)
 */

export function formatINR(val) {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  const num = Math.round(Number(val));
  return '₹' + num.toLocaleString('en-IN');
}

// --------------------------------------------------------------------------
// 1. Users (Supabase Auth & Profiles - No local demo accounts)
// --------------------------------------------------------------------------


// --------------------------------------------------------------------------
// 2. Categories (Categories table)
// Columns: category_id, name, description
// --------------------------------------------------------------------------
export const SEED_CATEGORIES = [
  {
    category_id: 1,
    name: 'Technology & AI',
    description: 'Conferences, hackathons, and tech workshops',
  },
  {
    category_id: 2,
    name: 'Music & Concerts',
    description: 'Live music performances, bands, and DJ nights',
  },
  {
    category_id: 3,
    name: 'Business & Networking',
    description: 'Investor summits, trade fairs, and entrepreneur meetups',
  },
  {
    category_id: 4,
    name: 'Arts & Theatre',
    description: 'Exhibitions, drama, and creative showcases',
  },
  {
    category_id: 5,
    name: 'Workshops & Learning',
    description: 'Hands-on skill building bootcamps',
  },
];

// --------------------------------------------------------------------------
// 3. Venues (Venues table & VenueOperatingHours table)
// Columns in Venues: venue_id, name, address, city, capacity, price_per_hour, contact_phone, description, image_url, is_active
// Columns in VenueOperatingHours: hours_id, venue_id, day_of_week, open_time, close_time, is_closed
// --------------------------------------------------------------------------
export const SEED_VENUES = [
  {
    venue_id: 1,
    name: 'Apex Convention Center',
    address: '100 Silicon Boulevard',
    city: 'Bengaluru',
    capacity: 1500,
    price_per_hour: 5000.0,
    contact_phone: '+91 8023456789',
    description: 'State-of-the-art auditorium with high-speed fiber internet and acoustic design.',
    image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    is_active: true,
    hours: [
      { hours_id: 1, venue_id: 1, day_of_week: 0, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 2, venue_id: 1, day_of_week: 1, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 3, venue_id: 1, day_of_week: 2, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 4, venue_id: 1, day_of_week: 3, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 5, venue_id: 1, day_of_week: 4, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 6, venue_id: 1, day_of_week: 5, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 7, venue_id: 1, day_of_week: 6, open_time: null, close_time: null, is_closed: true },
    ],
    // Aggregates for Admin Dashboard
    events_hosted: 8,
    total_bookings: 3570,
    utilisation_pct: 82.5,
    revenue_generated: 2232830,
  },
  {
    venue_id: 2,
    name: 'Symphony Amphitheatre',
    address: '45 Green Meadows Road',
    city: 'Hyderabad',
    capacity: 800,
    price_per_hour: 3500.0,
    contact_phone: '+91 4023456780',
    description: 'Open air amphitheatre surrounded by lush gardens, ideal for concerts.',
    image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
    is_active: true,
    hours: [
      { hours_id: 8, venue_id: 2, day_of_week: 0, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 9, venue_id: 2, day_of_week: 1, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 10, venue_id: 2, day_of_week: 2, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 11, venue_id: 2, day_of_week: 3, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 12, venue_id: 2, day_of_week: 4, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 13, venue_id: 2, day_of_week: 5, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 14, venue_id: 2, day_of_week: 6, open_time: null, close_time: null, is_closed: true },
    ],
    events_hosted: 6,
    total_bookings: 2240,
    utilisation_pct: 74.0,
    revenue_generated: 1813240,
  },
  {
    venue_id: 3,
    name: 'Innovate Cowork & Hall',
    address: '12 MG Road',
    city: 'Mumbai',
    capacity: 250,
    price_per_hour: 1500.0,
    contact_phone: '+91 2223456781',
    description: 'Modern modular event space with AV projectors and breakout rooms.',
    image_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80',
    is_active: true,
    hours: [
      { hours_id: 15, venue_id: 3, day_of_week: 0, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 16, venue_id: 3, day_of_week: 1, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 17, venue_id: 3, day_of_week: 2, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 18, venue_id: 3, day_of_week: 3, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 19, venue_id: 3, day_of_week: 4, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 20, venue_id: 3, day_of_week: 5, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 21, venue_id: 3, day_of_week: 6, open_time: null, close_time: null, is_closed: true },
    ],
    events_hosted: 5,
    total_bookings: 415,
    utilisation_pct: 65.0,
    revenue_generated: 499585,
  },
  {
    venue_id: 4,
    name: 'Grand Heritage Palace Grounds',
    address: '88 Palace Road, Vasanth Nagar',
    city: 'Bengaluru',
    capacity: 2500,
    price_per_hour: 8500.0,
    contact_phone: '+91 8023499112',
    description: 'Majestic open lawn and vintage ballroom suitable for large exhibitions and cultural galas.',
    image_url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
    is_active: true,
    hours: [
      { hours_id: 22, venue_id: 4, day_of_week: 0, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 23, venue_id: 4, day_of_week: 1, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 24, venue_id: 4, day_of_week: 2, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 25, venue_id: 4, day_of_week: 3, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 26, venue_id: 4, day_of_week: 4, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 27, venue_id: 4, day_of_week: 5, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 28, venue_id: 4, day_of_week: 6, open_time: null, close_time: null, is_closed: true },
    ],
    events_hosted: 4,
    total_bookings: 1950,
    utilisation_pct: 58.0,
    revenue_generated: 1450000,
  },
  {
    venue_id: 5,
    name: 'CyberHub Expo Dome',
    address: '24 HITEC City Main Avenue',
    city: 'Hyderabad',
    capacity: 1200,
    price_per_hour: 4200.0,
    contact_phone: '+91 4044998811',
    description: 'High-ceiling dome pavilion with heavy power feeds and exhibition booth layouts.',
    image_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    is_active: true,
    hours: [
      { hours_id: 29, venue_id: 5, day_of_week: 0, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 30, venue_id: 5, day_of_week: 1, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 31, venue_id: 5, day_of_week: 2, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 32, venue_id: 5, day_of_week: 3, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 33, venue_id: 5, day_of_week: 4, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 34, venue_id: 5, day_of_week: 5, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 35, venue_id: 5, day_of_week: 6, open_time: null, close_time: null, is_closed: true },
    ],
    events_hosted: 3,
    total_bookings: 890,
    utilisation_pct: 48.0,
    revenue_generated: 620000,
  },
  {
    venue_id: 6,
    name: 'Bayside Pavilions & Green',
    address: '7 Marine Promenade, Colaba',
    city: 'Mumbai',
    capacity: 600,
    price_per_hour: 2800.0,
    contact_phone: '+91 2233445566',
    description: 'Scenic seaside lawn pavilion capturing cool evening ocean breeze for cocktail parties.',
    image_url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80',
    is_active: true,
    hours: [
      { hours_id: 36, venue_id: 6, day_of_week: 0, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 37, venue_id: 6, day_of_week: 1, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 38, venue_id: 6, day_of_week: 2, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 39, venue_id: 6, day_of_week: 3, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 40, venue_id: 6, day_of_week: 4, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 41, venue_id: 6, day_of_week: 5, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { hours_id: 42, venue_id: 6, day_of_week: 6, open_time: null, close_time: null, is_closed: true },
    ],
    events_hosted: 2,
    total_bookings: 480,
    utilisation_pct: 40.0,
    revenue_generated: 310000,
  },
];

// --------------------------------------------------------------------------
// 4. Vendors (vendors table in database/vendors_schema.sql)
// Columns: vendor_id, name, service_type, city, phone, price_min, price_max, rating, status
// CHECK: status IN ('Active', 'Inactive')
// CHECK: rating BETWEEN 1 AND 5
// CHECK: price_max >= price_min
// Note: 'description' does not exist in schema and is omitted.
// --------------------------------------------------------------------------
export const SEED_VENDORS = [
  {
    vendor_id: 1,
    name: 'Royal Rasoi Caterers',
    service_type: 'Catering',
    city: 'Bengaluru',
    phone: '+91 9845012345',
    price_min: 40000.0,
    price_max: 150000.0,
    rating: 4.9,
    status: 'Active',
    events_served: 14,
  },
  {
    vendor_id: 2,
    name: 'SoundCraft Acoustics & Lighting',
    service_type: 'Sound & AV',
    city: 'Mumbai',
    phone: '+91 9820054321',
    price_min: 30000.0,
    price_max: 95000.0,
    rating: 4.8,
    status: 'Active',
    events_served: 18,
  },
  {
    vendor_id: 3,
    name: 'Utsav Mandap & Floral Decor',
    service_type: 'Stage & Decor',
    city: 'Hyderabad',
    phone: '+91 9849033445',
    price_min: 50000.0,
    price_max: 200000.0,
    rating: 4.7,
    status: 'Active',
    events_served: 11,
  },
  {
    vendor_id: 4,
    name: 'Prism Lens Studios & Cinematography',
    service_type: 'Photography & Video',
    city: 'Bengaluru',
    phone: '+91 9900011223',
    price_min: 35000.0,
    price_max: 85000.0,
    rating: 4.9,
    status: 'Active',
    events_served: 16,
  },
  {
    vendor_id: 5,
    name: 'Spice Route Banquets & Buffets',
    service_type: 'Catering',
    city: 'Hyderabad',
    phone: '+91 9701044556',
    price_min: 60000.0,
    price_max: 180000.0,
    rating: 4.6,
    status: 'Active',
    events_served: 9,
  },
  {
    vendor_id: 6,
    name: 'ThunderStage Truss & Rigging',
    service_type: 'Stage & Decor',
    city: 'Mumbai',
    phone: '+91 9819077889',
    price_min: 75000.0,
    price_max: 250000.0,
    rating: 4.8,
    status: 'Active',
    events_served: 12,
  },
  {
    vendor_id: 7,
    name: 'Apex Visuals LED Walls & 4K Projections',
    service_type: 'Sound & AV',
    city: 'Bengaluru',
    phone: '+91 9845099887',
    price_min: 45000.0,
    price_max: 120000.0,
    rating: 4.9,
    status: 'Active',
    events_served: 20,
  },
  {
    vendor_id: 8,
    name: 'Garuda Security & Crowd Management',
    service_type: 'Security & Hospitality',
    city: 'Bengaluru',
    phone: '+91 9844022334',
    price_min: 20000.0,
    price_max: 50000.0,
    rating: 4.5,
    status: 'Active',
    events_served: 22,
  },
  {
    vendor_id: 9,
    name: 'ShutterMagic Candid Photo & Drone',
    service_type: 'Photography & Video',
    city: 'Mumbai',
    phone: '+91 9821033221',
    price_min: 40000.0,
    price_max: 90000.0,
    rating: 4.7,
    status: 'Active',
    events_served: 13,
  },
  {
    vendor_id: 10,
    name: 'Deccan Delight Biryani & Live Counters',
    service_type: 'Catering',
    city: 'Hyderabad',
    phone: '+91 9848011998',
    price_min: 35000.0,
    price_max: 110000.0,
    rating: 4.8,
    status: 'Active',
    events_served: 15,
  },
  {
    vendor_id: 11,
    name: 'Nirvana Acoustic Engineering',
    service_type: 'Sound & AV',
    city: 'Hyderabad',
    phone: '+91 9700033211',
    price_min: 25000.0,
    price_max: 70000.0,
    rating: 4.6,
    status: 'Inactive',
    events_served: 7,
  },
  {
    vendor_id: 12,
    name: 'Elegance Flora & Theme Stylists',
    service_type: 'Stage & Decor',
    city: 'Bengaluru',
    phone: '+91 9988011224',
    price_min: 55000.0,
    price_max: 160000.0,
    rating: 4.8,
    status: 'Active',
    events_served: 10,
  },
  {
    vendor_id: 13,
    name: 'KnightGuard VIP Bouncers & Stewards',
    service_type: 'Security & Hospitality',
    city: 'Mumbai',
    phone: '+91 9820066778',
    price_min: 25000.0,
    price_max: 65000.0,
    rating: 4.6,
    status: 'Active',
    events_served: 17,
  },
  {
    vendor_id: 14,
    name: 'PixelMotion Live Streaming & Webcast',
    service_type: 'Photography & Video',
    city: 'Hyderabad',
    phone: '+91 9849088776',
    price_min: 28000.0,
    price_max: 60000.0,
    rating: 4.7,
    status: 'Active',
    events_served: 8,
  },
];

// --------------------------------------------------------------------------
// 5. Events (events table in database/member2_tables.sql)
// Columns: event_id, title, description, organizer_id, category_id, venue_id, start_time, end_time, ticket_price, capacity, status
// Joined / Aggregate fields: organizer, organizer_email, venue, city, category, tickets_sold, revenue
// Foreign Keys:
//   organizer_id -> Users(user_id)
//   category_id  -> Categories(category_id)
//   venue_id     -> Venues(venue_id)
// --------------------------------------------------------------------------
export const SEED_EVENTS = [
  {
    event_id: 101,
    title: 'Future of Generative AI Summit 2026',
    description: 'A two-day multi-track conference featuring keynotes on LLMs, agentic AI systems, and enterprise vector databases.',
    organizer_id: 2, // Arjun Mehta
    category_id: 1,  // Technology & AI
    venue_id: 1,     // Apex Convention Center
    start_time: '2026-11-14 10:00:00',
    end_time: '2026-11-15 18:00:00',
    ticket_price: 1499.0,
    capacity: 1500,
    status: 'Scheduled',
    // Joined display fields
    organizer: 'Arjun Mehta',
    organizer_email: 'arjun.organizer@gmail.com',
    venue: 'Apex Convention Center',
    city: 'Bengaluru',
    category: 'Technology & AI',
    tickets_sold: 1320,
    revenue: 1978680.0,
    // Backwards-compatible aliases
    date: '2026-11-14 10:00:00',
    price: 1499.0,
  },
  {
    event_id: 102,
    title: 'Acoustic Sunset Symphony & Jazz Night',
    description: 'Live performance by premier jazz musicians and orchestral string ensembles under the open evening sky.',
    organizer_id: 1, // Sneha Admin
    category_id: 2,  // Music & Concerts
    venue_id: 2,     // Symphony Amphitheatre
    start_time: '2026-10-30 18:30:00',
    end_time: '2026-10-30 22:00:00',
    ticket_price: 899.0,
    capacity: 800,
    status: 'Scheduled',
    organizer: 'Sneha Admin',
    organizer_email: 'admin@example.com',
    venue: 'Symphony Amphitheatre',
    city: 'Hyderabad',
    category: 'Music & Concerts',
    tickets_sold: 760,
    revenue: 683240.0,
    date: '2026-10-30 18:30:00',
    price: 899.0,
  },
  {
    event_id: 103,
    title: 'Angel Investors & Startup Pitch Day',
    description: '20 curated early-stage startups pitching to leading venture capitalists, angel syndicates, and founders.',
    organizer_id: 2, // Arjun Mehta
    category_id: 3,  // Business & Networking
    venue_id: 3,     // Innovate Cowork & Hall
    start_time: '2026-11-05 14:00:00',
    end_time: '2026-11-05 19:00:00',
    ticket_price: 499.0,
    capacity: 250,
    status: 'Scheduled',
    organizer: 'Arjun Mehta',
    organizer_email: 'arjun.organizer@gmail.com',
    venue: 'Innovate Cowork & Hall',
    city: 'Mumbai',
    category: 'Business & Networking',
    tickets_sold: 220,
    revenue: 109780.0,
    date: '2026-11-05 14:00:00',
    price: 499.0,
  },
  {
    event_id: 104,
    title: 'Modern Digital Art & Interactive Installation',
    description: 'Immersive light installations, algorithmic projections, and generative digital artwork galleries.',
    organizer_id: 3, // Priya Sharma
    category_id: 4,  // Arts & Theatre
    venue_id: 1,     // Apex Convention Center
    start_time: '2026-10-12 11:00:00',
    end_time: '2026-10-12 19:00:00',
    ticket_price: 0.0,
    capacity: 1500,
    status: 'Completed',
    organizer: 'Priya Sharma',
    organizer_email: 'priya.events@gmail.com',
    venue: 'Apex Convention Center',
    city: 'Bengaluru',
    category: 'Arts & Theatre',
    tickets_sold: 1400,
    revenue: 0.0,
    date: '2026-10-12 11:00:00',
    price: 0.0,
  },
  {
    event_id: 105,
    title: 'Full-Stack DBMS & Cloud Architecture Bootcamp',
    description: 'Hands-on intensive masterclass on PostgreSQL query optimization, relational indexing, and ACID transaction semantics.',
    organizer_id: 1, // Sneha Admin
    category_id: 5,  // Workshops & Learning
    venue_id: 3,     // Innovate Cowork & Hall
    start_time: '2026-11-28 09:00:00',
    end_time: '2026-11-28 17:00:00',
    ticket_price: 1999.0,
    capacity: 250,
    status: 'Scheduled',
    organizer: 'Sneha Admin',
    organizer_email: 'admin@example.com',
    venue: 'Innovate Cowork & Hall',
    city: 'Mumbai',
    category: 'Workshops & Learning',
    tickets_sold: 195,
    revenue: 389805.0,
    date: '2026-11-28 09:00:00',
    price: 1999.0,
  },
  {
    event_id: 106,
    title: 'Classical Strings & Fusion Orchestra Live',
    description: 'An evening celebrating Eastern classical melodies fused with Western orchestral harmonies.',
    organizer_id: 3, // Priya Sharma
    category_id: 2,  // Music & Concerts
    venue_id: 2,     // Symphony Amphitheatre
    start_time: '2026-09-25 19:00:00',
    end_time: '2026-09-25 22:30:00',
    ticket_price: 1200.0,
    capacity: 800,
    status: 'Completed',
    organizer: 'Priya Sharma',
    organizer_email: 'priya.events@gmail.com',
    venue: 'Symphony Amphitheatre',
    city: 'Hyderabad',
    category: 'Music & Concerts',
    tickets_sold: 800,
    revenue: 960000.0,
    date: '2026-09-25 19:00:00',
    price: 1200.0,
  },
  {
    event_id: 107,
    title: 'Autonomous Systems & Robotics Hackathon',
    description: '48-hour challenge building ROS 2 drones, perception models, and self-navigating rovers.',
    organizer_id: 2, // Arjun Mehta
    category_id: 1,  // Technology & AI
    venue_id: 1,     // Apex Convention Center
    start_time: '2026-12-12 09:00:00',
    end_time: '2026-12-14 09:00:00',
    ticket_price: 299.0,
    capacity: 1200,
    status: 'Scheduled',
    organizer: 'Arjun Mehta',
    organizer_email: 'arjun.organizer@gmail.com',
    venue: 'Apex Convention Center',
    city: 'Bengaluru',
    category: 'Technology & AI',
    tickets_sold: 850,
    revenue: 254150.0,
    date: '2026-12-12 09:00:00',
    price: 299.0,
  },
  {
    event_id: 108,
    title: 'Culinary Heritage Food & Craft Expo',
    description: 'Regional artisans and heritage recipe preservationists presenting live tasting stalls.',
    organizer_id: 1, // Sneha Admin
    category_id: 4,  // Arts & Theatre
    venue_id: 4,     // Grand Heritage Palace Grounds
    start_time: '2026-09-15 11:00:00',
    end_time: '2026-09-15 20:00:00',
    ticket_price: 199.0,
    capacity: 2500,
    status: 'Completed',
    organizer: 'Sneha Admin',
    organizer_email: 'admin@example.com',
    venue: 'Grand Heritage Palace Grounds',
    city: 'Bengaluru',
    category: 'Arts & Theatre',
    tickets_sold: 2100,
    revenue: 417900.0,
    date: '2026-09-15 11:00:00',
    price: 199.0,
  },
  {
    event_id: 109,
    title: 'National FinTech & Web3 Builders Conclave',
    description: 'Deep dive into decentralized rails, open banking APIs, and high frequency ledger architecture.',
    organizer_id: 2, // Arjun Mehta
    category_id: 1,  // Technology & AI
    venue_id: 5,     // CyberHub Expo Dome
    start_time: '2026-12-05 10:00:00',
    end_time: '2026-12-05 18:30:00',
    ticket_price: 999.0,
    capacity: 1200,
    status: 'Scheduled',
    organizer: 'Arjun Mehta',
    organizer_email: 'arjun.organizer@gmail.com',
    venue: 'CyberHub Expo Dome',
    city: 'Hyderabad',
    category: 'Technology & AI',
    tickets_sold: 620,
    revenue: 619380.0,
    date: '2026-12-05 10:00:00',
    price: 999.0,
  },
  {
    event_id: 110,
    title: 'Sunset Bollywood Electro Carnival',
    description: 'High energy DJ sets with laser show and open air food court beside the Mumbai bay.',
    organizer_id: 3, // Priya Sharma
    category_id: 2,  // Music & Concerts
    venue_id: 6,     // Bayside Pavilions & Green
    start_time: '2026-11-19 17:00:00',
    end_time: '2026-11-19 23:30:00',
    ticket_price: 799.0,
    capacity: 600,
    status: 'Scheduled',
    organizer: 'Priya Sharma',
    organizer_email: 'priya.events@gmail.com',
    venue: 'Bayside Pavilions & Green',
    city: 'Mumbai',
    category: 'Music & Concerts',
    tickets_sold: 450,
    revenue: 359550.0,
    date: '2026-11-19 17:00:00',
    price: 799.0,
  },
  {
    event_id: 111,
    title: 'Enterprise Product Leadership Summit',
    description: 'Connecting VPs of Product and Tech founders scaling B2B SaaS solutions globally.',
    organizer_id: 1, // Sneha Admin
    category_id: 3,  // Business & Networking
    venue_id: 3,     // Innovate Cowork & Hall
    start_time: '2026-12-18 09:30:00',
    end_time: '2026-12-18 17:30:00',
    ticket_price: 1499.0,
    capacity: 250,
    status: 'Scheduled',
    organizer: 'Sneha Admin',
    organizer_email: 'admin@example.com',
    venue: 'Innovate Cowork & Hall',
    city: 'Mumbai',
    category: 'Business & Networking',
    tickets_sold: 140,
    revenue: 209860.0,
    date: '2026-12-18 09:30:00',
    price: 1499.0,
  },
  {
    event_id: 112,
    title: 'Indie Game Developers Showcase & Jam',
    description: 'Over 40 independent game titles on live arcade playable demo rigs.',
    organizer_id: 2, // Arjun Mehta
    category_id: 1,  // Technology & AI
    venue_id: 1,     // Apex Convention Center
    start_time: '2026-08-20 10:00:00',
    end_time: '2026-08-20 18:00:00',
    ticket_price: 349.0,
    capacity: 1200,
    status: 'Completed',
    organizer: 'Arjun Mehta',
    organizer_email: 'arjun.organizer@gmail.com',
    venue: 'Apex Convention Center',
    city: 'Bengaluru',
    category: 'Technology & AI',
    tickets_sold: 1100,
    revenue: 383900.0,
    date: '2026-08-20 10:00:00',
    price: 349.0,
  },
  {
    event_id: 113,
    title: 'Agile DevOps & Kubernetes Masterclass',
    description: 'Cluster orchestration, GitOps automation, and security scanning on production AWS clusters.',
    organizer_id: 1, // Sneha Admin
    category_id: 5,  // Workshops & Learning
    venue_id: 3,     // Innovate Cowork & Hall
    start_time: '2026-10-02 09:00:00',
    end_time: '2026-10-02 17:00:00',
    ticket_price: 1299.0,
    capacity: 250,
    status: 'Completed',
    organizer: 'Sneha Admin',
    organizer_email: 'admin@example.com',
    venue: 'Innovate Cowork & Hall',
    city: 'Mumbai',
    category: 'Workshops & Learning',
    tickets_sold: 210,
    revenue: 272790.0,
    date: '2026-10-02 09:00:00',
    price: 1299.0,
  },
  {
    event_id: 114,
    title: 'Monsoon Classical Drama Festival',
    description: 'Three live theatrical plays staged by award-winning independent drama troupes.',
    organizer_id: 3, // Priya Sharma
    category_id: 4,  // Arts & Theatre
    venue_id: 2,     // Symphony Amphitheatre
    start_time: '2026-07-28 18:00:00',
    end_time: '2026-07-28 21:30:00',
    ticket_price: 499.0,
    capacity: 800,
    status: 'Completed',
    organizer: 'Priya Sharma',
    organizer_email: 'priya.events@gmail.com',
    venue: 'Symphony Amphitheatre',
    city: 'Hyderabad',
    category: 'Arts & Theatre',
    tickets_sold: 720,
    revenue: 359280.0,
    date: '2026-07-28 18:00:00',
    price: 499.0,
  },
  {
    event_id: 115,
    title: 'Global CleanTech & EV Mobility Summit',
    description: 'Electric vehicle charging grid innovations and battery chemistry breakthrough forum.',
    organizer_id: 2, // Arjun Mehta
    category_id: 3,  // Business & Networking
    venue_id: 4,     // Grand Heritage Palace Grounds
    start_time: '2026-12-22 09:00:00',
    end_time: '2026-12-23 18:00:00',
    ticket_price: 899.0,
    capacity: 2500,
    status: 'Scheduled',
    organizer: 'Arjun Mehta',
    organizer_email: 'arjun.organizer@gmail.com',
    venue: 'Grand Heritage Palace Grounds',
    city: 'Bengaluru',
    category: 'Business & Networking',
    tickets_sold: 650,
    revenue: 584350.0,
    date: '2026-12-22 09:00:00',
    price: 899.0,
  },
];

// --------------------------------------------------------------------------
// 6. Admin Analytics Aggregates (from events, bookings, venues, vendors, reviews)
// --------------------------------------------------------------------------
export const SEED_STATS = {
  total_events: 15,
  upcoming_events: 9,
  completed_events: 6,
  total_registrations: 10470,
  total_revenue: 7000935.0,
  total_venues: 6,
  total_vendors: 14,
  active_vendors: 13,
  inactive_vendors: 1,
  avg_rating: 4.8,

  // Registrations per week for the last 12 weeks
  weekly_registrations: [
    { week: 'W1', label: 'Week 1', registrations: 180, revenue: 65000 },
    { week: 'W2', label: 'Week 2', registrations: 240, revenue: 82000 },
    { week: 'W3', label: 'Week 3', registrations: 290, revenue: 98000 },
    { week: 'W4', label: 'Week 4', registrations: 340, revenue: 110000 },
    { week: 'W5', label: 'Week 5', registrations: 310, revenue: 95000 },
    { week: 'W6', label: 'Week 6', registrations: 420, revenue: 145000 },
    { week: 'W7', label: 'Week 7', registrations: 390, revenue: 125000 },
    { week: 'W8', label: 'Week 8', registrations: 480, revenue: 165000 },
    { week: 'W9', label: 'Week 9', registrations: 520, revenue: 180000 },
    { week: 'W10', label: 'Week 10', registrations: 490, revenue: 155000 },
    { week: 'W11', label: 'Week 11', registrations: 560, revenue: 195000 },
    { week: 'W12', label: 'Week 12', registrations: 590, revenue: 215000 },
  ],

  // Revenue by event category
  category_revenue: [
    { category: 'Technology & AI', revenue: 3236110, events: 5 },
    { category: 'Music & Concerts', revenue: 2002790, events: 3 },
    { category: 'Business & Networking', revenue: 903990, events: 3 },
    { category: 'Workshops & Learning', revenue: 662595, events: 2 },
    { category: 'Arts & Theatre', revenue: 777180, events: 3 },
  ],
};

// --------------------------------------------------------------------------
// 7. Local Storage Persistence Helpers
// --------------------------------------------------------------------------

export function getStoredVendors() {
  try {
    const raw = localStorage.getItem('eventilion_demo_vendors');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed reading demo vendors from localStorage', e);
  }
  return SEED_VENDORS;
}

export function saveStoredVendors(vendors) {
  try {
    localStorage.setItem('eventilion_demo_vendors', JSON.stringify(vendors));
  } catch (e) {
    console.warn('Failed saving demo vendors to localStorage', e);
  }
}

export function getStoredEvents() {
  try {
    const raw = localStorage.getItem('eventilion_demo_events');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed reading demo events from localStorage', e);
  }
  return SEED_EVENTS;
}

export function saveStoredEvents(events) {
  try {
    localStorage.setItem('eventilion_demo_events', JSON.stringify(events));
  } catch (e) {
    console.warn('Failed saving demo events to localStorage', e);
  }
}

export function getStoredVenues() {
  try {
    const raw = localStorage.getItem('eventilion_demo_venues');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed reading demo venues from localStorage', e);
  }
  return SEED_VENUES;
}

export function saveStoredVenues(venues) {
  try {
    localStorage.setItem('eventilion_demo_venues', JSON.stringify(venues));
  } catch (e) {
    console.warn('Failed saving demo venues to localStorage', e);
  }
}
