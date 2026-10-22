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
import { formatINR } from '../data/seedData';
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
  const [loadError, setLoadError] = useState('');
  const toast = useToast();

  // Data states
  const [stats, setStats] = useState({
    total_events: 0,
    upcoming_events: 0,
    completed_events: 0,
    total_registrations: 0,
    total_revenue: 0,
    total_venues: 0,
    total_vendors: 0,
    total_services: 0,
    avg_rating: null,
    weekly_registrations: [],
    category_revenue: [],
  });
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [vendors, setVendors] = useState([]);

  // Events Table States
  const [eventSearch, setEventSearch] = useState('');
  const [eventSortField, setEventSortField] = useState('start_time');
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
    setLoadError('');
    try {
      const [statsData, eventsData, venuesData, vendorsData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getEvents(),
        adminApi.getVenues(),
        adminApi.getVendors(),
      ]);
      setStats((prev) => ({ ...prev, ...statsData }));
      // Rows come straight from the database; only add display helpers here.
      setEvents(
        (eventsData || []).map((e) => ({
          ...e,
          category: e.category_name || 'Uncategorized',
          venue: e.venue_name || 'No venue',
          city: e.venue_city || '',
          tickets_sold: Number(e.tickets_sold) || 0,
          revenue: Number(e.revenue) || 0,
          capacity: Number(e.capacity) || 0,
        }))
      );
      setVenues(
        (venuesData || []).map((v) => ({
          ...v,
          capacity: Number(v.capacity) || 0,
          price_per_hour: Number(v.price_per_hour) || 0,
          events_hosted: Number(v.events_hosted) || 0,
          total_bookings: Number(v.total_bookings) || 0,
          revenue_generated: Number(v.revenue_generated) || 0,
        }))
      );
      setVendors(
        (vendorsData || []).map((v) => ({
          ...v,
          events_served: Number(v.events_served) || 0,
          total_agreed_cost: Number(v.total_agreed_cost) || 0,
        }))
      );
    } catch (err) {
      setLoadError(err.message || 'Could not load analytics.');
    } finally {
      setLoading(false);
    }
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
          e.city?.toLowerCase().includes(q) ||
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
          v.vendor_name?.toLowerCase().includes(q) ||
          v.service_name?.toLowerCase().includes(q) ||
          v.email?.toLowerCase().includes(q)
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
      counts[v.service_name] = (counts[v.service_name] || 0) + 1;
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

      {loadError && (
        <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-300 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-ink/80">
            <strong className="text-red-700 font-semibold block mb-0.5">
              Could not load analytics from the database
            </strong>
            {loadError}
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
              Tickets in non-cancelled bookings
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
              <span className="text-emerald-700 font-bold">{stats.total_services}</span> service types
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
              <span>{stats.avg_rating != null ? stats.avg_rating : '—'}</span>
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
                      dataKey="label"
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
                  All rows in the events table with category, venue, tickets sold and revenue.
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
                  placeholder="Search events, venue, city..."
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
                      onClick={() => handleEventSort('ticket_price')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Ticket Price</span>
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
                      onClick={() => handleEventSort('start_time')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Date & Time</span>
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
                          <td className="p-3.5 text-ink/90 font-semibold whitespace-nowrap">
                            {formatINR(ev.ticket_price)}
                          </td>
                          <td className="p-3.5 text-ink/80 truncate max-w-[150px]">
                            <span className="block truncate">{ev.venue}</span>
                            <span className="text-[10px] text-ink/60">{ev.city}</span>
                          </td>
                          <td className="p-3.5 text-ink/80 whitespace-nowrap">
                            {ev.start_time
                              ? new Date(ev.start_time).toLocaleDateString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'TBD'}
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
                                ev.status === 'published'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : ev.status === 'completed' || ev.status === 'draft'
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
                        {events.length === 0 ? 'No events in the database yet.' : 'No events found matching your search.'}
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
                              Total Bookings: {data.total_bookings} • {data.is_active ? 'Active' : 'Inactive'}
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
                      onClick={() => handleVenueSort('is_active')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Status</span>
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
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-heading uppercase tracking-wider font-bold ${
                              v.is_active
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}
                          >
                            {v.is_active ? 'Active' : 'Inactive'}
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
                        {venues.length === 0 ? 'No venues in the database yet.' : 'No venues match your search query.'}
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
                How many vendors offer each service, from the services table.
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

          {/* Table of ALL Vendors (connected to services schema) */}
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
                  placeholder="Search vendor name, service, email..."
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
                      onClick={() => handleVendorSort('vendor_name')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Vendor Name</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 cursor-pointer hover:bg-sand-dark/80 transition-colors"
                      onClick={() => handleVendorSort('service_name')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Service</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="p-3.5">Contact</th>
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
                      className="p-3.5 cursor-pointer hover:bg-sand-dark/80 transition-colors text-right"
                      onClick={() => handleVendorSort('total_agreed_cost')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Agreed Cost</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-dark/60 font-medium">
                  {filteredVendors.length > 0 ? (
                    filteredVendors.map((vnd) => (
                      <tr key={vnd.vendor_id} className="hover:bg-sand-dark/25 transition-colors">
                        <td className="p-3.5 max-w-xs">
                          <span className="font-heading text-ink text-sm block">{vnd.vendor_name}</span>
                          {vnd.service_description && (
                            <span className="text-[10px] text-ink/60 line-clamp-1">{vnd.service_description}</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-heading uppercase tracking-wider bg-sand-dark text-wine">
                            {vnd.service_name}
                          </span>
                        </td>
                        <td className="p-3.5 text-ink/80 whitespace-nowrap">
                          <span className="block">{vnd.phone || '—'}</span>
                          <span className="text-[10px] text-ink/60">{vnd.email || ''}</span>
                        </td>
                        <td className="p-3.5 text-center font-bold text-ink text-sm">
                          {vnd.events_served}
                        </td>
                        <td className="p-3.5 text-right font-heading text-wine whitespace-nowrap">
                          {formatINR(vnd.total_agreed_cost)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-ink/60">
                        {vendors.length === 0 ? 'No vendors in the database yet.' : 'No vendors match your search.'}
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
