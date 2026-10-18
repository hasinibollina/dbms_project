import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, PlusCircle, Building2, User, LogOut, ChevronDown, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const { user, logout, login, isOrganizerOrAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.info('You have been logged out.');
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    navigate('/');
  };

  const setDemoRole = (role) => {
    const demoUsers = {
      Admin: { user_id: 1, full_name: 'Sneha Admin', email: 'admin@eventhub.com', role: 'Admin' },
      Organizer: { user_id: 2, full_name: 'Arjun Organizer', email: 'arjun.organizer@gmail.com', role: 'Organizer' },
      Attendee: { user_id: 4, full_name: 'Rohan Attendee', email: 'rohan.v@outlook.com', role: 'Attendee' },
    };

    if (role === 'guest') {
      logout();
      toast.info('Switched to Guest mode');
    } else {
      login(demoUsers[role]);
      toast.success(`Active role set to: ${role}`);
    }
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const navLinkClass = ({ isActive }) =>
    `text-sm font-semibold tracking-wide uppercase px-3 py-2 rounded-lg transition-all duration-150 ${
      isActive
        ? 'text-sand bg-wine-dark shadow-sm border border-sand/30 font-bold'
        : 'text-sand/80 hover:text-sand hover:bg-wine-dark/50'
    }`;

  const mobileNavLinkClass = ({ isActive }) =>
    `block text-base font-semibold tracking-wide uppercase px-4 py-3 rounded-xl transition-colors ${
      isActive
        ? 'bg-wine-dark text-sand border border-sand/30 font-bold'
        : 'text-sand/80 hover:bg-wine-dark/50 hover:text-sand'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-wine text-sand border-b border-sand/20 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Wordmark */}
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="group flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-sand rounded-lg"
              aria-label="Eventilion Home"
            >
              <div className="w-10 h-10 rounded-xl bg-sand text-wine flex items-center justify-center font-heading font-black text-2xl group-hover:scale-105 transition-transform duration-200 shadow-inner">
                E
              </div>
              <span className="font-heading text-2xl md:text-3xl tracking-wider uppercase text-sand group-hover:text-sand-dark transition-colors">
                EVENTILION
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-2 lg:gap-3" aria-label="Main Navigation">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/events" className={navLinkClass}>
              Events
            </NavLink>
            <NavLink to="/venues" className={navLinkClass}>
              Venues
            </NavLink>

            {/* Organizer / Admin only links */}
            {isOrganizerOrAdmin && (
              <>
                <NavLink
                  to="/venues/new"
                  className={({ isActive }) =>
                    `text-xs font-semibold uppercase tracking-wider px-3 py-2 rounded-lg flex items-center gap-1.5 border border-sand/40 ${
                      isActive ? 'bg-sand text-wine font-bold' : 'bg-wine-dark/60 text-sand hover:bg-sand hover:text-wine'
                    } transition-colors`
                  }
                  title="Create a new venue"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Manage Venues</span>
                </NavLink>

                <NavLink
                  to="/events"
                  className="text-xs font-semibold uppercase tracking-wider px-3 py-2 rounded-lg flex items-center gap-1.5 bg-sand/15 text-sand hover:bg-sand hover:text-wine border border-sand/30 transition-colors"
                  title="Create Event (Mock flow)"
                  onClick={(e) => {
                    // Let it navigate to /events or show toast helper
                  }}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Create Event</span>
                </NavLink>
              </>
            )}
          </nav>

          {/* Desktop Right Actions (Auth / Demo Switcher) */}
          <div className="hidden md:flex items-center gap-3">
            {/* Quick DBMS Demo Role Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-wine-dark text-sand text-xs font-medium border border-sand/30 hover:border-sand transition-colors"
                title="Switch role for testing DBMS permissions"
              >
                <Sparkles className="w-3 h-3 text-sand" />
                <span>Role: <strong>{user?.role || 'Guest'}</strong></span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-sand text-ink rounded-xl shadow-poster border border-sand-dark py-2 z-50">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-wine/70 border-b border-sand-dark/60">
                    Switch Persona (DBMS Demo)
                  </div>
                  <button
                    type="button"
                    onClick={() => setDemoRole('Admin')}
                    className={`w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center justify-between hover:bg-sand-dark/40 ${
                      user?.role === 'Admin' ? 'text-wine font-black' : 'text-ink'
                    }`}
                  >
                    <span>Sneha Admin (Admin)</span>
                    {user?.role === 'Admin' && <span className="text-[10px] bg-wine text-sand px-1.5 py-0.5 rounded">Active</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoRole('Organizer')}
                    className={`w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center justify-between hover:bg-sand-dark/40 ${
                      user?.role === 'Organizer' ? 'text-wine font-black' : 'text-ink'
                    }`}
                  >
                    <span>Arjun (Organizer)</span>
                    {user?.role === 'Organizer' && <span className="text-[10px] bg-wine text-sand px-1.5 py-0.5 rounded">Active</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoRole('Attendee')}
                    className={`w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center justify-between hover:bg-sand-dark/40 ${
                      user?.role === 'Attendee' ? 'text-wine font-black' : 'text-ink'
                    }`}
                  >
                    <span>Rohan (Attendee)</span>
                    {user?.role === 'Attendee' && <span className="text-[10px] bg-wine text-sand px-1.5 py-0.5 rounded">Active</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoRole('guest')}
                    className="w-full text-left px-3 py-1.5 text-xs text-ink/70 hover:bg-sand-dark/40 hover:text-wine border-t border-sand-dark/40 mt-1"
                  >
                    Clear (Logged Out Guest)
                  </button>
                </div>
              )}
            </div>

            {/* Auth Buttons */}
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-sand/80 max-w-[120px] truncate" title={user.email}>
                  {user.full_name || user.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sand hover:bg-wine-dark border border-sand/30 hover:border-sand transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                      isActive ? 'bg-wine-dark text-sand' : 'text-sand hover:bg-wine-dark/50'
                    }`
                  }
                >
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-sand text-wine hover:bg-sand-dark transition-all duration-150 shadow-sm"
                >
                  Register
                </NavLink>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-sand hover:bg-wine-dark focus:outline-none focus:ring-2 focus:ring-sand transition-colors"
              aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-wine border-t border-sand/20 px-4 pt-3 pb-6 space-y-2 animate-fadeIn">
          <NavLink
            to="/"
            end
            onClick={() => setMobileMenuOpen(false)}
            className={mobileNavLinkClass}
          >
            Home
          </NavLink>
          <NavLink
            to="/events"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileNavLinkClass}
          >
            Events
          </NavLink>
          <NavLink
            to="/venues"
            onClick={() => setMobileMenuOpen(false)}
            className={mobileNavLinkClass}
          >
            Venues
          </NavLink>

          {isOrganizerOrAdmin && (
            <div className="pt-2 pb-1 border-t border-sand/20 space-y-2">
              <div className="text-[11px] font-heading uppercase text-sand/60 px-4">
                Organizer Tools ({user?.role})
              </div>
              <NavLink
                to="/venues/new"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-base font-semibold tracking-wide uppercase px-4 py-2.5 rounded-xl bg-sand/10 text-sand hover:bg-sand hover:text-wine transition-colors"
              >
                <Building2 className="w-4 h-4" />
                <span>Manage Venues (+ New)</span>
              </NavLink>
              <NavLink
                to="/events"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-base font-semibold tracking-wide uppercase px-4 py-2.5 rounded-xl bg-sand/10 text-sand hover:bg-sand hover:text-wine transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Event</span>
              </NavLink>
            </div>
          )}

          {/* Mobile Persona Switcher */}
          <div className="pt-2 border-t border-sand/20">
            <div className="text-[11px] font-heading uppercase text-sand/60 px-4 mb-2">
              Demo Persona ({user?.role || 'Guest'})
            </div>
            <div className="grid grid-cols-2 gap-2 px-2">
              <button
                type="button"
                onClick={() => setDemoRole('Admin')}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-wine-dark text-sand border border-sand/30 hover:bg-sand hover:text-wine text-left truncate"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('Organizer')}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-wine-dark text-sand border border-sand/30 hover:bg-sand hover:text-wine text-left truncate"
              >
                Organizer
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('Attendee')}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-wine-dark text-sand border border-sand/30 hover:bg-sand hover:text-wine text-left truncate"
              >
                Attendee
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('guest')}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-wine-dark/50 text-sand/80 border border-sand/20 hover:bg-sand hover:text-wine text-left truncate"
              >
                Guest
              </button>
            </div>
          </div>

          {/* Mobile Auth Links */}
          <div className="pt-4 border-t border-sand/20 flex flex-col gap-2">
            {user ? (
              <div className="space-y-2">
                <div className="px-4 text-xs text-sand/70">
                  Signed in as <strong>{user.full_name || user.email}</strong>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider text-sm bg-wine-dark text-sand border border-sand/30"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <NavLink
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 rounded-xl font-bold uppercase tracking-wider text-sm border border-sand/40 text-sand hover:bg-wine-dark"
                >
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 rounded-xl font-bold uppercase tracking-wider text-sm bg-sand text-wine hover:bg-sand-dark"
                >
                  Register
                </NavLink>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
