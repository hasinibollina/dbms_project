import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, Plus, Sparkles, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { venuesApi } from '../api';
import VenueCard from '../components/VenueCard';
import FilterBar from '../components/FilterBar';
import { VenueCardSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';

// Mock venues aligned with database/member1_seed.sql for offline fallback
const FALLBACK_VENUES = [
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
    contact_phone: '+91 4023456780',
    description: 'Open air amphitheatre surrounded by lush gardens, ideal for concerts and community performances.',
    image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
    is_active: true,
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
    contact_phone: '+91 2223456781',
    description: 'Modern modular event space with AV projectors, podcast recording room, and breakout pods.',
    image_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80',
    is_active: true,
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

export default function Venues() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isOrganizerOrAdmin } = useAuth();

  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Filters state initialized from URL params
  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    city: searchParams.get('city') || '',
    min_capacity: searchParams.get('min_capacity') || '',
    max_price: searchParams.get('max_price') || '',
  });

  const loadVenues = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await venuesApi.getAll({
        city: filters.city,
        min_capacity: filters.min_capacity,
        q: filters.q,
      });

      if (Array.isArray(data)) {
        setVenues(data);
        setIsUsingFallback(false);
      } else if (data?.venues && Array.isArray(data.venues)) {
        setVenues(data.venues);
        setIsUsingFallback(false);
      } else {
        throw new Error('Invalid venue data format from backend');
      }
    } catch (err) {
      // Graceful fallback to mock data if backend not active
      console.warn('Backend API unavailable. Falling back to local DBMS seed venues:', err.message);
      setIsUsingFallback(true);
      setFetchError(err.message);
      setVenues(FALLBACK_VENUES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVenues();
  }, [filters.city, filters.min_capacity, filters.q]);

  // Client-side filtering (handles max_price and fallback search)
  const filteredVenues = useMemo(() => {
    return venues.filter((venue) => {
      // Filter by query (name or description)
      if (filters.q) {
        const query = filters.q.toLowerCase();
        const matchName = venue.name?.toLowerCase().includes(query);
        const matchDesc = venue.description?.toLowerCase().includes(query);
        if (!matchName && !matchDesc) return false;
      }

      // Filter by city
      if (filters.city && venue.city?.toLowerCase() !== filters.city.toLowerCase()) {
        return false;
      }

      // Filter by minimum capacity
      if (filters.min_capacity && Number(venue.capacity) < Number(filters.min_capacity)) {
        return false;
      }

      // Filter by max price
      if (filters.max_price && Number(venue.price_per_hour) > Number(filters.max_price)) {
        return false;
      }

      return true;
    });
  }, [venues, filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    const params = new URLSearchParams();
    if (newFilters.q) params.set('q', newFilters.q);
    if (newFilters.city) params.set('city', newFilters.city);
    if (newFilters.min_capacity) params.set('min_capacity', newFilters.min_capacity);
    if (newFilters.max_price) params.set('max_price', newFilters.max_price);
    setSearchParams(params);
  };

  const handleResetFilters = () => {
    const emptyFilters = { q: '', city: '', min_capacity: '', max_price: '' };
    setFilters(emptyFilters);
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 w-full">
      {/* Header Poster Strip */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pb-6 border-b border-sand-dark">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sand-dark/60 text-wine text-xs font-heading uppercase tracking-wider mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>DBMS Venue Directory</span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl uppercase tracking-tighter text-ink">
            EXPLORE VENUES
          </h1>
          <p className="text-ink/70 text-sm sm:text-base mt-1 max-w-2xl">
            Filter auditoriums, halls, and open-air stages by capacity, hourly rate, and verified daily operating hours.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isOrganizerOrAdmin && (
            <Link
              to="/venues/new"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-wine text-sand font-heading text-xs uppercase tracking-wider font-bold hover:bg-wine-dark transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-wine-light"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Register Venue</span>
            </Link>
          )}

          <button
            type="button"
            onClick={loadVenues}
            disabled={loading}
            className="p-3 rounded-xl border border-sand-dark bg-sand text-ink hover:bg-sand-dark/40 transition-colors focus:outline-none focus:ring-2 focus:ring-wine"
            title="Refresh venue list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-wine' : ''}`} />
          </button>
        </div>
      </div>

      {/* Fallback Notice Banner if API not reachable */}
      {isUsingFallback && (
        <div className="mb-6 p-4 rounded-xl bg-sand border border-sand-dark flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-wine flex-shrink-0 mt-0.5" />
          <div className="text-xs text-ink/80">
            <strong className="text-wine font-semibold block mb-0.5">
              Demonstration Mode (DBMS Seed Data)
            </strong>
            Backend connection ({import.meta.env.VITE_API_URL || 'http://localhost:8000'}) is currently offline. Displaying local normalized database seed venues with full operating hours calculations.
          </div>
        </div>
      )}

      {/* Reusable Filter Bar */}
      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Venues Grid / Skeletons / Empty State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <VenueCardSkeleton />
          <VenueCardSkeleton />
          <VenueCardSkeleton />
        </div>
      ) : filteredVenues.length > 0 ? (
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink/60">
            Showing {filteredVenues.length} {filteredVenues.length === 1 ? 'venue' : 'venues'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVenues.map((venue) => (
              <VenueCard key={venue.venue_id} venue={venue} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title="No venues match your criteria"
          description="We couldn't find any venues matching your current filters. Try searching with different keywords, expanding the price range, or clearing filters."
          actionLabel="Reset All Filters"
          onAction={handleResetFilters}
        />
      )}
    </div>
  );
}
