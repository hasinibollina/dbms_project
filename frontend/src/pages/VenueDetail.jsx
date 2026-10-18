import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Users,
  IndianRupee,
  Phone,
  Calendar,
  ArrowLeft,
  ExternalLink,
  Edit,
  Clock,
  Sparkles,
  AlertCircle,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { venuesApi } from '../api';
import HoursTable from '../components/HoursTable';
import { Skeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { computeIsOpen } from '../utils/hoursUtils';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// Local DBMS fallback venues for when backend is offline
const FALLBACK_VENUES_MAP = {
  1: {
    venue_id: 1,
    name: 'Apex Convention Center',
    address: '100 Silicon Boulevard',
    city: 'Bengaluru',
    capacity: 1500,
    price_per_hour: 5000.0,
    contact_phone: '+91 8023456789',
    description:
      'State-of-the-art auditorium with high-speed fiber internet, acoustic design, automated lighting truss, and backstage green rooms. Perfect for multi-track tech conferences, keynotes, and product launches.',
    image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80',
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
  2: {
    venue_id: 2,
    name: 'Symphony Amphitheatre',
    address: '45 Green Meadows Road',
    city: 'Hyderabad',
    capacity: 800,
    price_per_hour: 3500.0,
    contact_phone: '+91 4023456780',
    description:
      'Open air amphitheatre surrounded by lush gardens, tiered stone seating, and an acoustic shell. Ideal for live concerts, drama, comedy nights, and community gatherings under the stars.',
    image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1600&q=80',
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
  3: {
    venue_id: 3,
    name: 'Innovate Cowork & Hall',
    address: '12 MG Road',
    city: 'Mumbai',
    capacity: 250,
    price_per_hour: 1500.0,
    contact_phone: '+91 2223456781',
    description:
      'Modern modular event space with AV projectors, podcast studio booth, catering kitchenette, and flexible breakout rooms. Fits startup pitch events, hackathons, and executive roundtables.',
    image_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1600&q=80',
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
};

export default function VenueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOrganizerOrAdmin } = useAuth();
  const toast = useToast();

  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchVenue() {
      setLoading(true);
      setError(null);
      try {
        const data = await venuesApi.getById(id);
        if (isMounted) {
          setVenue(data);
          setIsUsingFallback(false);
        }
      } catch (err) {
        console.warn(`Venue #${id} fetch failed, checking seed fallback:`, err.message);
        if (isMounted) {
          const fallback = FALLBACK_VENUES_MAP[id] || FALLBACK_VENUES_MAP[1];
          if (fallback) {
            setVenue({ ...fallback, venue_id: Number(id) });
            setIsUsingFallback(true);
          } else {
            setError(`Venue #${id} not found.`);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchVenue();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-80 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState
          title="Venue Not Found"
          description={error || "The requested venue could not be retrieved from the database."}
          actionLabel="Back to All Venues"
          onAction={() => navigate('/venues')}
        />
      </div>
    );
  }

  const {
    venue_id,
    name,
    address,
    city,
    capacity,
    price_per_hour,
    contact_phone,
    description,
    image_url,
    hours = [],
  } = venue;

  const status = computeIsOpen(hours);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${name}, ${address}, ${city}`
  )}`;

  const headerImage =
    image_url && image_url.trim() !== ''
      ? image_url
      : 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1600&q=80';

  const handleCreateEventHere = () => {
    toast.success(`Redirecting to organize event at ${name}`);
    navigate(`/events?selected_venue=${venue_id}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 w-full space-y-8">
      {/* Top Breadcrumb & Admin Action */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/venues"
          className="inline-flex items-center gap-1.5 text-xs font-heading uppercase tracking-wider text-wine hover:text-wine-dark transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Venues</span>
        </Link>

        {isOrganizerOrAdmin && (
          <Link
            to={`/venues/${venue_id}/edit`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sand border border-sand-dark text-ink font-heading text-xs uppercase tracking-wider font-bold hover:bg-wine hover:text-sand transition-all shadow-sm"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Venue & Hours</span>
          </Link>
        )}
      </div>

      {/* Fallback Banner if using demo seed */}
      {isUsingFallback && (
        <div className="p-3.5 rounded-xl bg-sand border border-sand-dark flex items-center gap-3 text-xs text-ink/80 shadow-sm">
          <AlertCircle className="w-4 h-4 text-wine flex-shrink-0" />
          <span>
            Demonstration mode: Loaded offline seed venue record from local DBMS schema.
          </span>
        </div>
      )}

      {/* Hero Media Card with Poster Badge */}
      <div className="relative rounded-2xl overflow-hidden border border-sand-dark bg-sand-dark shadow-poster h-72 sm:h-96 md:h-[420px]">
        <img
          src={headerImage}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src =
              'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />

        {/* Status Badge */}
        <div className="absolute top-4 left-4 z-10">
          {status.isOpen === true ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-200 animate-pulse" />
              Open now
            </span>
          ) : status.isOpen === false ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-700 text-white shadow-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
              Closed
            </span>
          ) : null}
        </div>

        {/* Content Overlay */}
        <div className="absolute bottom-6 left-6 right-6 z-10 text-sand flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sand/80 text-xs font-semibold uppercase tracking-wider mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{city}</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl uppercase tracking-tight text-sand drop-shadow">
              {name}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-sand text-ink px-4 py-2 rounded-xl shadow-lg border border-sand-dark">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink/70 block">
                Rate
              </span>
              <span className="font-heading text-xl text-wine font-black">
                ₹{Number(price_per_hour).toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-ink/70 font-semibold ml-1">/ hour</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Details & Hours Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Description, Specs, Location */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* About Venue */}
          <div className="bg-sand rounded-2xl border border-sand-dark p-6 shadow-sm space-y-4">
            <h2 className="font-heading text-xl uppercase tracking-tight text-ink border-b border-sand-dark pb-3">
              About This Venue
            </h2>
            <p className="text-sm md:text-base text-ink/80 leading-relaxed">
              {description || 'No detailed description provided for this venue yet.'}
            </p>

            {/* Spec Badges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-sand-dark/60">
              <div className="p-3 rounded-xl bg-sand-dark/30 border border-sand-dark/60">
                <span className="text-[10px] font-heading uppercase text-wine tracking-wider block">
                  Capacity
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Users className="w-4 h-4 text-wine" />
                  <span className="font-heading text-lg text-ink font-bold">
                    {Number(capacity).toLocaleString()}
                  </span>
                  <span className="text-xs text-ink/60">seats</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-sand-dark/30 border border-sand-dark/60">
                <span className="text-[10px] font-heading uppercase text-wine tracking-wider block">
                  Base Hourly Rate
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <IndianRupee className="w-4 h-4 text-wine" />
                  <span className="font-heading text-lg text-ink font-bold">
                    ₹{Number(price_per_hour).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-sand-dark/30 border border-sand-dark/60">
                <span className="text-[10px] font-heading uppercase text-wine tracking-wider block">
                  Contact
                </span>
                <div className="flex items-center gap-1.5 mt-0.5 truncate">
                  <Phone className="w-4 h-4 text-wine flex-shrink-0" />
                  <span className="text-xs font-semibold text-ink truncate">
                    {contact_phone || 'Available on booking'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Address & Maps Link */}
          <div className="bg-sand rounded-2xl border border-sand-dark p-6 shadow-sm space-y-4">
            <h3 className="font-heading text-lg uppercase tracking-tight text-ink">
              Location & Access
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-sand-dark/30 border border-sand-dark">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-wine flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-ink text-sm">{address}</div>
                  <div className="text-xs text-ink/70">{city}, India</div>
                </div>
              </div>

              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-wine text-sand font-heading text-xs uppercase tracking-wider font-bold hover:bg-wine-dark transition-colors shadow-sm self-start sm:self-auto"
              >
                <span>Open in Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Operating Hours Table & Booking CTA */}
        <div className="space-y-6">
          {/* Action Card */}
          <div className="bg-wine text-sand rounded-2xl p-6 shadow-poster border border-sand/20 space-y-4">
            <span className="text-[11px] font-heading uppercase tracking-wider text-sand/80 block">
              Reservation Ready
            </span>
            <h3 className="font-heading text-2xl uppercase tracking-tight text-sand">
              Host Your Event Here
            </h3>
            <p className="text-xs text-sand/80 leading-relaxed">
              Book this venue for conferences, exhibitions, concerts, or hackathons with synchronized DBMS scheduling.
            </p>

            <button
              type="button"
              onClick={handleCreateEventHere}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-sand text-wine font-heading text-xs uppercase tracking-wider font-black hover:bg-sand-dark transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-sand"
            >
              <Calendar className="w-4 h-4" />
              <span>Create Event Here</span>
            </button>
          </div>

          {/* Weekly Operating Hours Component */}
          <HoursTable hours={hours} />
        </div>
      </div>
    </div>
  );
}
