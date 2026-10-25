import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  Building2,
  Clock,
  IndianRupee,
  Users,
  Sparkles,
  Ban,
  ArrowUpDown,
  RefreshCw,
  Tag,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import { eventsApi, categoriesApi, venuesApi } from '../api';

// Values allowed by the events.status CHECK constraint in the database
const STATUS_TABS = [
  { value: 'All', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_STYLES = {
  published: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
  draft: 'bg-amber-100 text-amber-900 border border-amber-300',
  completed: 'bg-sand-dark text-ink border border-sand-dark',
  cancelled: 'bg-red-100 text-red-800 border border-red-300',
};

const EMPTY_FORM = {
  title: '',
  category_id: '',
  venue_id: '',
  start_time: '',
  end_time: '',
  ticket_price: '499',
  capacity: '500',
  status: 'published',
  description: '',
};

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ISO timestamp -> value for <input type="datetime-local"> in the viewer's local time
function toInputDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getDayOfWeekFromDateString(isoStr) {
  if (!isoStr) return null;
  const match = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const d = new Date(year, month, day);
  const jsDay = d.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  return (jsDay + 6) % 7; // 0 is Monday ... 6 is Sunday
}

function getTimeFromDateString(isoStr) {
  if (!isoStr) return null;
  const match = isoStr.match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return `${match[1]}:${match[2]}:00`;
}

export default function ManageEvents() {
  const { user } = useAuth();
  const toast = useToast();

  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [venues, setVenues] = useState([]);
  const [vendors, setVendors] = useState([]);
  // { [event_id]: [{vendor_name, service_name, agreed_cost}] } shown in the table
  const [eventVendorMap, setEventVendorMap] = useState({});
  const [services, setServices] = useState([]);
  // Vendor choice per service in the form: { [service_id]: { vendor_id, agreed_cost } }
  const [vendorChoices, setVendorChoices] = useState({});
  // What was saved before editing, to work out what to add/remove
  const [originalVendorChoices, setOriginalVendorChoices] = useState({});
  const [loadingEventVendors, setLoadingEventVendors] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Create / Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // null = Create, object = Edit
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Venue Operating Hours state
  const [venueHours, setVenueHours] = useState([]);
  const [loadingHours, setLoadingHours] = useState(false);

  // Quick Add Category Modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  // Cancel confirmation modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [eventToCancel, setEventToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const isAdmin = user?.role?.toLowerCase() === 'admin';

  // Only the logged-in user's own events (GET /api/events/mine).
  // Admins see every event in the Admin Panel instead.
  const loadEvents = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [mine, categoryRows, venueRows, vendorRows, serviceRows] = await Promise.all([
        eventsApi.getMine(),
        categoriesApi.getAll().catch(() => []),
        venuesApi.getAll().catch(() => []),
        vendorsApi.getAll().catch(() => []),
        servicesApi.getAll().catch(() => []),
      ]);
      const mineList = Array.isArray(mine) ? mine : [];
      setEvents(mineList);
      // Vendors booked for each of the user's events
      const vendorLists = await Promise.all(
        mineList.map((e) => eventsApi.getVendors(e.event_id).catch(() => []))
      );
      const vmap = {};
      mineList.forEach((e, i) => {
        vmap[e.event_id] = Array.isArray(vendorLists[i]) ? vendorLists[i] : [];
      });
      setEventVendorMap(vmap);
      setCategories(Array.isArray(categoryRows) ? categoryRows : []);
      setVenues(Array.isArray(venueRows) ? venueRows.filter((v) => v.is_active !== false) : []);
      setVendors(Array.isArray(vendorRows) ? vendorRows : []);
      setServices(Array.isArray(serviceRows) ? serviceRows : []);
    } catch (err) {
      setEvents([]);
      setLoadError(err.message || 'Could not load your events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // Fetch venue operating hours whenever selected venue changes
  useEffect(() => {
    if (!formData.venue_id) {
      setVenueHours([]);
      return;
    }
    let isCancelled = false;
    setLoadingHours(true);
    venuesApi.getHours(formData.venue_id)
      .then((data) => {
        if (!isCancelled) {
          setVenueHours(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        console.error('Failed to load venue hours:', err);
        if (!isCancelled) setVenueHours([]);
      })
      .finally(() => {
        if (!isCancelled) setLoadingHours(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [formData.venue_id]);

  // Calculate operating hours feedback for the selected venue and event date
  const hoursInfo = useMemo(() => {
    if (!formData.venue_id) {
      return {
        status: 'no_venue',
        title: 'No venue selected',
        message: 'Select a venue to check its operating schedule.',
      };
    }

    const selectedVenue = venues.find((v) => Number(v.venue_id) === Number(formData.venue_id));
    if (selectedVenue && selectedVenue.is_active === false) {
      return {
        status: 'inactive',
        title: 'Venue is inactive',
        message: `Venue "${selectedVenue.name}" is currently inactive and unavailable for event creation.`,
      };
    }

    if (loadingHours) {
      return {
        status: 'loading',
        title: 'Checking operating hours...',
        message: 'Fetching operating hours for selected venue...',
      };
    }

    const dayOfWeek = getDayOfWeekFromDateString(formData.start_time);
    if (dayOfWeek === null) {
      return {
        status: 'prompt_date',
        title: 'Operating hours schedule',
        message: 'Select an event start date to view venue operating hours for that day.',
      };
    }

    const dayName = DAYS_OF_WEEK[dayOfWeek];
    const schedule = venueHours.find((h) => Number(h.day_of_week) === dayOfWeek);

    if (!schedule) {
      return {
        status: 'unconfigured',
        title: 'Operating hours have not been configured for this day.',
        message: `No operating hours configured for ${selectedVenue?.name || 'this venue'} on ${dayName}.`,
        dayName,
      };
    }

    if (schedule.is_closed) {
      return {
        status: 'closed',
        title: 'Venue is closed on this day.',
        message: `${selectedVenue?.name || 'This venue'} is marked as closed on ${dayName}.`,
        dayName,
      };
    }

    if (!schedule.open_time || !schedule.close_time) {
      return {
        status: 'unconfigured',
        title: 'Operating hours have not been configured for this day.',
        message: `The venue's operating hours for ${dayName} are incomplete.`,
        dayName,
      };
    }

    const openFormatted = formatTime(schedule.open_time);
    const closeFormatted = formatTime(schedule.close_time);
    const allowedText = `${openFormatted} – ${closeFormatted}`;

    const startTimeClock = getTimeFromDateString(formData.start_time);
    const endTimeClock = getTimeFromDateString(formData.end_time);
    let timingWarning = null;

    if (startTimeClock && startTimeClock < schedule.open_time) {
      timingWarning = `Selected start time (${formatTime(startTimeClock)}) is earlier than venue opening time (${openFormatted}).`;
    } else if (
      endTimeClock &&
      formData.start_time?.slice(0, 10) === formData.end_time?.slice(0, 10) &&
      endTimeClock > schedule.close_time
    ) {
      timingWarning = `Selected end time (${formatTime(endTimeClock)}) is later than venue closing time (${closeFormatted}).`;
    }

    return {
      status: 'open',
      title: `Venue operating hours for ${dayName}: ${allowedText}`,
      message: timingWarning || `The venue is open on ${dayName} between ${allowedText}.`,
      hasWarning: Boolean(timingWarning),
      openTime: schedule.open_time,
      closeTime: schedule.close_time,
      dayName,
      allowedText,
    };
  }, [formData.venue_id, formData.start_time, formData.end_time, venues, venueHours, loadingHours]);

  const displayedEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((e) => {
      if (statusFilter !== 'All' && e.status !== statusFilter) return false;
      if (q) {
        const haystack = [e.title, e.venue, e.city, e.category].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [events, statusFilter, searchQuery]);

  // Only services that have at least one vendor get a dropdown
  const vendorGroups = useMemo(() => {
    return services
      .map((s) => ({
        ...s,
        vendors: vendors.filter((v) => Number(v.service_id) === Number(s.service_id)),
      }))
      .filter((g) => g.vendors.length > 0);
  }, [services, vendors]);

  const setVendorChoice = (serviceId, changes) => {
    setVendorChoices((prev) => {
      const next = { ...prev, [serviceId]: { vendor_id: '', agreed_cost: '0', ...prev[serviceId], ...changes } };
      if (!next[serviceId].vendor_id) delete next[serviceId];
      return next;
    });
  };

  const handleOpenCreate = () => {
    setEditingEvent(null);
    const nextWeek = new Date(Date.now() + 7 * 86400000);
    nextWeek.setHours(10, 0, 0, 0);
    const endNextWeek = new Date(nextWeek.getTime() + 6 * 3600000);
    setFormData({
      ...EMPTY_FORM,
      category_id: categories[0] ? String(categories[0].category_id) : '',
      venue_id: venues[0] ? String(venues[0].venue_id) : '',
      start_time: toInputDateTime(nextWeek),
      end_time: toInputDateTime(endNextWeek),
    });
    setVendorChoices({});
    setOriginalVendorChoices({});
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title || '',
      category_id: event.category_id ? String(event.category_id) : '',
      venue_id: event.venue_id ? String(event.venue_id) : '',
      start_time: toInputDateTime(event.start_time),
      end_time: toInputDateTime(event.end_time),
      ticket_price: String(event.ticket_price ?? 0),
      capacity: String(event.capacity ?? ''),
      status: event.status || 'published',
      description: event.description || '',
    });
    setVendorChoices({});
    setOriginalVendorChoices({});
    setFormErrors({});
    setModalOpen(true);

    // Pre-fill the vendors already linked to this event
    setLoadingEventVendors(true);
    eventsApi
      .getVendors(event.event_id)
      .then((rows) => {
        const choices = {};
        (rows || []).forEach((r) => {
          choices[r.service_id] = { vendor_id: String(r.vendor_id), agreed_cost: String(r.agreed_cost ?? 0) };
        });
        setVendorChoices(choices);
        setOriginalVendorChoices(choices);
      })
      .catch((err) => toast.error(`Could not load this event's vendors: ${err.message}`))
      .finally(() => setLoadingEventVendors(false));
  };

  // Handle creating a new category directly
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    setCategorySubmitting(true);
    try {
      const data = await categoriesApi.create({
        name,
        description: newCategoryDesc.trim() || null,
      });

      setCategories((prev) => {
        if (prev.some((c) => c.category_id === data.category_id)) return prev;
        return [...prev, data];
      });
      setFormData((prev) => ({ ...prev, category_id: String(data.category_id) }));
      setNewCategoryName('');
      setNewCategoryDesc('');
      setShowCategoryModal(false);
      toast.success(`Category "${data.name}" added successfully!`);
    } catch (err) {
      toast.error(err.message || 'Failed to create category.');
    } finally {
      setCategorySubmitting(false);
    }
  };

  const validateForm = () => {
    const errs = {};
    const title = formData.title.trim();
    if (!title) {
      errs.title = 'Event title is required';
    } else if (title.length > 150) {
      errs.title = 'Event title cannot exceed 150 characters';
    }

    if (!formData.venue_id) {
      errs.venue_id = 'Please select a venue';
    }

    if (!formData.start_time) {
      errs.start_time = 'Start time is required';
    }
    if (!formData.end_time) {
      errs.end_time = 'End time is required';
    }
    if (formData.start_time && formData.end_time && new Date(formData.end_time) <= new Date(formData.start_time)) {
      errs.end_time = 'End time must be later than start time';
    }

    // Operating hours check in frontend
    if (formData.venue_id && formData.start_time) {
      if (hoursInfo.status === 'inactive') {
        errs.venue_id = hoursInfo.message;
      } else if (hoursInfo.status === 'closed') {
        errs.start_time = `Venue is closed on this day (${hoursInfo.dayName || ''}).`;
      } else if (hoursInfo.status === 'unconfigured') {
        errs.start_time = `Operating hours have not been configured for this day (${hoursInfo.dayName || ''}).`;
      } else if (hoursInfo.status === 'open' && hoursInfo.hasWarning) {
        errs.start_time = hoursInfo.message;
      }
    }

    const capacity = Number(formData.capacity);
    if (!Number.isInteger(capacity) || capacity <= 0) errs.capacity = 'Capacity must be a whole number above 0';
    if (formData.ticket_price === '' || Number(formData.ticket_price) < 0) errs.ticket_price = 'Price cannot be negative';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      category_id: formData.category_id ? Number(formData.category_id) : null,
      venue_id: formData.venue_id ? Number(formData.venue_id) : null,
      // datetime-local is the viewer's local time; send it as a full ISO timestamp
      start_time: new Date(formData.start_time).toISOString(),
      end_time: new Date(formData.end_time).toISOString(),
      ticket_price: Number(formData.ticket_price),
      capacity: parseInt(formData.capacity, 10),
      status: formData.status,
    };

    setSaving(true);
    let eventId;
    try {
      if (editingEvent) {
        await eventsApi.update(editingEvent.event_id, payload);
        eventId = editingEvent.event_id;
      } else {
        const created = await eventsApi.create(payload);
        eventId = created.event_id;
      }
    } catch (err) {
      toast.error(`Could not save event: ${err.message}`);
    } finally {
      setSaving(false);
      return;
    }

    // Sync vendors: remove changed/cleared ones first, then add the new choices
    // (the backend allows only one vendor per service per event).
    const vendorErrors = [];
    const serviceIds = new Set([...Object.keys(originalVendorChoices), ...Object.keys(vendorChoices)]);
    for (const serviceId of serviceIds) {
      const before = originalVendorChoices[serviceId];
      const after = vendorChoices[serviceId];
      const unchanged =
        before && after && before.vendor_id === after.vendor_id && Number(before.agreed_cost) === Number(after.agreed_cost);
      if (unchanged) continue;
      try {
        if (before) await eventsApi.removeVendor(eventId, Number(before.vendor_id));
        if (after) {
          await eventsApi.addVendor(eventId, {
            vendor_id: Number(after.vendor_id),
            agreed_cost: Number(after.agreed_cost || 0),
          });
        }
      } catch (err) {
        const name = vendors.find((v) => String(v.vendor_id) === String((after || before).vendor_id))?.vendor_name;
        vendorErrors.push(`${name || 'Vendor'}: ${err.message}`);
      }
    }

    if (vendorErrors.length) {
      toast.error(`Event saved, but some vendors failed — ${vendorErrors.join('; ')}`);
    } else {
      toast.success(`Event "${payload.title}" ${editingEvent ? 'updated' : 'created'}.`);
    }
    setModalOpen(false);
    setSaving(false);
    await loadEvents();
  };

  // Cancelling sets status = 'cancelled' (the row is kept, not deleted)
  const confirmCancelEvent = async () => {
    if (!eventToCancel) return;
    setCancelling(true);
    try {
      await eventsApi.update(eventToCancel.event_id, { status: 'cancelled' });
      setEvents((prev) =>
        prev.map((ev) => (ev.event_id === eventToCancel.event_id ? { ...ev, status: 'cancelled' } : ev))
      );
      toast.success(`Event "${eventToCancel.title}" cancelled.`);
      setCancelModalOpen(false);
      setEventToCancel(null);
    } catch (err) {
      toast.error(`Could not cancel event: ${err.message}`);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 w-full animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pb-6 border-b border-sand-dark">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sand-dark/60 text-wine text-xs font-heading uppercase tracking-wider mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Event Management</span>
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-black text-ink uppercase tracking-tight">
            Manage Events
          </h1>
          <p className="text-sm text-ink/70 mt-1 max-w-2xl font-serif">
            Schedule, monitor, and coordinate events hosted across your venues.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadEvents}
            disabled={loading}
            className="p-2.5 rounded-xl border border-sand-dark bg-sand hover:bg-sand-dark/60 text-ink transition-colors disabled:opacity-50"
            title="Refresh events list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-wine' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-wine text-sand font-heading text-xs uppercase tracking-wider font-bold hover:bg-wine-dark transition-all shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        </div>
      </div>

      {/* Load error banner */}
      {loadError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium mb-6 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <div className="flex-1">
            <strong>Failed to load events: </strong>
            {loadError}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-sand rounded-2xl border border-sand-dark p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {STATUS_TABS.map((st) => (
            <button
              key={st.value}
              type="button"
              onClick={() => setStatusFilter(st.value)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-heading uppercase tracking-wider font-bold transition-colors whitespace-nowrap ${
                statusFilter === st.value
                  ? 'bg-wine text-sand shadow-sm'
                  : 'bg-sand-dark/40 text-ink/70 hover:bg-sand-dark/70 hover:text-ink'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-wine absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, venue, city..."
            className="w-full pl-10 pr-4 py-2 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-wine"
          />
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-sand rounded-2xl border border-sand-dark shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-sand-dark/60 text-wine border-b border-sand-dark font-heading uppercase tracking-wider text-[11px]">
                <th className="p-4">Event Details</th>
                <th className="p-4">Venue & City</th>
                <th className="p-4">Vendors</th>
                <th className="p-4">Date & Time</th>
                <th className="p-4">Ticket Price</th>
                <th className="p-4">Sold / Capacity</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-dark/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-ink/60">
                    Loading your events…
                  </td>
                </tr>
              ) : displayedEvents.length > 0 ? (
                displayedEvents.map((ev) => {
                  const pct = ev.capacity
                    ? Math.min(100, Math.round((Number(ev.tickets_sold || 0) / ev.capacity) * 100))
                    : 0;

                  return (
                    <tr key={ev.event_id} className="hover:bg-sand-dark/25 transition-colors">
                      {/* Event Details */}
                      <td className="p-4">
                        <span className="font-heading text-ink text-sm block max-w-xs truncate" title={ev.title}>
                          {ev.title}
                        </span>
                        <span className="text-[10px] text-wine font-semibold uppercase tracking-wider">
                          {ev.category}
                        </span>
                      </td>

                      {/* Venue & City */}
                      <td className="p-4 text-ink/80 whitespace-nowrap">
                        <div className="font-semibold text-ink">{ev.venue}</div>
                        <div className="text-[10px] text-wine font-medium">{ev.city}</div>
                      </td>

                      {/* Vendors */}
                      <td className="p-4 align-top">
                        {(eventVendorMap[ev.event_id] || []).length === 0 ? (
                          <span className="text-[11px] text-ink/40">No vendors</span>
                        ) : (
                          <div className="flex flex-col gap-1 max-w-[220px]">
                            {eventVendorMap[ev.event_id].map((v) => (
                              <div
                                key={`${v.service_id}-${v.vendor_id}`}
                                className="text-[11px] leading-tight bg-sand-dark/40 border border-wine/10 rounded-md px-2 py-1"
                                title={`${v.service_name}: ${v.vendor_name} (₹${Number(v.agreed_cost || 0).toLocaleString('en-IN')})`}
                              >
                                <span className="font-semibold text-ink">{v.vendor_name}</span>
                                <span className="text-wine"> · {v.service_name}</span>
                                {Number(v.agreed_cost) > 0 && (
                                  <span className="text-ink/60"> · ₹{Number(v.agreed_cost).toLocaleString('en-IN')}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Start Time & End Time */}
                      <td className="p-4 text-ink/80 whitespace-nowrap">
                        <div className="font-semibold text-ink">{formatDateTime(ev.start_time)}</div>
                        {ev.end_time && (
                          <div className="text-[10px] text-ink/60">to {formatDateTime(ev.end_time)}</div>
                        )}
                      </td>

                      {/* Ticket Price */}
                      <td className="p-4 font-heading text-wine text-xs whitespace-nowrap">
                        {ev.ticket_price > 0 ? `₹${Number(ev.ticket_price).toLocaleString('en-IN')}` : 'FREE'}
                      </td>

                      {/* Tickets Sold / Capacity */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink">
                            {Number(ev.tickets_sold || 0)}
                          </span>
                          <span className="text-ink/60">/ {ev.capacity}</span>
                          <span className="text-[10px] bg-sand-dark px-1.5 py-0.5 rounded font-bold text-ink">
                            {pct}%
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-[10px] font-heading uppercase tracking-wider font-bold ${
                            STATUS_STYLES[ev.status] || 'bg-sand-dark text-ink border border-sand-dark'
                          }`}
                        >
                          {ev.status}
                        </span>
                      </td>

                      {/* Actions: Edit, Cancel */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(ev)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-sand-dark bg-sand text-ink hover:bg-wine hover:text-sand hover:border-wine text-xs font-semibold transition-all shadow-sm"
                            title="Edit Event"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          {ev.status !== 'cancelled' && ev.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => {
                                setEventToCancel(ev);
                                setCancelModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-300/80 bg-red-50 text-red-700 hover:bg-red-700 hover:text-white text-xs font-semibold transition-all shadow-sm"
                              title="Cancel Event"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-ink/60">
                    {events.length === 0
                      ? <>You haven't created any events yet. Click <strong>"Create Event"</strong> to add one.</>
                      : 'No events match this filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-sand border border-sand-dark rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-lg text-ink/60 hover:text-ink hover:bg-sand-dark/40 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <h3 className="font-heading text-xl font-bold uppercase tracking-wide text-ink">
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </h3>
              <p className="text-xs text-ink/70 font-serif mt-0.5">
                Fill in the details below. Venue operating hours will be checked automatically.
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                  Title <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Future of Generative AI Summit"
                  className="w-full px-3.5 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-wine"
                />
                {formErrors.title && <p className="text-xs text-red-700">{formErrors.title}</p>}
              </div>

              {/* Category & Venue Foreign Keys */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                      Category
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      className="text-[10px] text-wine font-bold hover:underline inline-flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> New
                    </button>
                  </div>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                  >
                    <option value="">No category</option>
                    {categories.map((c) => (
                      <option key={c.category_id} value={String(c.category_id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                    Venue <span className="text-red-700">*</span>
                  </label>
                  <select
                    value={formData.venue_id}
                    onChange={(e) => setFormData({ ...formData, venue_id: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                  >
                    <option value="">Select a venue</option>
                    {venues.map((v) => (
                      <option key={v.venue_id} value={String(v.venue_id)}>
                        {v.name} ({v.city})
                      </option>
                    ))}
                  </select>
                  {formErrors.venue_id && <p className="text-xs text-red-700">{formErrors.venue_id}</p>}
                </div>
              </div>

              {/* Start Time & End Time (TIMESTAMPTZ) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                    Start Time <span className="text-red-700">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                  />
                  {formErrors.start_time && <p className="text-xs text-red-700">{formErrors.start_time}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                    End Time <span className="text-red-700">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                  />
                  {formErrors.end_time && <p className="text-xs text-red-700">{formErrors.end_time}</p>}
                </div>
              </div>

              {/* Live Venue Operating Hours Schedule Indicator */}
              {formData.venue_id && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                    hoursInfo.status === 'closed' || hoursInfo.status === 'inactive'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : hoursInfo.hasWarning
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : hoursInfo.status === 'open'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-sand-dark/40 border-sand-dark text-ink/80'
                  }`}
                >
                  {hoursInfo.status === 'closed' || hoursInfo.status === 'inactive' ? (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  ) : hoursInfo.hasWarning ? (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : hoursInfo.status === 'open' ? (
                    <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="w-4 h-4 text-ink/50 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-heading font-bold uppercase tracking-wider text-[11px]">
                      {hoursInfo.title}
                    </p>
                    <p className="text-xs mt-0.5 leading-relaxed">{hoursInfo.message}</p>
                  </div>
                </div>
              )}

              {/* Ticket Price & Total Capacity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                    Ticket Price (₹) <span className="text-red-700">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.ticket_price}
                    onChange={(e) => setFormData({ ...formData, ticket_price: e.target.value })}
                    placeholder="0 for free"
                    className="w-full px-3.5 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                  />
                  {formErrors.ticket_price && (
                    <p className="text-xs text-red-700">{formErrors.ticket_price}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                    Total Capacity <span className="text-red-700">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                  />
                  {formErrors.capacity && (
                    <p className="text-xs text-red-700">{formErrors.capacity}</p>
                  )}
                </div>
              </div>

              {/* Vendors: one dropdown per service (one vendor per service per event) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-heading uppercase tracking-wider text-ink">Vendors</label>
                  {loadingEventVendors && <span className="text-[10px] text-ink/60">Loading selected vendors…</span>}
                </div>
                {vendorGroups.length === 0 ? (
                  <p className="text-xs text-ink/60">No vendors available yet. An admin can add them in Manage Vendors.</p>
                ) : (
                  <div className="space-y-2 rounded-xl border border-sand-dark p-3 bg-sand-dark/15">
                    {vendorGroups.map((g) => {
                      const choice = vendorChoices[g.service_id];
                      return (
                        <div key={g.service_id} className="grid grid-cols-1 sm:grid-cols-[1fr_8rem] gap-2 items-end">
                          <div className="space-y-1 min-w-0">
                            <label htmlFor={`vendor-${g.service_id}`} className="block text-[10px] font-semibold uppercase tracking-wider text-wine">
                              {g.service_name}
                            </label>
                            <select
                              id={`vendor-${g.service_id}`}
                              value={choice?.vendor_id || ''}
                              onChange={(e) => setVendorChoice(g.service_id, { vendor_id: e.target.value })}
                              className="w-full px-3 py-2 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                            >
                              <option value="">No {g.service_name.toLowerCase()} vendor</option>
                              {g.vendors.map((v) => (
                                <option key={v.vendor_id} value={String(v.vendor_id)}>
                                  {v.vendor_name}
                                </option>
                              ))}
                            </select>
                          </div>
                          {choice && (
                            <div className="space-y-1">
                              <label htmlFor={`vendor-cost-${g.service_id}`} className="block text-[10px] font-semibold uppercase tracking-wider text-ink/70">
                                Agreed cost (₹)
                              </label>
                              <input
                                id={`vendor-cost-${g.service_id}`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={choice.agreed_cost}
                                onChange={(e) => setVendorChoice(g.service_id, { agreed_cost: e.target.value })}
                                className="w-full px-3 py-2 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {formErrors.vendors && <p className="text-xs text-red-700">{formErrors.vendors}</p>}
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label htmlFor="event-status" className="block text-xs font-heading uppercase tracking-wider text-ink">
                  Status
                </label>
                <select
                  id="event-status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                >
                  {STATUS_TABS.filter((t) => t.value !== 'All').map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Outline topics, agenda, or keynote speakers..."
                  className="w-full px-3.5 py-2 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-wine"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-sand-dark">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-sand-dark text-xs font-heading uppercase tracking-wider font-bold text-ink hover:bg-sand-dark/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-wine text-sand font-heading text-xs uppercase tracking-wider font-bold hover:bg-wine-dark transition-all shadow-sm disabled:opacity-60"
                >
                  {saving ? 'Saving…' : editingEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-sand border border-sand-dark rounded-2xl max-w-sm w-full p-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowCategoryModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-ink/60 hover:text-ink hover:bg-sand-dark/40 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-heading text-base font-bold uppercase tracking-wide text-ink mb-1 flex items-center gap-2">
              <Tag className="w-4 h-4 text-wine" />
              <span>Add Category</span>
            </h3>
            <p className="text-xs text-ink/70 font-serif mb-4">
              Create a new category for tagging your events.
            </p>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-heading uppercase tracking-wider text-ink font-semibold">
                  Category Name <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Workshop, Hackathon"
                  className="w-full px-3 py-2 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-heading uppercase tracking-wider text-ink font-semibold">
                  Description
                </label>
                <textarea
                  rows={2}
                  maxLength={255}
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  placeholder="Optional brief description..."
                  className="w-full px-3 py-2 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-wine"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-sand-dark">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-sand-dark text-xs font-heading uppercase font-bold text-ink hover:bg-sand-dark/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={categorySubmitting || !newCategoryName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-wine text-sand text-xs font-heading uppercase font-bold hover:bg-wine-dark transition-all disabled:opacity-50"
                >
                  {categorySubmitting ? 'Adding...' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={cancelModalOpen}
        title="Cancel This Event?"
        message={`Cancel "${eventToCancel?.title}"? Its status becomes "cancelled"; the event stays in the database.`}
        confirmText="Confirm Cancellation"
        cancelText="Keep Active"
        isDanger={true}
        isLoading={cancelling}
        onConfirm={confirmCancelEvent}
        onClose={() => {
          setCancelModalOpen(false);
          setEventToCancel(null);
        }}
      />
    </div>
  );
}
