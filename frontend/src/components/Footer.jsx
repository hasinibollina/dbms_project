import React from 'react';
import { Link } from 'react-router-dom';
import { Database, Calendar, MapPin, ShieldCheck, ArrowUpRight } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-wine-dark text-sand border-t-2 border-sand/20 mt-auto">
      {/* Upper Poster Strip */}
      <div className="border-b border-sand/15 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="inline-block text-xs uppercase tracking-widest font-bold text-sand/70 mb-2">
              College DBMS Project
            </span>
            <h2 className="font-heading text-4xl sm:text-5xl md:text-6xl uppercase tracking-tighter text-sand">
              EVENTILION
            </h2>
            <p className="text-sand/80 text-sm sm:text-base mt-2 max-w-xl font-medium">
              High-performance Event & Venue Management DBMS. Normalized relational architecture for venues, real-time operating hours, schedules, and event reservations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/venues"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-sand text-wine font-heading uppercase text-xs tracking-wider font-bold hover:bg-sand-dark transition-colors shadow-sm"
            >
              <span>Explore Venues</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              to="/events"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-wine text-sand border border-sand/30 font-heading uppercase text-xs tracking-wider font-bold hover:bg-wine-light transition-colors"
            >
              <span>Find Events</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Col 1: System Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sand font-heading uppercase text-sm">
              <Database className="w-4 h-4" />
              <span>DBMS Schema</span>
            </div>
            <p className="text-xs text-sand/70 leading-relaxed">
              PostgreSQL relational backend powering atomic ACID transactions, cascaded operating hours, and role-based access for Attendees, Organizers, and Admins.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] px-2 py-0.5 rounded bg-sand/10 text-sand border border-sand/20 font-mono">
                Users
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-sand/10 text-sand border border-sand/20 font-mono">
                Venues
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-sand/10 text-sand border border-sand/20 font-mono">
                OperatingHours
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-sand/10 text-sand border border-sand/20 font-mono">
                Categories
              </span>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h3 className="font-heading uppercase text-sm tracking-wider text-sand mb-4">
              Explore
            </h3>
            <ul className="space-y-2.5 text-xs text-sand/80">
              <li>
                <Link to="/" className="hover:text-sand hover:underline underline-offset-4">
                  Home Overview
                </Link>
              </li>
              <li>
                <Link to="/events" className="hover:text-sand hover:underline underline-offset-4">
                  Browse All Events
                </Link>
              </li>
              <li>
                <Link to="/venues" className="hover:text-sand hover:underline underline-offset-4">
                  Venues & Facilities
                </Link>
              </li>
              <li>
                <Link to="/venues/new" className="hover:text-sand hover:underline underline-offset-4">
                  Register Venue (Organizer)
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: DBMS Modules */}
          <div>
            <h3 className="font-heading uppercase text-sm tracking-wider text-sand mb-4">
              Modules
            </h3>
            <ul className="space-y-2.5 text-xs text-sand/80">
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-sand/60" />
                <span>Venue Capacity & Schedules</span>
              </li>
              <li className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-sand/60" />
                <span>Event Discovery & Filtering</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-sand/60" />
                <span>Role-Based Authentication</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Tech Stack Badge */}
          <div className="rounded-2xl p-4 bg-wine/60 border border-sand/20 space-y-2.5">
            <span className="text-[11px] font-heading uppercase text-sand tracking-wider block">
              Frontend Architecture
            </span>
            <p className="text-xs text-sand/80 leading-relaxed">
              Vite + React 19, Tailwind CSS custom wine & sand tokens, Google Fonts Archivo Black & Inter, pure fetch API.
            </p>
            <div className="text-[11px] text-sand/60 font-mono pt-1">
              Base: {import.meta.env.VITE_API_URL || 'http://localhost:8000'}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 mt-8 border-t border-sand/15 flex flex-col sm:flex-row items-center justify-between text-xs text-sand/60 gap-4">
          <p>© {currentYear} EVENTILION DBMS Project. All rights reserved.</p>
          <p className="text-sand/70 font-medium">
            Designed with <span className="text-sand">Wine & Sand</span> Aesthetics
          </p>
        </div>
      </div>
    </footer>
  );
}
