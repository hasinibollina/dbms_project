import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, Plus, Sparkles, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { venuesApi } from '../api';
import VenueCard from '../components/VenueCard';
import FilterBar from '../components/FilterBar';
import { VenueCardSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';

export default function Venues() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isOrganizerOrAdmin } = useAuth();

  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const data = await venuesApi.getAll();
      setVenues(Array.isArray(data) ? data : []);
    } catch (err) {
      setVenues([]);
      setFetchError(err.message || 'Could not load venues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVenues();
  }, []);

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

      {fetchError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-300 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-ink/80">
            <strong className="text-red-700 font-semibold block mb-0.5">Could not load venues from the database</strong>
            {fetchError}
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
