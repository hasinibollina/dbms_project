import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  RefreshCw,
  AlertCircle,
  Edit,
  Trash2,
  ExternalLink,
  MapPin,
  Users,
  IndianRupee,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { venuesApi } from '../api';
import FilterBar from '../components/FilterBar';
import { VenueCardSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { computeIsOpen } from '../utils/hoursUtils';
import {
  SEED_VENUES,
  getStoredVenues,
  saveStoredVenues,
  formatINR,
} from '../data/seedData';

export default function ManageVenues() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  // Delete modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [venueToDelete, setVenueToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Filters state initialized from URL params
  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    city: searchParams.get('city') || '',
    min_capacity: searchParams.get('min_capacity') || '',
    max_price: searchParams.get('max_price') || '',
  });

  const loadVenues = async () => {
    setLoading(true);
    try {
      const data = await venuesApi.getAll({
        city: filters.city,
        min_capacity: filters.min_capacity,
        q: filters.q,
      });

      if (Array.isArray(data) && data.length > 0) {
        setVenues(data);
        setIsUsingFallback(false);
      } else if (data?.venues && Array.isArray(data.venues) && data.venues.length > 0) {
        setVenues(data.venues);
        setIsUsingFallback(false);
      } else {
        throw new Error('Using fallback seed venues');
      }
    } catch {
      setIsUsingFallback(true);
      const stored = getStoredVenues();
      setVenues(stored);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVenues();
  }, [filters.city, filters.min_capacity, filters.q]);

  // Client-side filtering
  const filteredVenues = useMemo(() => {
    return venues.filter((venue) => {
      if (filters.q) {
        const query = filters.q.toLowerCase();
        const matchName = venue.name?.toLowerCase().includes(query);
        const matchDesc = venue.description?.toLowerCase().includes(query);
        const matchCity = venue.city?.toLowerCase().includes(query);
        if (!matchName && !matchDesc && !matchCity) return false;
      }
      if (filters.city && venue.city?.toLowerCase() !== filters.city.toLowerCase()) {
        return false;
      }
      if (filters.min_capacity && Number(venue.capacity) < Number(filters.min_capacity)) {
        return false;
      }
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

  // Delete Action
  const handleDeleteVenue = async () => {
    if (!venueToDelete) return;
    setDeleting(true);
    try {
      await venuesApi.delete(venueToDelete.venue_id);
    } catch (err) {
      console.warn('Backend delete venue failed, updating local state:', err.message);
    }

    const updated = venues.filter((v) => v.venue_id !== venueToDelete.venue_id);
    setVenues(updated);
    saveStoredVenues(updated);
    toast.success(`Venue "${venueToDelete.name}" deleted successfully.`);
    setDeleteModalOpen(false);
    setVenueToDelete(null);
    setDeleting(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 w-full animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pb-6 border-b border-sand-dark">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sand-dark/60 text-wine text-xs font-heading uppercase tracking-wider mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>DBMS Venue Fleet Management</span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl uppercase tracking-tighter text-ink">
            MANAGE VENUES
          </h1>
          <p className="text-ink/70 text-sm sm:text-base mt-1 max-w-2xl">
            Register new halls, configure operating schedules, adjust capacity limits, and maintain auditorium profiles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/venues/new"
            id="register-venue-button"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-wine text-sand font-heading text-xs uppercase tracking-wider font-bold hover:bg-wine-dark transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-wine-light"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Register Venue</span>
          </Link>

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
            Backend connection ({import.meta.env.VITE_API_URL || 'http://localhost:8000'}) is currently offline. Displaying local normalized database seed venues with full operating hours calculations and CRUD support.
          </div>
        </div>
      )}

      {/* Reusable Filter Bar */}
      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Venues Grid with Admin Controls (Edit & Delete on each card) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <VenueCardSkeleton />
          <VenueCardSkeleton />
          <VenueCardSkeleton />
        </div>
      ) : filteredVenues.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVenues.map((venue) => {
            const status = computeIsOpen(venue.hours);
            const isOpen = status?.isOpen;

            const displayImage =
              venue.image_url && venue.image_url.trim() !== ''
                ? venue.image_url
                : 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80';

            return (
              <div
                key={venue.venue_id}
                className="group rounded-2xl border border-sand-dark bg-sand overflow-hidden shadow-sm hover:shadow-poster transition-all duration-200 flex flex-col justify-between"
              >
                {/* Image Container with Badges */}
                <div className="relative h-48 w-full overflow-hidden bg-sand-dark">
                  <img
                    src={displayImage}
                    alt={venue.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent pointer-events-none" />

                  {/* Status Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    {isOpen === true ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse" />
                        Open now
                      </span>
                    ) : isOpen === false ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-700 text-white shadow-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-300" />
                        Closed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sand/90 text-ink">
                        Active
                      </span>
                    )}
                  </div>

                  {/* Price Tag */}
                  <div className="absolute bottom-3 right-3 z-10 bg-sand/95 backdrop-blur-sm text-ink px-3 py-1 rounded-xl shadow-sm border border-sand-dark/60">
                    <span className="font-heading text-sm font-bold text-wine">
                      ₹{Number(venue.price_per_hour).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-ink/70 font-semibold ml-1">/ hr</span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-1 text-wine font-semibold text-xs uppercase tracking-wider mb-1">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{venue.city}</span>
                    </div>

                    <h3 className="font-heading text-xl uppercase tracking-tight text-ink group-hover:text-wine transition-colors line-clamp-1">
                      {venue.name}
                    </h3>

                    {venue.description && (
                      <p className="text-xs text-ink/70 line-clamp-2 mt-1.5 leading-relaxed">
                        {venue.description}
                      </p>
                    )}
                  </div>

                  {/* Metadata & Admin Action Buttons */}
                  <div className="pt-3 border-t border-sand-dark space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-ink/80">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-wine" />
                        Cap: {Number(venue.capacity).toLocaleString()}
                      </span>
                      {venue.contact_phone && (
                        <span className="text-ink/60 text-[11px]">{venue.contact_phone}</span>
                      )}
                    </div>

                    {/* Admin Actions: Details, Edit, Delete */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-sand-dark/60">
                      <Link
                        to={`/venues/${venue.venue_id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-sand-dark text-xs font-semibold text-ink hover:bg-sand-dark/40 transition-colors"
                        title="View Public Details"
                      >
                        <span>Details</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>

                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/venues/${venue.venue_id}/edit`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-wine text-sand text-xs font-heading uppercase tracking-wider font-bold hover:bg-wine-dark transition-colors shadow-sm"
                          title="Edit Venue Specifications"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setVenueToDelete(venue);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-700 hover:text-white transition-colors"
                          title="Delete Venue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No venues found"
          description="Try modifying your search keywords or resetting your capacity/price filter limits."
          onAction={handleResetFilters}
          actionLabel="Reset All Filters"
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Venue Record?"
        message={`Are you sure you want to delete "${venueToDelete?.name}"? All assigned operating schedules will be cascaded and permanently removed.`}
        confirmText="Confirm Delete"
        cancelText="Cancel"
        isDanger={true}
        isLoading={deleting}
        onConfirm={handleDeleteVenue}
        onClose={() => {
          setDeleteModalOpen(false);
          setVenueToDelete(null);
        }}
      />
    </div>
  );
}
