import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, IndianRupee, ArrowUpRight, Tag } from 'lucide-react';

export default function EventCard({ event }) {
  if (!event) return null;

  const {
    id,
    event_id = id,
    title,
    date,
    date_time = date,
    venue,
    venue_name = typeof venue === 'object' ? venue?.name : venue,
    city = typeof venue === 'object' ? venue?.city : '',
    price,
    starting_price = price,
    category,
    category_name = typeof category === 'object' ? category?.name : category,
    image_url,
  } = event;

  const displayImage =
    image_url && image_url.trim() !== ''
      ? image_url
      : 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=800&q=80';

  const formattedDate = date_time
    ? new Date(date_time).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date TBA';

  const priceText =
    starting_price === 0 || starting_price === '0'
      ? 'Free Admission'
      : starting_price
      ? `From ₹${Number(starting_price).toLocaleString('en-IN')}`
      : '₹499';

  return (
    <div className="group rounded-2xl border border-sand-dark bg-sand overflow-hidden shadow-sm hover:shadow-poster transition-all duration-200 flex flex-col justify-between hover:-translate-y-1">
      {/* Event Image & Tag */}
      <div className="relative h-48 w-full overflow-hidden bg-sand-dark">
        <img
          src={displayImage}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.src =
              'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-transparent pointer-events-none" />

        {/* Category Badge */}
        {category_name && (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-wine text-sand shadow-md border border-sand/30">
              <Tag className="w-3 h-3" />
              <span>{category_name}</span>
            </span>
          </div>
        )}

        {/* Price Pill */}
        <div className="absolute bottom-3 right-3 z-10 bg-sand/95 backdrop-blur-sm text-ink px-3 py-1 rounded-xl shadow-sm border border-sand-dark/60">
          <span className="font-heading text-xs font-bold text-wine">
            {priceText}
          </span>
        </div>
      </div>

      {/* Event Details */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-wine uppercase tracking-wider mb-1.5">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{formattedDate}</span>
          </div>

          <h3 className="font-heading text-lg uppercase tracking-tight text-ink group-hover:text-wine transition-colors line-clamp-2">
            {title}
          </h3>

          <div className="flex items-center gap-1.5 text-xs text-ink/70 mt-2 truncate">
            <MapPin className="w-3.5 h-3.5 text-wine flex-shrink-0" />
            <span className="truncate">
              {venue_name} {city ? `• ${city}` : ''}
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-3 border-t border-sand-dark flex items-center justify-between">
          <span className="text-[11px] font-semibold text-ink/60 uppercase tracking-wider">
            DBMS Reservation
          </span>

          <Link
            to={`/events?selected_event=${event_id}`}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-wine text-sand font-heading text-xs uppercase tracking-wider font-bold hover:bg-wine-dark transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-wine-light"
          >
            <span>Book Seat</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
