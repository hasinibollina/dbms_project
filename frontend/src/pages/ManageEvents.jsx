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

export default function ManageEvents() {
  const { user } = useAuth();
  const toast = useToast();

  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal states for Create / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // null = Create, object = Edit
  const [formData, setFormData] = useState({
    title: '',
    category_id: 1,
    venue_id: 1,
    start_time: '',
    end_time: '',
    ticket_price: '499',
    capacity: '500',
    description: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Cancel Event Confirmation Modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [eventToCancel, setEventToCancel] = useState(null);

  // Load events from localStorage or seed
  // Only the logged-in user's own events (GET /api/events/mine).
  // Admins see every event in the Admin Panel instead.
  const loadEvents = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [mine, categoryRows, venueRows] = await Promise.all([
        eventsApi.getMine(),
        categoriesApi.getAll().catch(() => []),
        venuesApi.getAll().catch(() => []),
      ]);
      setEvents(Array.isArray(mine) ? mine : []);
      setCategories(Array.isArray(categoryRows) ? categoryRows : []);
      setVenues(Array.isArray(venueRows) ? venueRows.filter((v) => v.is_active !== false) : []);
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

  const isAdmin = user?.role?.toLowerCase() === 'admin';

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

  // Helper to format ISO to datetime-local value (YYYY-MM-DDTHH:mm)
  const toInputDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingEvent(null);
    const nextWeek = new Date(Date.now() + 7 * 86400000);
    nextWeek.setHours(10, 0, 0, 0);
    const endNextWeek = new Date(nextWeek.getTime() + 6 * 3600000);

    setFormData({
      title: '',
      category_id: 1,
      venue_id: 1,
      start_time: toInputDateTime(nextWeek),
      end_time: toInputDateTime(endNextWeek),
      ticket_price: '499',
      capacity: '500',
      description: '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title || '',
      category_id: event.category_id || 1,
      venue_id: event.venue_id || 1,
      start_time: toInputDateTime(event.start_time || event.date),
      end_time: toInputDateTime(event.end_time || (event.start_time ? new Date(new Date(event.start_time).getTime() + 4 * 3600000) : '')),
      ticket_price: String(event.ticket_price !== undefined ? event.ticket_price : (event.price || 0)),
      capacity: String(event.capacity || 100),
      description: event.description || '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.title.trim()) {
      errs.title = 'Event title is required';
    } else if (formData.title.trim().length > 150) {
      errs.title = 'Event title cannot exceed 150 characters';
    }

    if (!formData.start_time) {
      errs.start_time = 'Start time is required';
    }
    if (!formData.end_time) {
      errs.end_time = 'End time is required';
    }
    if (formData.start_time && formData.end_time) {
      if (new Date(formData.end_time) <= new Date(formData.start_time)) {
        errs.end_time = 'End time must be later than start time';
      }
    }

    if (!formData.capacity || Number(formData.capacity) <= 0 || !Number.isInteger(Number(formData.capacity))) {
      errs.capacity = 'Capacity must be an integer greater than 0';
    }
    if (formData.ticket_price === '' || Number(formData.ticket_price) < 0) {
      errs.ticket_price = 'Price cannot be negative';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const matchedCategory = SEED_CATEGORIES.find((c) => c.category_id === Number(formData.category_id));
    const matchedVenue = SEED_VENUES.find((v) => v.venue_id === Number(formData.venue_id));

    const startTimeFormatted = formData.start_time.replace('T', ' ') + ':00';
    const endTimeFormatted = formData.end_time.replace('T', ' ') + ':00';

    if (editingEvent) {
      // Update existing
      const updatedList = events.map((ev) => {
        if (ev.event_id === editingEvent.event_id) {
          return {
            ...ev,
            title: formData.title.trim(),
            category_id: Number(formData.category_id),
            category: matchedCategory ? matchedCategory.name : ev.category,
            venue_id: Number(formData.venue_id),
            venue: matchedVenue ? matchedVenue.name : ev.venue,
            city: matchedVenue ? matchedVenue.city : ev.city,
            start_time: startTimeFormatted,
            end_time: endTimeFormatted,
            date: startTimeFormatted,
            ticket_price: Number(formData.ticket_price),
            price: Number(formData.ticket_price),
            capacity: parseInt(formData.capacity, 10),
            description: formData.description.trim(),
          };
        }
        return ev;
      });
      setEvents(updatedList);
      saveStoredEvents(updatedList);
      toast.success(`Event "${formData.title}" updated successfully!`);
    } else {
      // Create new
      const newId = Math.max(...events.map((e) => e.event_id), 100) + 1;
      const newEvent = {
        event_id: newId,
        title: formData.title.trim(),
        category_id: Number(formData.category_id),
        category: matchedCategory ? matchedCategory.name : 'Technology & AI',
        venue_id: Number(formData.venue_id),
        venue: matchedVenue ? matchedVenue.name : 'Apex Convention Center',
        city: matchedVenue ? matchedVenue.city : 'Bengaluru',
        start_time: startTimeFormatted,
        end_time: endTimeFormatted,
        date: startTimeFormatted,
        tickets_sold: 0,
        capacity: parseInt(formData.capacity, 10),
        ticket_price: Number(formData.ticket_price),
        price: Number(formData.ticket_price),
        revenue: 0,
        status: 'Scheduled',
        organizer: user?.full_name || user?.name || 'Arjun Mehta',
        organizer_id: user?.user_id || 2,
        organizer_email: user?.email || 'organizer@eventhub.com',
        description: formData.description.trim(),
      };
      const updatedList = [newEvent, ...events];
      setEvents(updatedList);
      saveStoredEvents(updatedList);
      toast.success(`Event "${newEvent.title}" created successfully!`);
    }

    setModalOpen(false);
  };

  // Cancel Event Confirmation
  const confirmCancelEvent = () => {
    if (!eventToCancel) return;
    const updated = events.map((ev) =>
      ev.event_id === eventToCancel.event_id ? { ...ev, status: 'Cancelled' } : ev
    );
    setEvents(updated);
    saveStoredEvents(updated);
    toast.info(`Event "${eventToCancel.title}" has been cancelled.`);
    setCancelModalOpen(false);
    setEventToCancel(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 w-full animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pb-6 border-b border-sand-dark">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sand-dark/60 text-wine text-xs font-heading uppercase tracking-wider mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>{isAdmin ? 'Admin Master Event Control' : 'Organizer Workspace'}</span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl uppercase tracking-tighter text-ink">
            MANAGE EVENTS
          </h1>
          <p className="text-ink/70 text-sm sm:text-base mt-1 max-w-2xl">
            {isAdmin
              ? 'Oversee all platform events across all organizers, review ticket distributions, and adjust lifecycle statuses.'
              : `Manage your scheduled events, ticket capacities, and staging venues as ${user?.full_name || 'Organizer'}.`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Create Event CTA moved here */}
          <button
            type="button"
            id="create-event-button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-wine text-sand font-heading text-xs uppercase tracking-wider font-bold hover:bg-wine-dark transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-wine-light"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Event</span>
          </button>

          <button
            type="button"
            onClick={loadEvents}
            className="p-3 rounded-xl border border-sand-dark bg-sand text-ink hover:bg-sand-dark/40 transition-colors"
            title="Refresh events"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-sand rounded-2xl border border-sand-dark p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['All', 'Scheduled', 'Completed', 'Cancelled'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-heading uppercase tracking-wider font-bold transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-wine text-sand shadow-sm'
                  : 'bg-sand-dark/40 text-ink/70 hover:bg-sand-dark/70 hover:text-ink'
              }`}
            >
              {st}
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
                {isAdmin && <th className="p-4">Organizer</th>}
                <th className="p-4">Venue & City</th>
                <th className="p-4">Date & Time</th>
                <th className="p-4">Ticket Price</th>
                <th className="p-4">Sold / Capacity</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-dark/60 font-medium">
              {displayedEvents.length > 0 ? (
                displayedEvents.map((ev) => {
                  const pct = ev.capacity
                    ? Math.min(100, Math.round((ev.tickets_sold / ev.capacity) * 100))
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

                      {/* Organizer Column (Only visible to Admin) */}
                      {isAdmin && (
                        <td className="p-4 text-ink font-semibold whitespace-nowrap">
                          <span className="block">{ev.organizer}</span>
                          <span className="text-[10px] text-ink/50 font-normal">{ev.organizer_email}</span>
                        </td>
                      )}

                      {/* Venue & City */}
                      <td className="p-4 text-ink/80 whitespace-nowrap">
                        <div className="font-semibold text-ink">{ev.venue}</div>
                        <div className="text-[10px] text-wine font-medium">{ev.city}</div>
                      </td>

                      {/* Start Time & End Time */}
                      <td className="p-4 text-ink/80 whitespace-nowrap">
                        <div className="font-semibold text-ink">{ev.start_time || ev.date}</div>
                        {ev.end_time && (
                          <div className="text-[10px] text-ink/60 font-mono">to {ev.end_time}</div>
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
                            {ev.tickets_sold}
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
                            ev.status === 'Scheduled'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : ev.status === 'Completed'
                              ? 'bg-sand-dark text-ink border border-sand-dark'
                              : 'bg-red-100 text-red-800 border border-red-300'
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

                          {ev.status !== 'Cancelled' && (
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
                  <td colSpan={isAdmin ? 8 : 7} className="p-10 text-center text-ink/60">
                    No events found. Click <strong>"Create Event"</strong> to schedule one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          CREATE / EDIT EVENT MODAL
          ========================================================================= */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-sand text-ink rounded-2xl max-w-lg w-full border border-sand-dark shadow-poster p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-ink/50 hover:text-ink p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-wine"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-wine/10 text-wine flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-xl uppercase tracking-tight text-ink">
                  {editingEvent ? 'Edit Event Details' : 'Create New Event'}
                </h3>
                <p className="text-xs text-ink/70">
                  {editingEvent ? `Updating #${editingEvent.event_id}` : 'Fill in the event parameters'}
                </p>
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
              {/* Event Title */}
              <div className="space-y-1">
                <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                  Event Title <span className="text-red-700">*</span>
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
                  <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                    Category (Foreign Key)
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                  >
                    {SEED_CATEGORIES.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                    Venue (Foreign Key)
                  </label>
                  <select
                    value={formData.venue_id}
                    onChange={(e) => setFormData({ ...formData, venue_id: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                  >
                    {SEED_VENUES.map((v) => (
                      <option key={v.venue_id} value={v.venue_id}>
                        {v.name} ({v.city})
                      </option>
                    ))}
                  </select>
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
                  className="px-5 py-2.5 rounded-xl bg-wine text-sand font-heading text-xs uppercase tracking-wider font-bold hover:bg-wine-dark transition-all shadow-sm"
                >
                  {editingEvent ? 'Save Changes' : 'Create Event'}
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
        message={`Are you sure you want to cancel "${eventToCancel?.title}"? Ticket sales will immediately be halted.`}
        confirmText="Confirm Cancellation"
        cancelText="Keep Active"
        isDanger={true}
        onConfirm={confirmCancelEvent}
        onClose={() => {
          setCancelModalOpen(false);
          setEventToCancel(null);
        }}
      />
    </div>
  );
}