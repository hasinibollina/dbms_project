import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Tag,
  ArrowRight,
  Sparkles,
  Building2,
  Calendar,
  Layers,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Ticket,
} from 'lucide-react';
import { categoriesApi, venuesApi, eventsApi } from '../api';
import VenueCard from '../components/VenueCard';
import EventCard from '../components/EventCard';
import { VenueCardSkeleton, EventCardSkeleton } from '../components/Skeleton';

// DBMS Seed Categories fallback (database/member1_seed.sql)
const FALLBACK_CATEGORIES = [
  { category_id: 1, name: 'Technology & AI', description: 'Conferences, hackathons, and tech workshops' },
  { category_id: 2, name: 'Music & Concerts', description: 'Live music performances, bands, and DJ nights' },
  { category_id: 3, name: 'Business & Networking', description: 'Investor summits, trade fairs, and entrepreneur meetups' },
  { category_id: 4, name: 'Arts & Theatre', description: 'Exhibitions, drama, and creative showcases' },
  { category_id: 5, name: 'Workshops & Learning', description: 'Hands-on skill building bootcamps' },
];

// Seed Venues fallback
const FALLBACK_VENUES = [
  {
    venue_id: 1,
    name: 'Apex Convention Center',
    address: '100 Silicon Boulevard',
    city: 'Bengaluru',
    capacity: 1500,
    price_per_hour: 5000.0,
    description: 'State-of-the-art auditorium with high-speed fiber internet and acoustic design.',
    image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    hours: [
      { day_of_week: 0, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { day_of_week: 1, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { day_of_week: 2, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { day_of_week: 3, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { day_of_week: 4, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { day_of_week: 5, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { day_of_week: 6, open_time: null, close_time: null, is_closed: true },
    ],
  },
  {
    venue_id: 2,
    name: 'Symphony Amphitheatre',
    address: '45 Green Meadows Road',
    city: 'Hyderabad',
    capacity: 800,
    price_per_hour: 3500.0,
    description: 'Open air amphitheatre surrounded by lush gardens, ideal for concerts.',
    image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
    hours: [
      { day_of_week: 0, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { day_of_week: 1, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { day_of_week: 2, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { day_of_week: 3, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { day_of_week: 4, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { day_of_week: 5, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { day_of_week: 6, open_time: null, close_time: null, is_closed: true },
    ],
  },
  {
    venue_id: 3,
    name: 'Innovate Cowork & Hall',
    address: '12 MG Road',
    city: 'Mumbai',
    capacity: 250,
    price_per_hour: 1500.0,
    description: 'Modern modular event space with AV projectors and breakout rooms.',
    image_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80',
    hours: [
      { day_of_week: 0, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { day_of_week: 1, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { day_of_week: 2, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { day_of_week: 3, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { day_of_week: 4, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { day_of_week: 5, open_time: '09:00:00', close_time: '22:00:00', is_closed: false },
      { day_of_week: 6, open_time: null, close_time: null, is_closed: true },
    ],
  },
];

// Fallback Mock Events for Home preview
const FALLBACK_EVENTS = [
  {
    event_id: 101,
    title: 'Future of Generative AI Summit 2026',
    date: '2026-11-14T10:00:00',
    venue: 'Apex Convention Center',
    city: 'Bengaluru',
    price: 1499,
    category: 'Technology & AI',
    image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
  },
  {
    event_id: 102,
    title: 'Acoustic Sunset Symphony & Jazz Night',
    date: '2026-10-30T18:30:00',
    venue: 'Symphony Amphitheatre',
    city: 'Hyderabad',
    price: 899,
    category: 'Music & Concerts',
    image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
  },
  {
    event_id: 103,
    title: 'Angel Investors & Startup Pitch Day',
    date: '2026-11-05T14:00:00',
    venue: 'Innovate Cowork & Hall',
    city: 'Mumbai',
    price: 499,
    category: 'Business & Networking',
    image_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80',
  },
];

export default function Home() {
  const navigate = useNavigate();

  // Search Bar State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [searchCategory, setSearchCategory] = useState('');

  // Data States
  const [categories, setCategories] = useState([]);
  const [venues, setVenues] = useState([]);
  const [events, setEvents] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Load Categories from GET /categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await categoriesApi.getAll();
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        } else {
          setCategories(FALLBACK_CATEGORIES);
        }
      } catch (err) {
        console.warn('Categories API unavailable, using seed categories:', err.message);
        setCategories(FALLBACK_CATEGORIES);
      }
    }
    fetchCategories();
  }, []);

  // Load Venues
  useEffect(() => {
    async function fetchVenues() {
      setLoadingVenues(true);
      try {
        const data = await venuesApi.getAll();
        if (Array.isArray(data) && data.length > 0) {
          setVenues(data.slice(0, 3));
        } else {
          setVenues(FALLBACK_VENUES);
        }
      } catch {
        setVenues(FALLBACK_VENUES);
      } finally {
        setLoadingVenues(false);
      }
    }
    fetchVenues();
  }, []);

  // Load Events
  useEffect(() => {
    async function fetchEvents() {
      setLoadingEvents(true);
      try {
        const data = await eventsApi.getAll();
        if (Array.isArray(data) && data.length > 0) {
          setEvents(data.slice(0, 3));
        } else {
          setEvents(FALLBACK_EVENTS);
        }
      } catch {
        setEvents(FALLBACK_EVENTS);
      } finally {
        setLoadingEvents(false);
      }
    }
    fetchEvents();
  }, []);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (searchCity) params.set('city', searchCity);
    if (searchCategory) params.set('category', searchCategory);
    navigate(`/events?${params.toString()}`);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. HERO SECTION (Wine background, large uppercase poster heading, search bar, category chips) */}
      <section className="bg-wine text-sand pt-16 pb-20 px-4 sm:px-6 lg:px-8 border-b-4 border-wine-dark shadow-poster relative overflow-hidden">
        {/* Subtle decorative background watermark */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 opacity-5 pointer-events-none select-none font-heading text-[280px] font-black uppercase text-sand leading-none">
          EVENT
        </div>

        <div className="max-w-6xl mx-auto space-y-8 relative z-10 text-center">
          
          {/* Project Tag */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-wine-dark text-sand text-xs font-semibold uppercase tracking-widest border border-sand/30 shadow-sm animate-fadeIn">
            <Sparkles className="w-3.5 h-3.5" />
            <span>DBMS Event Management Platform</span>
          </div>

          {/* Huge Uppercase Heading */}
          <h1 className="font-heading text-5xl sm:text-7xl md:text-8xl lg:text-9xl uppercase tracking-tighter text-sand max-w-5xl mx-auto leading-none drop-shadow-sm">
            RESERVE. HOST. EXPERIENCE.
          </h1>

          <p className="max-w-2xl mx-auto text-sand/85 text-base sm:text-lg md:text-xl font-medium leading-relaxed">
            Eventilion connects organizers with verified auditoriums, amphitheaters, and creative spaces featuring synchronized DBMS daily schedules and real-time open hours.
          </p>

          {/* Integrated Search Bar (Text + City + Category + Submit) */}
          <div className="max-w-4xl mx-auto pt-4">
            <form
              onSubmit={handleSearchSubmit}
              className="bg-sand text-ink p-2 sm:p-3 rounded-2xl md:rounded-3xl shadow-poster border-2 border-sand-dark flex flex-col md:flex-row items-stretch gap-2"
            >
              {/* Text Search */}
              <div className="flex-1 relative flex items-center min-w-[200px]">
                <Search className="w-5 h-5 text-wine absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search events, topics, or venues..."
                  className="w-full pl-11 pr-3 py-3 bg-transparent text-sm font-medium text-ink placeholder-ink/50 focus:outline-none"
                />
              </div>

              {/* Divider on desktop */}
              <div className="hidden md:block w-px bg-sand-dark my-2" />

              {/* City Dropdown */}
              <div className="relative flex items-center min-w-[160px]">
                <MapPin className="w-4 h-4 text-wine absolute left-3 pointer-events-none" />
                <select
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  className="w-full pl-9 pr-8 py-3 bg-transparent text-xs sm:text-sm font-semibold text-ink focus:outline-none cursor-pointer appearance-none"
                >
                  <option value="">Any Location</option>
                  <option value="Bengaluru">Bengaluru</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Delhi NCR">Delhi NCR</option>
                  <option value="Chennai">Chennai</option>
                </select>
              </div>

              {/* Divider on desktop */}
              <div className="hidden md:block w-px bg-sand-dark my-2" />

              {/* Category Dropdown */}
              <div className="relative flex items-center min-w-[180px]">
                <Tag className="w-4 h-4 text-wine absolute left-3 pointer-events-none" />
                <select
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="w-full pl-9 pr-8 py-3 bg-transparent text-xs sm:text-sm font-semibold text-ink focus:outline-none cursor-pointer appearance-none"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.category_id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Action Button */}
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl md:rounded-2xl bg-wine text-sand font-heading text-xs uppercase tracking-wider font-bold hover:bg-wine-dark transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-wine-light hover:scale-[1.02]"
              >
                <span>Find Events</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Category Chips Loaded from GET /categories */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
            <span className="text-xs uppercase font-heading tracking-wider text-sand/70 mr-1 flex items-center gap-1">
              Popular Tags:
            </span>
            {categories.map((cat) => (
              <button
                key={cat.category_id || cat.name}
                type="button"
                onClick={() => navigate(`/events?category=${encodeURIComponent(cat.name)}`)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-wine-dark/70 text-sand border border-sand/30 hover:bg-sand hover:text-wine transition-all shadow-sm"
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. UPCOMING EVENTS CARD ROW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-sand-dark">
          <div>
            <span className="text-xs font-heading uppercase tracking-widest text-wine block mb-1">
              Curated Experiences
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl uppercase tracking-tight text-ink">
              UPCOMING EVENTS
            </h2>
          </div>
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 text-xs font-heading uppercase tracking-wider text-wine hover:text-wine-dark transition-colors self-start sm:self-auto"
          >
            <span>View All Events</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loadingEvents ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.event_id || event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {/* 3. POPULAR VENUES CARD ROW */}
      <section className="bg-sand-dark/25 py-16 border-y border-sand-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-sand-dark">
            <div>
              <span className="text-xs font-heading uppercase tracking-widest text-wine block mb-1">
                Premier Auditoriums & Spaces
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl uppercase tracking-tight text-ink">
                POPULAR VENUES
              </h2>
            </div>
            <Link
              to="/venues"
              className="inline-flex items-center gap-1.5 text-xs font-heading uppercase tracking-wider text-wine hover:text-wine-dark transition-colors self-start sm:self-auto"
            >
              <span>Browse All Venues</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loadingVenues ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <VenueCardSkeleton />
              <VenueCardSkeleton />
              <VenueCardSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {venues.map((venue) => (
                <VenueCard key={venue.venue_id} venue={venue} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. 3-STEP "HOW IT WORKS" STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <span className="text-xs font-heading uppercase tracking-widest text-wine block">
            Normalized DBMS Architecture
          </span>
          <h2 className="font-heading text-3xl sm:text-5xl uppercase tracking-tight text-ink">
            HOW EVENTILION WORKS
          </h2>
          <p className="text-sm sm:text-base text-ink/70">
            A seamless three-tier pipeline connecting attendees, venue operators, and event coordinators.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="bg-sand rounded-2xl border border-sand-dark p-8 shadow-sm flex flex-col justify-between hover:shadow-poster transition-shadow">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-wine text-sand flex items-center justify-center font-heading text-xl shadow-inner">
                  01
                </div>
                <Clock className="w-6 h-6 text-wine/70" />
              </div>
              <h3 className="font-heading text-xl uppercase tracking-tight text-ink">
                Discover Verified Venues
              </h3>
              <p className="text-sm text-ink/75 leading-relaxed">
                Filter halls, open-air stages, and auditoriums by seat capacity, price per hour, and verified real-time weekly operating schedules.
              </p>
            </div>
            <div className="pt-6 border-t border-sand-dark/60 mt-6 text-xs font-bold text-wine uppercase tracking-wider">
              Step 01 • Search & Inspect
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-sand rounded-2xl border border-sand-dark p-8 shadow-sm flex flex-col justify-between hover:shadow-poster transition-shadow">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-wine text-sand flex items-center justify-center font-heading text-xl shadow-inner">
                  02
                </div>
                <Building2 className="w-6 h-6 text-wine/70" />
              </div>
              <h3 className="font-heading text-xl uppercase tracking-tight text-ink">
                Register or Reserve
              </h3>
              <p className="text-sm text-ink/75 leading-relaxed">
                Organizers register spaces, manage daily operating hours with automated checks, and schedule high-capacity conventions with ACID transaction integrity.
              </p>
            </div>
            <div className="pt-6 border-t border-sand-dark/60 mt-6 text-xs font-bold text-wine uppercase tracking-wider">
              Step 02 • Book & Schedule
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-sand rounded-2xl border border-sand-dark p-8 shadow-sm flex flex-col justify-between hover:shadow-poster transition-shadow">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-wine text-sand flex items-center justify-center font-heading text-xl shadow-inner">
                  03
                </div>
                <Ticket className="w-6 h-6 text-wine/70" />
              </div>
              <h3 className="font-heading text-xl uppercase tracking-tight text-ink">
                Experience Events
              </h3>
              <p className="text-sm text-ink/75 leading-relaxed">
                Attendees discover curated tech hackathons, concerts, and summits with interactive category filtering and quick pass registration.
              </p>
            </div>
            <div className="pt-6 border-t border-sand-dark/60 mt-6 text-xs font-bold text-wine uppercase tracking-wider">
              Step 03 • Attend & Connect
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
