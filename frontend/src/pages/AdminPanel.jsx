import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Building2,
  Users,
  IndianRupee,
  Star,
  Sparkles,
  RefreshCw,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Store,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { adminApi } from '../api';
import {
  SEED_STATS,
  SEED_EVENTS,
  SEED_VENUES,
  SEED_VENDORS,
  formatINR,
  getStoredEvents,
  getStoredVenues,
  getStoredVendors,
} from '../data/seedData';
import { useToast } from '../context/ToastContext';

// Color Palette from Design Tokens
const COLORS = {
  wine: '#7F011F',
  wineDark: '#5C0116',
  wineLight: '#A3243F',
  sand: '#F5EBD0',
  sandDark: '#E8D9B5',
  ink: '#2B0A12',
  accentGold: '#B8860B',
  accentTeal: '#2A7B88',
};

const CATEGORY_COLORS = ['#7F011F', '#A3243F', '#5C0116', '#B8860B', '#2A7B88', '#8B4513'];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'venues' | 'vendors'
  const [loading, setLoading] = useState(true);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const toast = useToast();

  // Data states
  const [stats, setStats] = useState(SEED_STATS);
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [vendors, setVendors] = useState([]);

  // Events Table States
  const [eventSearch, setEventSearch] = useState('');
  const [eventSortField, setEventSortField] = useState('date');
  const [eventSortAsc, setEventSortAsc] = useState(false);
  const [eventPage, setEventPage] = useState(1);
  const pageSize = 10;

  // Venues Table States
  const [venueSearch, setVenueSearch] = useState('');
  const [venueSortField, setVenueSortField] = useState('revenue_generated');
  const [venueSortAsc, setVenueSortAsc] = useState(false);

  // Vendors Table States
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorSortField, setVendorSortField] = useState('events_served');
  const [vendorSortAsc, setVendorSortAsc] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    let fallbackNeeded = false;

    // 1. Fetch Stats
    try {
      const statsData = await adminApi.getStats();
      if (statsData) {
        setStats({
          ...SEED_STATS,
          ...statsData,
        });
      }
    } catch {
      fallbackNeeded = true;
      setStats(SEED_STATS);
    }

    // 2. Fetch Events
    try {
      const eventsData = await adminApi.getEvents();
      if (Array.isArray(eventsData) && eventsData.length > 0) {
        setEvents(eventsData);
      } else {
        setEvents(getStoredEvents());
      }
    } catch {
      fallbackNeeded = true;
      setEvents(getStoredEvents());
    }

    // 3. Fetch Venues
    try {
      const venuesData = await adminApi.getVenues();
      if (Array.isArray(venuesData) && venuesData.length > 0) {
        setVenues(venuesData);
      } else {
        setVenues(getStoredVenues());
      }
    } catch {
      fallbackNeeded = true;
      setVenues(getStoredVenues());
    }

    // 4. Fetch Vendors
    try {
      const vendorsData = await adminApi.getVendors();
      if (Array.isArray(vendorsData) && vendorsData.length > 0) {
        setVendors(vendorsData);
      } else {
        setVendors(getStoredVendors());
      }
    } catch {
      fallbackNeeded = true;
      setVendors(getStoredVendors());
    }

    setIsUsingFallback(fallbackNeeded);
    setLoading(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // --------------------------------------------------------------------------
  // Events Filter & Sort & Pagination
  // --------------------------------------------------------------------------
  const filteredEvents = useMemo(() => {
    let list = [...events];
    if (eventSearch.trim()) {
      const q = eventSearch.toLowerCase();
      list = list.filter(
        (e) =>
          e.title?.toLowerCase().includes(q) ||
          e.organizer?.toLowerCase().includes(q) ||
          e.venue?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let valA = a[eventSortField];
      let valB = b[eventSortField];

      if (eventSortField === 'pct_sold') {
        valA = a.capacity ? (a.tickets_sold / a.capacity) * 100 : 0;
        valB = b.capacity ? (b.tickets_sold / b.capacity) * 100 : 0;
      }

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB || '');
        return eventSortAsc ? cmp : -cmp;
      }
      return eventSortAsc ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
    });

    return list;
  }, [events, eventSearch, eventSortField, eventSortAsc]);

  const totalEventPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const paginatedEvents = useMemo(() => {
    const start = (eventPage - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, eventPage]);

  const handleEventSort = (field) => {
    if (eventSortField === field) {
      setEventSortAsc(!eventSortAsc);
    } else {
      setEventSortField(field);
      setEventSortAsc(false);
    }
  };

  // --------------------------------------------------------------------------
  // Venues Filter & Sort
  // --------------------------------------------------------------------------
  const filteredVenues = useMemo(() => {
    let list = [...venues];
    if (venueSearch.trim()) {
      const q = venueSearch.toLowerCase();
      list = list.filter(
        (v) => v.name?.toLowerCase().includes(q) || v.city?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const valA = a[venueSortField];
      const valB = b[venueSortField];
      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB || '');
        return venueSortAsc ? cmp : -cmp;
      }
      return venueSortAsc ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
    });
    return list;
  }, [venues, venueSearch, venueSortField, venueSortAsc]);

  const handleVenueSort = (field) => {
    if (venueSortField === field) {
      setVenueSortAsc(!venueSortAsc);
    } else {
      setVenueSortField(field);
      setVenueSortAsc(false);
    }
  };

  // --------------------------------------------------------------------------
  // Vendors Filter & Sort
  // --------------------------------------------------------------------------
  const filteredVendors = useMemo(() => {
    let list = [...vendors];
    if (vendorSearch.trim()) {
      const q = vendorSearch.toLowerCase();
      list = list.filter(
        (v) =>
          v.name?.toLowerCase().includes(q) ||
          v.service_type?.toLowerCase().includes(q) ||
          v.city?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const valA = a[vendorSortField];
      const valB = b[vendorSortField];
      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB || '');
        return vendorSortAsc ? cmp : -cmp;
      }
      return vendorSortAsc ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
    });
    return list;
  }, [vendors, vendorSearch, vendorSortField, vendorSortAsc]);

  const handleVendorSort = (field) => {
    if (vendorSortField === field) {
      setVendorSortAsc(!vendorSortAsc);
    } else {
      setVendorSortField(field);
      setVendorSortAsc(false);
    }
  };

  // Vendor Service Type Bar Chart Data
  const vendorTypeChartData = useMemo(() => {
    const counts = {};
    vendors.forEach((v) => {
      counts[v.service_type] = (counts[v.service_type] || 0) + 1;
    });
    return Object.entries(counts).map(([service_type, count]) => ({
      service_type,
      count,
    }));
  }, [vendors]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 w-full animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pb-6 border-b border-sand-dark">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sand-dark/60 text-wine text-xs font-heading uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Executive DBMS Analytics</span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl uppercase tracking-tighter text-ink">
            ADMIN PANEL
          </h1>
          <p className="text-ink/70 text-sm sm:text-base mt-1 max-w-2xl">
            Cross-domain metrics across tickets sold, venue utilization schedules, and vetted event vendors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sand-dark bg-sand text-ink hover:bg-sand-dark/40 font-heading text-xs uppercase tracking-wider font-bold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-wine"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-wine' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Fallback Notice Banner if API not reachable */}
      {isUsingFallback && (
        <div className="mb-8 p-4 rounded-xl bg-sand border border-sand-dark flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-wine flex-shrink-0 mt-0.5" />
          <div className="text-xs text-ink/80">
            <strong className="text-wine font-semibold block mb-0.5">
              Demonstration Mode (DBMS Seed Data)
            </strong>
            Backend server at {import.meta.env.VITE_API_URL || 'http://localhost:8000'} is offline or unreachable. Displaying local normalized DBMS schema models and aggregate metrics.
          </div>
        </div>
      )}

      {/* =========================================================================
          TOP ROW OF STAT CARDS (ALWAYS VISIBLE)
          ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {/* Total Events */}
        <div className="bg-sand rounded-2xl border border-sand-dark p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-wine mb-2">
            <span className="text-[11px] font-heading uppercase tracking-wider text-ink/70">
              Total Events
            </span>
            <Calendar className="w-4 h-4 text-wine" />
          </div>
          <div>
            <div className="font-heading text-2xl sm:text-3xl text-ink">
              {stats.total_events}
            </div>
            <div className="text-[10px] text-ink/70 font-semibold mt-1">
              <span className="text-emerald-700 font-bold">{stats.upcoming_events} Upcoming</span> • {stats.completed_events} Done
            </div>
          </div>
        </div>

        {/* Total Registrations */}
        <div className="bg-sand rounded-2xl border border-sand-dark p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-wine mb-2">
            <span className="text-[11px] font-heading uppercase tracking-wider text-ink/70">
              Registrations
            </span>
            <Users className="w-4 h-4 text-wine" />
          </div>
          <div>
            <div className="font-heading text-2xl sm:text-3xl text-ink">
              {Number(stats.total_registrations).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-1">
              +14% vs last month
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-sand rounded-2xl border border-sand-dark p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-wine mb-2">
            <span className="text-[11px] font-heading uppercase tracking-wider text-ink/70">
              Total Revenue
            </span>
            <IndianRupee className="w-4 h-4 text-wine" />
          </div>
          <div>
            <div className="font-heading text-2xl sm:text-3xl text-wine truncate" title={formatINR(stats.total_revenue)}>
              {formatINR(stats.total_revenue)}
            </div>
            <div className="text-[10px] text-ink/70 font-semibold mt-1">
              Gross ticket sales
            </div>
          </div>
        </div>

        {/* Total Venues */}
        <div className="bg-sand rounded-2xl border border-sand-dark p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-wine mb-2">
            <span className="text-[11px] font-heading uppercase tracking-wider text-ink/70">
              Venues
            </span>
            <Building2 className="w-4 h-4 text-wine" />
          </div>
          <div>
            <div className="font-heading text-2xl sm:text-3xl text-ink">
              {stats.total_venues}
            </div>
            <div className="text-[10px] text-ink/70 font-semibold mt-1">
              Active halls & stages
            </div>
          </div>
        </div>

        {/* Total Vendors */}
        <div className="bg-sand rounded-2xl border border-sand-dark p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-wine mb-2">
            <span className="text-[11px] font-heading uppercase tracking-wider text-ink/70">
              Total Vendors
            </span>
            <Store className="w-4 h-4 text-wine" />
          </div>
          <div>
            <div className="font-heading text-2xl sm:text-3xl text-ink">
              {stats.total_vendors}
            </div>
            <div className="text-[10px] text-ink/70 font-semibold mt-1">
              <span className="text-emerald-700 font-bold">{stats.active_vendors} Active</span> • {stats.inactive_vendors} Idle
            </div>
          </div>
        </div>

        {/* Average Event Rating */}
        <div className="bg-sand rounded-2xl border border-sand-dark p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-wine mb-2">
            <span className="text-[11px] font-heading uppercase tracking-wider text-ink/70">
              Avg Rating
            </span>
            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
          </div>
          <div>
            <div className="font-heading text-2xl sm:text-3xl text-ink flex items-center gap-1.5">
              <span>{stats.avg_rating}</span>
              <span className="text-xs text-ink/60 font-sans font-normal">/ 5.0</span>
            </div>
            <div className="text-[10px] text-amber-800 font-semibold mt-1">
              From verified reviews
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          DASHBOARD TABS (Events | Venues | Vendors)
          ========================================================================= */}
      <div className="flex items-center gap-2 mb-8 border-b border-sand-dark pb-4 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading text-xs uppercase tracking-wider font-bold transition-all ${
            activeTab === 'events'
              ? 'bg-wine text-sand shadow-sm'
              : 'bg-sand text-ink/70 hover:text-wine hover:bg-sand-dark/40 border border-sand-dark'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Events Analytics</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('venues')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading text-xs uppercase tracking-wider font-bold transition-all ${
            activeTab === 'venues'
              ? 'bg-wine text-sand shadow-sm'
              : 'bg-sand text-ink/70 hover:text-wine hover:bg-sand-dark/40 border border-sand-dark'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Venues Utilization</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vendors')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading text-xs uppercase tracking-wider font-bold transition-all ${
            activeTab === 'vendors'
              ? 'bg-wine text-sand shadow-sm'
              : 'bg-sand text-ink/70 hover:text-wine hover:bg-sand-dark/40 border border-sand-dark'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Vendors Directory</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: EVENTS
          ========================================================================= */}
      {activeTab === 'events' && (
        <div className="space-y-10 animate-fadeIn">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Line Chart: Registrations per week (Last 12 weeks) */}
            <div className="bg-sand rounded-2xl border border-sand-dark p-6 shadow-sm flex flex-col justify-between">
              <div className="mb-4">
                <div className="flex items-center gap-2 text-wine font-heading text-xs uppercase tracking-wider mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>Growth Velocity</span>
                </div>
                <h3 className="font-heading text-xl uppercase tracking-tight text-ink">
                  Registrations per Week (Last 12 Weeks)
                </h3>
                <p className="text-xs text-ink/70">
                  Weekly ticket booking momentum across all listed conferences and festivals.
                </p>
              </div>

              <div className="h-64 sm:h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.weekly_registrations} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.sandDark} />
                    <XAxis
                      dataKey="week"
                      stroke={COLORS.ink}
                      fontSize={11}
                      tickLine={false}
                      fontFamily="Inter"
                    />
                    <YAxis
                      stroke={COLORS.ink}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      fontFamily="Inter"
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-wine text-sand p-3 rounded-xl shadow-poster text-xs border border-sand/30">
                              <p className="font-heading uppercase tracking-wider text-[11px] mb-1">
                                {data.label || label}
                              </p>
                              <p className="font-semibold">
                                Registrations: <strong>{payload[0].value}</strong>
                              </p>
                              <p className="text-sand/80 text-[10px]">
                                Gross: {formatINR(data.revenue)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="registrations"
                      name="Registrations"
                      stroke={COLORS.wine}
                      strokeWidth={3}
                      dot={{ fill: COLORS.wineDark, r: 4, strokeWidth: 1, stroke: COLORS.sand }}
                      activeDot={{ r: 6, fill: COLORS.sand, stroke: COLORS.wine, strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart: Revenue by Category */}
            <div className="bg-sand rounded-2xl border border-sand-dark p-6 shadow-sm flex flex-col justify-between">
              <div className="mb-4">
                <div className="flex items-center gap-2 text-wine font-heading text-xs uppercase tracking-wider mb-1">
                  <BarChart3 className="w-4 h-4" />
                  <span>Category Breakdown</span>
                </div>
                <h3 className="font-heading text-xl uppercase tracking-tight text-ink">
                  Revenue by Event Category
                </h3>
                <p className="text-xs text-ink/70">
                  Aggregated gross ticket earnings (₹) grouped by database category domain.
                </p>
              </div>

              <div className="h-64 sm:h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.category_revenue} margin={{ top: 10, right: 15, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.sandDark} />
                    <XAxis
                      dataKey="category"
                      stroke={COLORS.ink}
                      fontSize={10}
                      tickLine={false}
                      angle={-20}
                      textAnchor="end"
                      fontFamily="Inter"
                    />
                    <YAxis
                      stroke={COLORS.ink}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `₹${val / 1000}k`}
                      fontFamily="Inter"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-wine text-sand p-3 rounded-xl shadow-poster text-xs border border-sand/30">
                              <p className="font-heading uppercase tracking-wider text-[11px] mb-1">
                                {data.category}
                              </p>
                              <p className="font-bold text-sm">
                                {formatINR(data.revenue)}
                              </p>
                              <p className="text-sand/80 text-[10px]">
                                Events: {data.events}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]}>
                      {stats.category_revenue.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Table of ALL Events */}
          <div className="bg-sand rounded-2xl border border-sand-dark p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-heading text-xl uppercase tracking-tight text-ink">
                  All Events Ledger
                </h3>
                <p className="text-xs text-ink/70">
                  Comprehensive master table displaying organizers, capacity saturation, and revenue.
                </p>
              </div>

              {/* Search Box */}
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-wine absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={eventSearch}
                  onChange={(e) => {
                    setEventSearch(e.target.value);
                    setEventPage(1);
                  }}
                  placeholder="Search events, organizer, venue..."
                  className="w-full pl-10 pr-4 py-2 bg-sand-dark/40 border border-sand-dark rounded-xl text-xs font-medium text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-wine"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-sand-dark">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-sand-dark/60 text-wine border-b border-sand-dark font-heading uppercase tracking-wider text-[11px]">
                    <th
                      className="p-3.5 cursor-pointer hover:bg-sand-dark/80 transition-colors"
                      onClick={() => handleEventSort('title')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Event Title</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 cursor-pointer hover:bg-sand-dark/80 transition-colors"
                      onClick={() => handleEventSort('organizer')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Organizer</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 cursor-pointer hover:bg-sand-dark/80 transition-colors"
                      onClick={() => handleEventSort('venue')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Venue & City</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 cursor-pointer hover:bg-sand-dark/80 transition-colors"
                      onClick={() => handleEventSort('date')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Date</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 cursor-pointer hover:bg-sand-dark/80 transition-colors"
                      onClick={() => handleEventSort('tickets_sold')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Tickets Sold / Cap</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 cursor-pointer hover:bg-sand-dark/80 transition-colors"
                      onClick={() => handleEventSort('pct_sold')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>% Sold</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 cursor-pointer hover:bg-sand-dark/80 transition-colors text-right"
                      onClick={() => handleEventSort('revenue')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Revenue</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-dark/60 font-medium">
                  {paginatedEvents.length > 0 ? (
                    paginatedEvents.map((ev) => {
                      const pct = ev.capacity
                        ? Math.min(100, Math.round((ev.tickets_sold / ev.capacity) * 100))
                        : 0;

                      return (
                        <tr key={ev.event_id} className="hover:bg-sand-dark/25 transition-colors">
                          <td className="p-3.5">
                            <span className="font-heading text-ink block truncate max-w-[200px]" title={ev.title}>
                              {ev.title}
                            </span>
                            <span className="text-[10px] text-wine font-semibold uppercase tracking-wider">
                              {ev.category}
                            </span>
                          </td>
                          <td className="p-3.5 text-ink/90 font-semibold truncate max-w-[130px]">
                            {ev.organizer}
                          </td>
                          <td className="p-3.5 text-ink/80 truncate max-w-[150px]">
                            <span className="block truncate">{ev.venue}</span>
                            <span className="text-[10px] text-ink/60">{ev.city}</span>
                          </td>
                          <td className="p-3.5 text-ink/80 whitespace-nowrap">
                            {ev.date?.split(' ')[0] || ev.date}
                          </td>
                          <td className="p-3.5 text-ink/90">
                            <strong>{ev.tickets_sold}</strong> / {ev.capacity}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-sand-dark rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    pct >= 90 ? 'bg-emerald-600' : pct >= 70 ? 'bg-wine' : 'bg-amber-600'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-ink/80">{pct}%</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-right font-heading text-wine whitespace-nowrap">
                            {formatINR(ev.revenue)}
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-heading uppercase tracking-wider ${
                                ev.status === 'Scheduled'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : ev.status === 'Completed'
                                  ? 'bg-sand-dark/70 text-ink/80 border border-sand-dark'
                                  : 'bg-red-100 text-red-800 border border-red-300'
                              }`}
                            >
                              {ev.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-ink/60">
                        No events found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (10 rows per page) */}
            <div className="flex items-center justify-between pt-4 mt-2 text-xs text-ink/70">
              <div>
                Showing <strong>{(eventPage - 1) * pageSize + 1}</strong> to{' '}
                <strong>{Math.min(eventPage * pageSize, filteredEvents.length)}</strong> of{' '}
                <strong>{filteredEvents.length}</strong> events
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEventPage((p) => Math.max(1, p - 1))}
                  disabled={eventPage === 1}
                  className="p-2 rounded-lg border border-sand-dark hover:bg-sand-dark/40 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-heading text-xs px-2">
                  Page {eventPage} of {totalEventPages}
                </span>
                <button
                  type="button"
                  onClick={() => setEventPage((p) => Math.min(totalEventPages, p + 1))}
                  disabled={eventPage === totalEventPages}
                  className="p-2 rounded-lg border border-sand-dark hover:bg-sand-dark/40 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: VENUES
          ========================================================================= */}
      {activeTab === 'venues' && (
        <div className="space-y-10 animate-fadeIn">
          {/* Bar Chart: Events Hosted per Venue */}
          <div className="bg-sand rounded-2xl border border-sand-dark p-6 shadow-sm">
            <div className="mb-4">
              <div className="flex items-center gap-2 text-wine font-heading text-xs uppercase tracking-wider mb-1">
                <Building2 className="w-4 h-4" />
                <span>Venue Utilization & Bookings</span>
              </div>
              <h3 className="font-heading text-xl uppercase tracking-tight text-ink">
                Events Hosted per Venue
              </h3>
              <p className="text-xs text-ink/70">
                Total finished and scheduled event contracts executed at each venue facility.
              </p>
            </div>

            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={venues} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.sandDark} />
                  <XAxis
                    dataKey="name"
                    stroke={COLORS.ink}
                    fontSize={10}
                    tickLine={false}
                    angle={-15}
                    textAnchor="end"
                    fontFamily="Inter"
                  />
                  <YAxis
                    stroke={COLORS.ink}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    fontFamily="Inter"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-wine text-sand p-3 rounded-xl shadow-poster text-xs border border-sand/30">
                            <p className="font-heading uppercase tracking-wider text-[11px] mb-1">
                              {data.name}
                            </p>
                            <p className="font-bold">
                              Events Hosted: <strong>{data.events_hosted}</strong>
                            </p>
                            <p className="text-sand/80 text-[10px]">
                              Total Bookings: {data.total_bookings} • Utilisation: {data.utilisation_pct}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="events_hosted" name="Events Hosted" fill={COLORS.wineDark} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table of ALL Venues */}
          <div className="bg-sand rounded-2xl border border-sand-dark p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-heading text-xl uppercase tracking-tight text-ink">
                  Venue Operations & Financial Performance
                </h3>
                <p className="text-xs text-ink/70">
                  Capacity ratios, hourly rental rates, and aggregate venue gross earnings.
                </p>
              </div>

              {/* Search Box */}
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-wine absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={venueSearch}
                  onChange={(e) => setVenueSearch(e.target.value)}
                  placeholder="Search venue name, city..."
                  className="w-full pl-10 pr-4 py-2 bg-sand-dark/40 border border-sand-dark rounded-xl text-xs font-medium text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-wine"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-sand-dark">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-sand-dark/60 text-wine border-b border-sand-dark font-heading uppercase tracking-wider text-[11px]">
                    <th
                      className="p-3.5 cursor-pointer hover:bg-sand-dark/80 transition-colors"
                      onClick={() => handleVenueSort('name')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Venue Name</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 cursor-pointer hover:bg-sand-dark/80 transition-colors"
                      onClick={() => handleVenueSort('city')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>City</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 cursor-pointer hover:bg-sand-dark/80 transition-colors text-right"
                      onClick={() => handleVenueSort('capacity')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Capacity</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 cursor-pointer hover:bg-sand-dark/80 transition-colors text-right"
                      onClick={() => handleVenueSort('price_per_hour')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Hourly Rate</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 cursor-pointer hover:bg-sand-dark/80 transition-colors text-center"
                      onClick={() => handleVenueSort('events_hosted')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Events Hosted</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 cursor-pointer hover:bg-sand-dark/80 transition-colors text-center"
                      onClick={() => handleVenueSort('total_bookings')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Total Bookings</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 cursor-pointer hover:bg-sand-dark/80 transition-colors text-center"
                      onClick={() => handleVenueSort('utilisation_pct')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Utilisation %</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 cursor-pointer hover:bg-sand-dark/80 transition-colors text-right"
                      onClick={() => handleVenueSort('revenue_generated')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Revenue Generated</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-dark/60 font-medium">
                  {filteredVenues.length > 0 ? (
                    filteredVenues.map((v) => (
                      <tr key={v.venue_id} className="hover:bg-sand-dark/25 transition-colors">
                        <td className="p-3.5 font-heading text-ink text-sm">
                          {v.name}
                        </td>
                        <td className="p-3.5 text-wine font-semibold uppercase tracking-wider text-[11px]">
                          {v.city}
                        </td>
                        <td className="p-3.5 text-right font-semibold text-ink/90">
                          {Number(v.capacity).toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right font-semibold text-ink/90">
                          ₹{Number(v.price_per_hour).toLocaleString('en-IN')}/hr
                        </td>
                        <td className="p-3.5 text-center font-bold text-ink">
                          {v.events_hosted}
                        </td>
                        <td className="p-3.5 text-center text-ink/80">
                          {Number(v.total_bookings).toLocaleString()}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-heading bg-sand-dark text-ink font-bold">
                            {v.utilisation_pct}%
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-heading text-wine text-sm whitespace-nowrap">
                          {formatINR(v.revenue_generated)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-ink/60">
                        No venues match your search query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: VENDORS
          ========================================================================= */}
      {activeTab === 'vendors' && (
        <div className="space-y-10 animate-fadeIn">
          {/* Bar Chart: Vendors by Service Type */}
          <div className="bg-sand rounded-2xl border border-sand-dark p-6 shadow-sm">
            <div className="mb-4">
              <div className="flex items-center gap-2 text-wine font-heading text-xs uppercase tracking-wider mb-1">
                <Store className="w-4 h-4" />
                <span>Service Specialization</span>
              </div>
              <h3 className="font-heading text-xl uppercase tracking-tight text-ink">
                Vendors by Service Type
              </h3>
              <p className="text-xs text-ink/70">
                Distribution of verified partners across catering, audio-visual, staging, and security.
              </p>
            </div>

            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vendorTypeChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.sandDark} />
                  <XAxis
                    dataKey="service_type"
                    stroke={COLORS.ink}
                    fontSize={11}
                    tickLine={false}
                    fontFamily="Inter"
                  />
                  <YAxis
                    stroke={COLORS.ink}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    fontFamily="Inter"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-wine text-sand p-3 rounded-xl shadow-poster text-xs border border-sand/30">
                            <p className="font-heading uppercase tracking-wider text-[11px] mb-1">
                              {data.service_type}
                            </p>
                            <p className="font-bold">
                              Vendors Count: <strong>{data.count}</strong>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" name="Vendors" fill={COLORS.wineLight} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table of ALL Vendors */}
          <div className="bg-sand rounded-2xl border border-sand-dark p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-heading text-xl uppercase tracking-tight text-ink">
                  Vendors Registry
                </h3>
                <p className="text-xs text-ink/70">
                  Operational partners, service specialization domains, and lifetime event assignments.
                </p>
              </div>

              {/* Search Box */}
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-wine absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  placeholder="Search vendor name, service, city..."
                  className="w-full pl-10 pr-4 py-2 bg-sand-dark/40 border border-sand-dark rounded-xl text-xs font-medium text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-wine"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-sand-dark">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-sand-dark/60 text-wine border-b border-sand-dark font-heading uppercase tracking-wider text-[11px]">
                    <th
                      className="p-3.5 cursor-pointer hover:bg-sand-dark/80 transition-colors"
                      onClick={() => handleVendorSort('name')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Vendor Name</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 cursor-pointer hover:bg-sand-dark/80 transition-colors"
                      onClick={() => handleVendorSort('service_type')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Service Type</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 cursor-pointer hover:bg-sand-dark/80 transition-colors text-center"
                      onClick={() => handleVendorSort('events_served')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Events Served</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 cursor-pointer hover:bg-sand-dark/80 transition-colors text-center"
                      onClick={() => handleVendorSort('rating')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Rating</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-dark/60 font-medium">
                  {filteredVendors.length > 0 ? (
                    filteredVendors.map((vnd) => (
                      <tr key={vnd.vendor_id} className="hover:bg-sand-dark/25 transition-colors">
                        <td className="p-3.5">
                          <span className="font-heading text-ink text-sm block">
                            {vnd.name}
                          </span>
                          <span className="text-[10px] text-ink/60">
                            {vnd.city} • {vnd.phone}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-heading uppercase tracking-wider bg-sand-dark text-wine">
                            {vnd.service_type}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold text-ink text-sm">
                          {vnd.events_served || 0}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            {vnd.rating}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-[10px] font-heading uppercase tracking-wider font-bold ${
                              vnd.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}
                          >
                            {vnd.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-ink/60">
                        No vendors match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
