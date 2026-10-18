import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, Building2, Calendar, ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center my-auto">
      {/* 404 Poster Card */}
      <div className="bg-sand rounded-3xl border-2 border-sand-dark p-8 sm:p-14 shadow-poster relative overflow-hidden">
        {/* Subtle background number watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 select-none pointer-events-none font-heading text-[220px] font-black text-wine">
          404
        </div>

        <div className="relative z-10 space-y-6 max-w-lg mx-auto">
          {/* Compass Icon Badge */}
          <div className="w-20 h-20 rounded-2xl bg-sand-dark/70 text-wine flex items-center justify-center mx-auto shadow-inner border border-sand-dark">
            <Compass className="w-10 h-10 stroke-[2.2] animate-spin-slow" />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase font-heading tracking-widest text-wine block">
              HTTP Error 404 • Missing Endpoint
            </span>
            <h1 className="font-heading text-4xl sm:text-6xl uppercase tracking-tight text-ink">
              PAGE NOT FOUND
            </h1>
          </div>

          <p className="text-sm sm:text-base text-ink/75 leading-relaxed">
            The event, venue, or system route you are attempting to query does not exist in the database or may have been relocated.
          </p>

          {/* Quick Navigation Action Grid */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-wine text-sand font-heading text-xs uppercase tracking-wider font-bold hover:bg-wine-dark transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-wine-light"
            >
              <Home className="w-4 h-4" />
              <span>Return to Home</span>
            </Link>

            <Link
              to="/venues"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-sand-dark/50 border border-sand-dark text-ink font-heading text-xs uppercase tracking-wider font-bold hover:bg-sand-dark hover:text-wine transition-all"
            >
              <Building2 className="w-4 h-4" />
              <span>Browse Venues</span>
            </Link>

            <Link
              to="/events"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-sand-dark/50 border border-sand-dark text-ink font-heading text-xs uppercase tracking-wider font-bold hover:bg-sand-dark hover:text-wine transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span>Explore Events</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
