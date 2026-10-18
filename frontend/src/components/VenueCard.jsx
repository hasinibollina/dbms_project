import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users, ArrowUpRight, Clock, Building2 } from 'lucide-react';
import { computeIsOpen } from '../utils/hoursUtils';

export default function VenueCard({ venue }) {
  if (!venue) return null;

  const {
    venue_id,
    name,
    city,
    capacity,
    price_per_hour,
    image_url,
    hours,
  } = venue;

  // Compute Open now vs Closed
  const status = computeIsOpen(hours);
  const isOpen = status.isOpen;

  // Placeholder image fallback
  const displayImage =
    image_url && image_url.trim() !== ''
      ? image_url
      : 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80';

  return (
    <div className="group rounded-2xl border border-sand-dark bg-sand overflow-hidden shadow-sm hover:shadow-poster transition-all duration-200 flex flex-col justify-between hover:-translate-y-1">
      {/* Image Container with Badge */}
      <div className="relative h-52 w-full overflow-hidden bg-sand-dark">
        <img
          src={displayImage}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            // Fallback if image URL fails to load
            e.currentTarget.src =
              'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80';
          }}
        />

        {/* Gradient Overlay for Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent pointer-events-none" />

        {/* Status Badge: Open now (green) vs Closed (red) */}
        <div className="absolute top-3 left-3 z-10">
          {isOpen === true ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse" />
              Open now
            </span>
          ) : isOpen === false ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-700 text-white shadow-md">
              <span className="w-2 h-2 rounded-full bg-red-300" />
              Closed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sand/90 text-ink">
              Schedule on page
            </span>
          )}
        </div>

        {/* Price Tag Pill on Image */}
        <div className="absolute bottom-3 right-3 z-10 bg-sand/95 backdrop-blur-sm text-ink px-3 py-1 rounded-xl shadow-sm border border-sand-dark/60">
          <span className="font-heading text-sm font-bold text-wine">
            ₹{Number(price_per_hour).toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-ink/70 font-semibold ml-1">/ hr</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center gap-1 text-wine font-semibold text-xs uppercase tracking-wider mb-1">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{city}</span>
          </div>

          <h3 className="font-heading text-xl uppercase tracking-tight text-ink group-hover:text-wine transition-colors line-clamp-1">
            {name}
          </h3>

          {venue.description && (
            <p className="text-xs text-ink/70 line-clamp-2 mt-1.5 leading-relaxed">
              {venue.description}
            </p>
          )}
        </div>

        {/* Metadata Strip & CTA */}
        <div className="pt-3 border-t border-sand-dark flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink/80">
            <Users className="w-4 h-4 text-wine" />
            <span>Capacity: <strong>{Number(capacity).toLocaleString()}</strong></span>
          </div>

          <Link
            to={`/venues/${venue_id}`}
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-wine text-sand font-heading text-xs uppercase tracking-wider font-bold hover:bg-wine-dark transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-wine-light"
          >
            <span>Details</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
