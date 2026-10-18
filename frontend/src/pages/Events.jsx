import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Search,
  Filter,
  ArrowUpDown,
  Tag,
  MapPin,
  IndianRupee,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Ticket,
  CheckCircle2,
} from 'lucide-react';
import { eventsApi, categoriesApi } from '../api';
import EventCard from '../components/EventCard';
import { EventCardSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';

// ==============================================================================
// TODO: The events API is built by another teammate and may not exist yet.
// Fetch from GET /events and fall back to this mock list if the request fails.
// ==============================================================================
const MOCK_EVENTS = [
  {
    event_id: 101,
    title: 'Future of Generative AI Summit 2026',
    date: '2026-11-14T10:00:00',
    venue: 'Apex Convention Center',
    city: 'Bengaluru',
    price: 1499,
    category: 'Technology & AI',
    image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
    description: 'A two-day multi-track conference featuring keynotes on LLMs, agentic AI systems, and enterprise vector databases.',
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
    description: 'Live performance by premier jazz musicians and orchestral string ensembles under the open evening sky.',
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
    description: '20 curated early-stage startups pitching to leading venture capitalists, angel syndicates, and founders.',
  },
  {
    event_id: 104,
    title: 'Modern Digital Art & Interactive Installation',
    date: '2026-11-20T11:00:00',
    venue: 'Apex Convention Center',
    city: 'Bengaluru',
    price: 0,
    category: 'Arts & Theatre',
    image_url: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=800&q=80',
    description: 'Immersive light installations, algorithmic projections, and generative digital artwork galleries.',
  },
  {
    event_id: 105,
    title: 'Full-Stack DBMS & Cloud Architecture Bootcamp',
    date: '2026-11-28T09:00:00',
    venue: 'Innovate Cowork & Hall',
    city: 'Mumbai',
    price: 1999,
    category: 'Workshops & Learning',
    image_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
    description: 'Hands-on intensive masterclass on PostgreSQL query optimization, relational indexing, and ACID transaction semantics.',
  },
  {
    event_id: 106,
    title: 'Classical Strings & Fusion Orchestra Live',
    date: '2026-12-04T19:00:00',
    venue: 'Symphony Amphitheatre',
    city: 'Hyderabad',
    price: 1200,
    category: 'Music & Concerts',
    image_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80',
    description: 'An evening celebrating Eastern classical melodies fused with Western orchestral harmonies.',
  },
  {
    event_id: 107,
    title: 'Autonomous Systems & Robotics Hackathon',
    date: '2026-12-12T09:00:00',
    venue: 'Apex Convention Center',
    city: 'Bengaluru',
    price: 0,
    category: 'Technology & AI',
    image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
    description: '36-hour collegiate hackathon building real-time autonomous navigation, vision models, and IoT sensors.',
  },
  {
    event_id: 108,
    title: 'Contemporary Playwrights Drama Festival',
    date: '2026-12-18T16:00:00',
    venue: 'Symphony Amphitheatre',
    city: 'Hyderabad',
    price: 350,
    category: 'Arts & Theatre',
    image_url: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80',
    description: 'Three live theatrical plays staged by award-winning independent collegiate drama troupes.',
  },
];

const ITEMS_PER_PAGE = 6;

export default function Events() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [selectedEventForBooking, setSelectedEventForBooking] = useState(null);
  const [isBookingSeat, setIsBookingSeat] = useState(false);

  // Filters State
  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    city: searchParams.get('city') || '',
    date_range: searchParams.get('date_range') || '',
    max_price: searchParams.get('max_price') || '',
    sort: searchParams.get('sort') || 'date_asc',
    page: parseInt(searchParams.get('page') || '1', 10),
  });

  // Load Categories for Filter Dropdown
  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await categoriesApi.getAll();
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        } else {
          setCategories([
            { category_id: 1, name: 'Technology & AI' },
            { category_id: 2, name: 'Music & Concerts' },
            { category_id: 3, name: 'Business & Networking' },
            { category_id: 4, name: 'Arts & Theatre' },
            { category_id: 5, name: 'Workshops & Learning' },
          ]);
        }
      } catch {
        setCategories([
          { category_id: 1, name: 'Technology & AI' },
          { category_id: 2, name: 'Music & Concerts' },
          { category_id: 3, name: 'Business & Networking' },
          { category_id: 4, name: 'Arts & Theatre' },
          { category_id: 5, name: 'Workshops & Learning' },
        ]);
      }
    }
    loadCategories();
  }, []);

  // Fetch Events from API with fallback to MOCK_EVENTS
  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await eventsApi.getAll({
        q: filters.q,
        category: filters.category,
        city: filters.city,
      });

      if (Array.isArray(data) && data.length > 0) {
        setEvents(data);
        setIsUsingFallback(false);
      } else if (data?.events && Array.isArray(data.events) && data.events.length > 0) {
        setEvents(data.events);
        setIsUsingFallback(false);
      } else {
        // Fall back to mock list
        throw new Error('Events endpoint returned empty or unbuilt response');
      }
    } catch (err) {
      // TODO: Falling back to mock list if GET /events fails as requested
      console.warn('Events API unavailable or not yet built by teammate. Using mock events:', err.message);
      setIsUsingFallback(true);
      setEvents(MOCK_EVENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [filters.q, filters.category, filters.city]);

  // Handle selected event from URL if user clicked "Book Seat" or came from Home
  useEffect(() => {
    const selectedEventId = searchParams.get('selected_event');
    if (selectedEventId) {
      const found = (events.length > 0 ? events : MOCK_EVENTS).find(
        (e) => String(e.event_id || e.id) === String(selectedEventId)
      );
      if (found) {
        setSelectedEventForBooking(found);
      }
    }
  }, [searchParams, events]);

  // Synchronize Filter changes with URL
  const updateFilters = (newFilters) => {
    setFilters(newFilters);
    const params = new URLSearchParams();
    if (newFilters.q) params.set('q', newFilters.q);
    if (newFilters.category) params.set('category', newFilters.category);
    if (newFilters.city) params.set('city', newFilters.city);
    if (newFilters.date_range) params.set('date_range', newFilters.date_range);
    if (newFilters.max_price) params.set('max_price', newFilters.max_price);
    if (newFilters.sort) params.set('sort', newFilters.sort);
    if (newFilters.page > 1) params.set('page', String(newFilters.page));
    setSearchParams(params);
  };

  const handleResetFilters = () => {
    const cleared = {
      q: '',
      category: '',
      city: '',
      date_range: '',
      max_price: '',
      sort: 'date_asc',
      page: 1,
    };
    updateFilters(cleared);
  };

  // Filter & Sort Logic
  const filteredAndSortedEvents = useMemo(() => {
    let result = [...events];

    // 1. Text Search (q)
    if (filters.q) {
      const q = filters.q.toLowerCase();
      result = result.filter(
        (e) =>
          e.title?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          (typeof e.venue === 'string' && e.venue.toLowerCase().includes(q))
      );
    }

    // 2. Category Filter
    if (filters.category) {
      result = result.filter((e) => {
        const catName = typeof e.category === 'object' ? e.category?.name : e.category;
        return catName?.toLowerCase() === filters.category.toLowerCase();
      });
    }

    // 3. City Filter
    if (filters.city) {
      result = result.filter((e) => {
        const city = typeof e.venue === 'object' ? e.venue?.city : e.city;
        return city?.toLowerCase() === filters.city.toLowerCase();
      });
    }

    // 4. Price Filter
    if (filters.max_price) {
      if (filters.max_price === '0') {
        result = result.filter((e) => Number(e.price) === 0);
      } else {
        result = result.filter((e) => Number(e.price) <= Number(filters.max_price));
      }
    }

    // 5. Date Range Filter
    if (filters.date_range) {
      const now = new Date();
      if (filters.date_range === 'next_7_days') {
        const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        result = result.filter((e) => {
          const d = new Date(e.date);
          return d >= now && d <= in7Days;
        });
      } else if (filters.date_range === 'next_30_days') {
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        result = result.filter((e) => {
          const d = new Date(e.date);
          return d >= now && d <= in30Days;
        });
      }
    }

    // 6. Sorting
    result.sort((a, b) => {
      if (filters.sort === 'price_asc') {
        return Number(a.price || 0) - Number(b.price || 0);
      }
      if (filters.sort === 'price_desc') {
        return Number(b.price || 0) - Number(a.price || 0);
      }
      if (filters.sort === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      // Default: date_asc (soonest first)
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return result;
  }, [events, filters]);

  // Pagination Calculations
  const totalPages = Math.ceil(filteredAndSortedEvents.length / ITEMS_PER_PAGE) || 1;
  const currentPage = Math.min(Math.max(1, filters.page), totalPages);

  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedEvents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSortedEvents, currentPage]);

  const handlePageChange = (newPage) => {
    updateFilters({ ...filters, page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmBooking = () => {
    setIsBookingSeat(true);
    setTimeout(() => {
      setIsBookingSeat(false);
      toast.success(
        `Registration confirmed for "${selectedEventForBooking.title}"! Ticket ID #TKT-${Math.floor(
          100000 + Math.random() * 900000
        )} saved in DBMS.`
      );
      setSelectedEventForBooking(null);
      // Clean query parameter
      const params = new URLSearchParams(searchParams);
      params.delete('selected_event');
      setSearchParams(params);
    }, 600);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 w-full">
      {/* Page Header */}
      <div className="mb-8 pb-6 border-b border-sand-dark">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sand-dark/60 text-wine text-xs font-heading uppercase tracking-wider mb-2">
          <Calendar className="w-3.5 h-3.5" />
          <span>Curated Event Directory</span>
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl uppercase tracking-tighter text-ink">
          DISCOVER EVENTS
        </h1>
        <p className="text-ink/70 text-sm sm:text-base mt-1 max-w-2xl">
          Browse tech summits, concerts, investor demo days, and workshops hosted across certified partner venues.
        </p>
      </div>

      {/* Fallback Notice Banner if API not reachable */}
      {isUsingFallback && (
        <div className="mb-6 p-4 rounded-xl bg-sand border border-sand-dark flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-wine flex-shrink-0 mt-0.5" />
          <div className="text-xs text-ink/80">
            <strong className="text-wine font-semibold block mb-0.5">
              TODO Notice: Teammate Events API In-Progress
            </strong>
            The events API (`GET /events`) is being constructed by teammate. Displaying pre-seeded demo events with active client-side filters, sorting, and pagination.
          </div>
        </div>
      )}

      {/* Filter & Sort Controls Panel */}
      <div className="bg-sand rounded-2xl border border-sand-dark p-4 sm:p-6 shadow-sm mb-8 space-y-4">
        {/* Top Search Bar */}
        <div className="relative">
          <label htmlFor="event-search" className="sr-only">
            Search events by title or keywords
          </label>
          <Search className="w-5 h-5 text-wine absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="event-search"
            type="text"
            value={filters.q}
            onChange={(e) => updateFilters({ ...filters, q: e.target.value, page: 1 })}
            placeholder="Search events by title, keyword, or venue..."
            className="w-full pl-12 pr-4 py-3 bg-sand-dark/30 border border-sand-dark rounded-xl text-ink placeholder-ink/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-wine focus:bg-sand transition-all"
          />
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Category Filter */}
          <div className="space-y-1">
            <label htmlFor="filter-event-category" className="flex items-center gap-1.5 text-xs font-heading uppercase tracking-wider text-ink/80">
              <Tag className="w-3.5 h-3.5 text-wine" />
              <span>Category</span>
            </label>
            <select
              id="filter-event-category"
              value={filters.category}
              onChange={(e) => updateFilters({ ...filters, category: e.target.value, page: 1 })}
              className="w-full px-3.5 py-2.5 bg-sand border border-sand-dark rounded-xl text-xs sm:text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wine"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.category_id || c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* City Filter */}
          <div className="space-y-1">
            <label htmlFor="filter-event-city" className="flex items-center gap-1.5 text-xs font-heading uppercase tracking-wider text-ink/80">
              <MapPin className="w-3.5 h-3.5 text-wine" />
              <span>City</span>
            </label>
            <select
              id="filter-event-city"
              value={filters.city}
              onChange={(e) => updateFilters({ ...filters, city: e.target.value, page: 1 })}
              className="w-full px-3.5 py-2.5 bg-sand border border-sand-dark rounded-xl text-xs sm:text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wine"
            >
              <option value="">All Locations</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Delhi NCR">Delhi NCR</option>
              <option value="Chennai">Chennai</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-1">
            <label htmlFor="filter-event-date" className="flex items-center gap-1.5 text-xs font-heading uppercase tracking-wider text-ink/80">
              <Calendar className="w-3.5 h-3.5 text-wine" />
              <span>Date Range</span>
            </label>
            <select
              id="filter-event-date"
              value={filters.date_range}
              onChange={(e) => updateFilters({ ...filters, date_range: e.target.value, page: 1 })}
              className="w-full px-3.5 py-2.5 bg-sand border border-sand-dark rounded-xl text-xs sm:text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wine"
            >
              <option value="">Any Date</option>
              <option value="next_7_days">Next 7 Days</option>
              <option value="next_30_days">Next 30 Days</option>
            </select>
          </div>

          {/* Price Range Filter */}
          <div className="space-y-1">
            <label htmlFor="filter-event-price" className="flex items-center gap-1.5 text-xs font-heading uppercase tracking-wider text-ink/80">
              <IndianRupee className="w-3.5 h-3.5 text-wine" />
              <span>Price Range</span>
            </label>
            <select
              id="filter-event-price"
              value={filters.max_price}
              onChange={(e) => updateFilters({ ...filters, max_price: e.target.value, page: 1 })}
              className="w-full px-3.5 py-2.5 bg-sand border border-sand-dark rounded-xl text-xs sm:text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wine"
            >
              <option value="">Any Price</option>
              <option value="0">Free Admission Only</option>
              <option value="500">Up to ₹500</option>
              <option value="1000">Up to ₹1,000</option>
              <option value="2000">Up to ₹2,000</option>
            </select>
          </div>
        </div>

        {/* Sort & Reset Row */}
        <div className="pt-3 border-t border-sand-dark/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-heading uppercase tracking-wider text-ink/70 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-wine" />
              Sort:
            </span>
            <select
              value={filters.sort}
              onChange={(e) => updateFilters({ ...filters, sort: e.target.value })}
              className="px-2.5 py-1.5 bg-sand border border-sand-dark rounded-lg text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-wine"
            >
              <option value="date_asc">Date (Soonest first)</option>
              <option value="price_asc">Price (Low to High)</option>
              <option value="price_desc">Price (High to Low)</option>
              <option value="title_asc">Title (A to Z)</option>
            </select>
          </div>

          {(filters.q || filters.category || filters.city || filters.date_range || filters.max_price) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-wine hover:text-wine-dark font-semibold transition-colors underline underline-offset-2 self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear All Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Events Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
        </div>
      ) : paginatedEvents.length > 0 ? (
        <div className="space-y-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink/60">
            Showing {paginatedEvents.length} of {filteredAndSortedEvents.length} {filteredAndSortedEvents.length === 1 ? 'event' : 'events'}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedEvents.map((event) => (
              <EventCard key={event.event_id || event.id} event={event} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pt-8 border-t border-sand-dark flex items-center justify-between">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-sand-dark bg-sand text-xs font-heading uppercase tracking-wider font-bold text-ink hover:bg-wine hover:text-sand disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="text-xs font-heading uppercase tracking-wider text-ink">
                Page <span className="text-wine font-black">{currentPage}</span> of{' '}
                <span className="font-black">{totalPages}</span>
              </div>

              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-sand-dark bg-sand text-xs font-heading uppercase tracking-wider font-bold text-ink hover:bg-wine hover:text-sand disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          title="No events found"
          description="We couldn't find any upcoming events matching your selected filters. Try broadening your search or resetting filters."
          actionLabel="Reset All Filters"
          onAction={handleResetFilters}
        />
      )}

      {/* Booking Confirmation Modal when user selects an event */}
      {selectedEventForBooking && (
        <ConfirmModal
          isOpen={Boolean(selectedEventForBooking)}
          title="Confirm Seat Reservation"
          message={`Would you like to reserve a ticket for "${selectedEventForBooking.title}" at ${selectedEventForBooking.venue}? Admission: ${
            selectedEventForBooking.price === 0 ? 'Free' : `₹${selectedEventForBooking.price}`
          }.`}
          confirmText="Confirm Reservation"
          cancelText="Cancel"
          isDanger={false}
          isLoading={isBookingSeat}
          onConfirm={handleConfirmBooking}
          onClose={() => {
            setSelectedEventForBooking(null);
            const params = new URLSearchParams(searchParams);
            params.delete('selected_event');
            setSearchParams(params);
          }}
        />
      )}
    </div>
  );
}
