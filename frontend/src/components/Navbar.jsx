import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// Central Role Configuration for Navigation Items (only guest, organizer, admin)
export const NAV_ITEMS = [
  { label: 'Home', path: '/', allowedRoles: ['guest', 'organizer', 'admin'] },
  { label: 'Events', path: '/events', allowedRoles: ['guest', 'organizer', 'admin'] },
  { label: 'Manage Events', path: '/manage-events', allowedRoles: ['organizer', 'admin'] },
  { label: 'Manage Venues', path: '/admin/venues', allowedRoles: ['admin'] },
  { label: 'Manage Vendors', path: '/admin/vendors', allowedRoles: ['admin'] },
  { label: 'Admin Panel', path: '/admin', allowedRoles: ['admin'] },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Role comes strictly from logged-in user record ('admin' | 'organizer' | 'guest')
  const currentRole = user
    ? user.role?.toLowerCase() === 'admin'
      ? 'admin'
      : 'organizer'
    : 'guest';

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    item.allowedRoles.includes(currentRole)
  );

  const handleLogout = () => {
    logout();
    toast.info('You have been logged out.');
    setMobileMenuOpen(false);
    navigate('/');
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
          {/* Left: Logo & Nav Links */}
          <div className="flex items-center gap-4 lg:gap-8">
            <Link
              to="/"
              className="group flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sand rounded-lg"
              aria-label="Eventilion Home"
            >
              <div className="w-10 h-10 rounded-xl bg-sand text-wine flex items-center justify-center font-heading font-black text-2xl group-hover:scale-105 transition-transform duration-200 shadow-inner">
                E
              </div>
              <span className="font-heading text-2xl lg:text-3xl tracking-wider uppercase text-sand group-hover:text-sand-dark transition-colors">
                EVENTILION
              </span>
            </Link>

            {/* Desktop Navigation Links (Visible on screens >= 900px) */}
            <nav className="hidden min-[900px]:flex items-center gap-1.5 lg:gap-2.5" aria-label="Main Navigation">
              {visibleNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={navLinkClass}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right: Auth Controls (Desktop >= 900px) */}
          <div className="hidden min-[900px]:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span
                  className="text-xs font-semibold text-sand/90 max-w-[140px] truncate"
                  title={user.email}
                >
                  {user.name || user.email}
                </span>

                {/* Small role badge (plain label, not clickable) */}
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-heading uppercase tracking-wider font-bold bg-wine-dark text-sand border border-sand/30 shadow-sm cursor-default">
                  {currentRole === 'admin' ? 'Admin' : 'Organizer'}
                </span>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sand hover:bg-wine-dark border border-sand/30 hover:border-sand transition-all"
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
                    `inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-heading uppercase tracking-wider font-bold transition-all shadow-sm ${
                      isActive
                        ? 'bg-wine-dark text-sand border border-sand/40'
                        : 'bg-sand text-wine hover:bg-sand-dark'
                    }`
                  }
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login</span>
                </NavLink>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button (< 900px) */}
          <div className="min-[900px]:hidden flex items-center gap-2">
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

      {/* Mobile Menu Dropdown (< 900px) */}
      {mobileMenuOpen && (
        <div className="min-[900px]:hidden bg-wine border-t border-sand/20 px-4 pt-3 pb-6 space-y-3 animate-fadeIn">
          {/* Navigation Items */}
          <div className="space-y-1">
            <div className="text-[11px] font-heading uppercase text-sand/60 px-4 pb-1">
              Navigation
            </div>
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass}
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* Mobile Auth Controls */}
          <div className="pt-3 border-t border-sand/20">
            {user ? (
              <div className="space-y-3">
                <div className="px-4 flex items-center justify-between text-xs text-sand/90">
                  <span className="font-semibold truncate max-w-[180px]">
                    {user.name || user.email}
                  </span>
                  {/* Small role badge (plain label, not clickable) */}
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-heading uppercase tracking-wider font-bold bg-wine-dark text-sand border border-sand/30 cursor-default">
                    {currentRole === 'admin' ? 'Admin' : 'Organizer'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-heading text-xs uppercase tracking-wider font-bold bg-wine-dark text-sand border border-sand/30 hover:bg-sand hover:text-wine transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-heading text-xs uppercase tracking-wider font-bold bg-sand text-wine hover:bg-sand-dark transition-colors shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                Login
              </NavLink>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
