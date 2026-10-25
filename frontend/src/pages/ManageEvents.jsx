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
  Store,
  Briefcase,
  Phone,
  Mail,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import { DAYS_OF_WEEK, formatTime } from '../utils/hoursUtils';

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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ManageEvents() {
  const { user } = useAuth();
  const toast = useToast();

  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allVendors, setAllVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal states for Create / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // null = Create, object = Edit
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    venue_id: '',
    start_time: '',
    end_time: '',
    ticket_price: '499',
    capacity: '500',
    description: '',
    vendor_ids: [],
  });
  const [formErrors, setFormErrors] = useState({});

  // Quick Add Category Modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  // Venue Operating Hours state
  const [venueHours, setVenueHours] = useState([]);
  const [loadingHours, setLoadingHours] = useState(false);

  // Cancel Event Confirmation Modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [eventToCancel, setEventToCancel] = useState(null);

  // Dedicated Event Vendors Modal state (event_vendors table)
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [activeVendorEvent, setActiveVendorEvent] = useState(null);
  const [eventVendorsList, setEventVendorsList] = useState([]);
  const [loadingEventVendors, setLoadingEventVendors] = useState(false);
  const [selectedNewVendorId, setSelectedNewVendorId] = useState('');
  const [newVendorAgreedCost, setNewVendorAgreedCost] = useState('0');
  const [newVendorStatus, setNewVendorStatus] = useState('requested');
  const [vendorActionLoading, setVendorActionLoading] = useState(false);
  const [vendorCosts, setVendorCosts] = useState({});

  // Load events, venues, categories, and vendors from the backend
  const loadEvents = async () => {
    setLoading(true);

    try {
      const [eventsRes, venuesRes, categoriesRes, vendorsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/events`),
        fetch(`${API_BASE_URL}/api/venues`),
        fetch(`${API_BASE_URL}/api/categories`),
        fetch(`${API_BASE_URL}/api/vendors`),
      ]);

      if (!eventsRes.ok || !venuesRes.ok || !categoriesRes.ok) {
        throw new Error('Could not load events, venues, or categories.');
      }

      const [eventsData, venuesData, categoriesData, vendorsData] = await Promise.all([
        eventsRes.json(),
        venuesRes.json(),
        categoriesRes.json(),
        vendorsRes.ok ? vendorsRes.json() : [],
      ]);

      setEvents(eventsData);
      setVenues(venuesData);
      setCategories(categoriesData);
      setAllVendors(Array.isArray(vendorsData) ? vendorsData : []);
    } catch (error) {
      toast.error(error.message || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  // Filter events based on role:
  // Admin sees ALL events. Organizer sees only their OWN events.
  const userFilteredEvents = useMemo(() => {
    if (isAdmin) return events;
    // Organizer filter
    return events.filter(
      (e) =>
        e.organizer_id === user?.user_id ||
        e.organizer_email?.toLowerCase() === user?.email?.toLowerCase() ||
        e.organizer?.toLowerCase() === (user?.name || user?.full_name)?.toLowerCase()
    );
  }, [events, isAdmin, user]);

  // Search & Status Filter
  const displayedEvents = useMemo(() => {
    return userFilteredEvents.filter((e) => {
      if (statusFilter !== 'All' && e.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = e.title?.toLowerCase().includes(q);
        const matchVenue = e.venue?.toLowerCase().includes(q);
        const matchOrg = e.organizer?.toLowerCase().includes(q);
        const matchCat = e.category?.toLowerCase().includes(q);
        if (!matchTitle && !matchVenue && !matchOrg && !matchCat) return false;
      }
      return true;
    });
  }, [userFilteredEvents, statusFilter, searchQuery]);

  // Fetch venue operating hours whenever selected venue changes
  useEffect(() => {
    if (!formData.venue_id) {
      setVenueHours([]);
      return;
    }
    let isCancelled = false;
    setLoadingHours(true);
    fetch(`${API_BASE_URL}/api/venue-hours?venue_id=${formData.venue_id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Could not load venue operating hours');
        return res.json();
      })
      .then((data) => {
        if (!isCancelled) {
          setVenueHours(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        console.error('Failed to load venue hours:', err);
        if (!isCancelled) {
          setVenueHours([]);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoadingHours(false);
        }
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

    const defaultCatId = categories.length > 0 ? categories[0].category_id : '';
    const activeVenues = venues.filter((v) => v.is_active !== false);
    const defaultVenueId = activeVenues.length > 0 ? activeVenues[0].venue_id : (venues.length > 0 ? venues[0].venue_id : '');

    setFormData({
      title: '',
      category_id: defaultCatId,
      venue_id: defaultVenueId,
      start_time: toInputDateTime(nextWeek),
      end_time: toInputDateTime(endNextWeek),
      ticket_price: '499',
      capacity: '500',
      description: '',
      vendor_ids: [],
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (event) => {
    setEditingEvent(event);
    const initialVids = Array.isArray(event.vendors) ? event.vendors.map((v) => v.vendor_id) : [];
    setFormData({
      title: event.title || '',
      category_id: event.category_id || (categories.length > 0 ? categories[0].category_id : ''),
      venue_id: event.venue_id || (venues.length > 0 ? venues[0].venue_id : ''),
      start_time: toInputDateTime(event.start_time || event.date),
      end_time: toInputDateTime(event.end_time || (event.start_time ? new Date(new Date(event.start_time).getTime() + 4 * 3600000) : '')),
      ticket_price: String(event.ticket_price !== undefined ? event.ticket_price : (event.price || 0)),
      capacity: String(event.capacity || 100),
      description: event.description || '',
      vendor_ids: initialVids,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // Handle creating a new category directly
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    setCategorySubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: newCategoryDesc.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Could not create category.');
      }

      setCategories((prev) => {
        if (prev.some((c) => c.category_id === data.category_id)) return prev;
        return [...prev, data];
      });
      setFormData((prev) => ({ ...prev, category_id: data.category_id }));
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
    if (!formData.title.trim()) {
      errs.title = 'Event title is required';
    } else if (formData.title.trim().length > 150) {
      errs.title = 'Event title cannot exceed 150 characters';
    }

    if (!formData.category_id) {
      errs.category_id = 'Please select or add a category';
    }
    if (!formData.venue_id) {
      errs.venue_id = 'Please select a venue';
    } else {
      const selectedVenue = venues.find((v) => Number(v.venue_id) === Number(formData.venue_id));
      if (selectedVenue && selectedVenue.is_active === false) {
        errs.venue_id = `Venue "${selectedVenue.name}" is inactive and unavailable for event creation`;
      }
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

    if (!formData.capacity || Number(formData.capacity) <= 0 || !Number.isInteger(Number(formData.capacity))) {
      errs.capacity = 'Capacity must be an integer greater than 0';
    }
    if (formData.ticket_price === '' || Number(formData.ticket_price) < 0) {
      errs.ticket_price = 'Price cannot be negative';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      title: formData.title.trim(),
      category_id: Number(formData.category_id),
      venue_id: Number(formData.venue_id),
      start_time: formData.start_time,
      end_time: formData.end_time,
      ticket_price: Number(formData.ticket_price),
      capacity: Number(formData.capacity),
      description: formData.description.trim(),
      vendor_ids: Array.isArray(formData.vendor_ids) ? formData.vendor_ids : [],
      ...(user?.user_id ? { organizer_id: String(user.user_id) } : {}),
    };

    try {
      const url = editingEvent
        ? `${API_BASE_URL}/api/events/${editingEvent.event_id}`
        : `${API_BASE_URL}/api/events`;

      const response = await fetch(url, {
        method: editingEvent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        let errText = 'Could not save the event.';
        if (typeof result.detail === 'string') {
          errText = result.detail;
        } else if (Array.isArray(result.detail)) {
          errText = result.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
        } else if (result.message) {
          errText = result.message;
        }
        throw new Error(errText);
      }

      await loadEvents();
      setModalOpen(false);

      toast.success(
        editingEvent
          ? `Event "${formData.title}" updated successfully!`
          : `Event "${formData.title}" created successfully!`
      );
    } catch (error) {
      toast.error(error.message || 'Could not save the event.');
    }
  };

  // Open Event Vendors Coordination Modal
  const handleOpenVendorModal = async (event) => {
    setActiveVendorEvent(event);
    setSelectedNewVendorId('');
    setNewVendorAgreedCost('0');
    setNewVendorStatus('requested');
    setVendorModalOpen(true);
    await fetchEventVendors(event.event_id);
  };

  const fetchEventVendors = async (eventId) => {
    setLoadingEventVendors(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/events/${eventId}/vendors`);
      if (!res.ok) throw new Error('Could not fetch vendors for this event');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setEventVendorsList(list);
      const initialCosts = {};
      list.forEach((v) => {
        initialCosts[v.vendor_id] = v.agreed_cost !== undefined ? String(v.agreed_cost) : '0';
      });
      setVendorCosts(initialCosts);
    } catch (err) {
      toast.error(err.message || 'Failed to load event vendors');
      setEventVendorsList([]);
    } finally {
      setLoadingEventVendors(false);
    }
  };

  const handleAssignVendorToEvent = async (e) => {
    e.preventDefault();
    if (!activeVendorEvent || !selectedNewVendorId) return;

    setVendorActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/events/${activeVendorEvent.event_id}/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: Number(selectedNewVendorId),
          agreed_cost: Number(newVendorAgreedCost) || 0,
          booking_status: newVendorStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to assign vendor');
      }

      toast.success(data.message || 'Vendor assigned to event!');
      setSelectedNewVendorId('');
      setNewVendorAgreedCost('0');
      setNewVendorStatus('requested');
      await Promise.all([
        fetchEventVendors(activeVendorEvent.event_id),
        loadEvents(),
      ]);
    } catch (err) {
      toast.error(err.message || 'Failed to assign vendor.');
    } finally {
      setVendorActionLoading(false);
    }
  };

  const handleUpdateVendorStatus = async (vendorId, newStatus) => {
    if (!activeVendorEvent) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/events/${activeVendorEvent.event_id}/vendors/${vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update vendor status');
      toast.success(`Vendor status set to ${newStatus}`);
      await Promise.all([
        fetchEventVendors(activeVendorEvent.event_id),
        loadEvents(),
      ]);
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleUpdateVendorCost = async (vendorId, newCost) => {
    if (!activeVendorEvent) return;
    const cost = Number(newCost);
    if (isNaN(cost) || cost < 0) {
      toast.error('Agreed cost cannot be negative');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/events/${activeVendorEvent.event_id}/vendors/${vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreed_cost: cost }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update cost');
      toast.success('Agreed cost updated');
      await Promise.all([
        fetchEventVendors(activeVendorEvent.event_id),
        loadEvents(),
      ]);
    } catch (err) {
      toast.error(err.message || 'Failed to update cost');
    }
  };

  const handleRemoveVendorFromEvent = async (vendorId, vendorName) => {
    if (!activeVendorEvent) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/events/${activeVendorEvent.event_id}/vendors/${vendorId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to unassign vendor');
      toast.info(`Vendor "${vendorName}" unassigned from event.`);
      await Promise.all([
        fetchEventVendors(activeVendorEvent.event_id),
        loadEvents(),
      ]);
    } catch (err) {
      toast.error(err.message || 'Failed to remove vendor');
    }
  };


  // Cancel Event Confirmation
  
const confirmCancelEvent = async () => {
  if (!eventToCancel) return;

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/events/${eventToCancel.event_id}/cancel`,
      { method: 'PATCH' }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        typeof result.detail === 'string'
          ? result.detail
          : 'Could not cancel the event.'
      );
    }

    await loadEvents();
    toast.info(`Event "${eventToCancel.title}" has been cancelled.`);
    setCancelModalOpen(false);
    setEventToCancel(null);
  } catch (error) {
    toast.error(error.message || 'Could not cancel the event.');
  }
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
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-wine font-semibold uppercase tracking-wider">
                            {ev.category}
                          </span>
                          {(ev.vendors_count > 0 || (ev.vendors && ev.vendors.length > 0)) && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-wine/10 text-wine text-[10px] font-semibold border border-wine/20"
                              title={(ev.vendors || []).map((v) => `${v.vendor_name} (${v.service_name})`).join(', ')}
                            >
                              <Store className="w-2.5 h-2.5" />
                              <span>{ev.vendors_count || ev.vendors?.length} vendor{(ev.vendors_count || ev.vendors?.length) > 1 ? 's' : ''}</span>
                            </span>
                          )}
                        </div>
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

                      {/* Actions: Vendors, Edit, Cancel */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenVendorModal(ev)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sand-dark bg-sand text-ink hover:bg-wine hover:text-sand hover:border-wine text-xs font-semibold transition-all shadow-sm"
                            title="Manage Vendors for this Event (event_vendors table)"
                          >
                            <Store className="w-3.5 h-3.5" />
                            <span>Vendors</span>
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                (ev.vendors_count || ev.vendors?.length || 0) > 0
                                  ? 'bg-wine text-sand'
                                  : 'bg-sand-dark/70 text-ink'
                              }`}
                            >
                              {ev.vendors_count !== undefined ? ev.vendors_count : (ev.vendors?.length || 0)}
                            </span>
                          </button>

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
          <div className="bg-sand text-ink rounded-2xl max-w-2xl w-full border border-sand-dark shadow-poster p-6 relative max-h-[90vh] overflow-y-auto">
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
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                      Category (Foreign Key) <span className="text-red-700">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      className="text-[11px] font-bold text-wine hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> New
                    </button>
                  </div>
                  <select
                    id="event-category-select"
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? Number(e.target.value) : '' })}
                    className="w-full px-3 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                  >
                    {categories.length === 0 ? (
                      <option value="">-- No categories in database --</option>
                    ) : (
                      <>
                        <option value="">-- Select Category --</option>
                        {categories.map((c) => (
                          <option key={c.category_id} value={c.category_id}>
                            {c.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {formErrors.category_id && <p className="text-xs text-red-700">{formErrors.category_id}</p>}
                  {categories.length === 0 && (
                    <div className="mt-1.5 p-2.5 bg-sand-dark/40 border border-sand-dark rounded-xl flex items-center justify-between text-xs text-ink/80">
                      <span>No categories found.</span>
                      <button
                        type="button"
                        onClick={() => setShowCategoryModal(true)}
                        className="px-2.5 py-1 bg-wine text-sand rounded-lg text-[11px] font-heading uppercase tracking-wider font-bold hover:bg-wine-dark transition shadow-sm"
                      >
                        + Create Category
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                    Venue (Foreign Key) <span className="text-red-700">*</span>
                  </label>
                  <select
                    id="event-venue-select"
                    value={formData.venue_id}
                    onChange={(e) => setFormData({ ...formData, venue_id: e.target.value ? Number(e.target.value) : '' })}
                    className="w-full px-3 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                  >
                    <option value="">-- Select Venue --</option>
                    {venues.map((v) => (
                      <option key={v.venue_id} value={v.venue_id} disabled={v.is_active === false}>
                        {v.name} ({v.city}){v.is_active === false ? ' — [Inactive]' : ''}
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
                    id="event-start-time-input"
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
                    id="event-end-time-input"
                    type="datetime-local"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                  />
                  {formErrors.end_time && <p className="text-xs text-red-700">{formErrors.end_time}</p>}
                </div>
              </div>

              {/* Venue Operating Hours Display Banner */}
              {formData.venue_id && (
                <div
                  id="venue-operating-hours-display"
                  className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs transition-all ${
                    hoursInfo.status === 'open' && !hoursInfo.hasWarning
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950'
                      : hoursInfo.status === 'open' && hoursInfo.hasWarning
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-950'
                      : hoursInfo.status === 'closed'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-950'
                      : hoursInfo.status === 'unconfigured'
                      ? 'bg-amber-500/15 border-amber-600/40 text-amber-950'
                      : hoursInfo.status === 'inactive'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-950'
                      : 'bg-sand-dark/40 border-sand-dark text-ink/70'
                  }`}
                >
                  {hoursInfo.status === 'open' && !hoursInfo.hasWarning ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  ) : hoursInfo.status === 'closed' ? (
                    <Ban className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  ) : hoursInfo.status === 'open' && hoursInfo.hasWarning ? (
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  ) : hoursInfo.status === 'unconfigured' ? (
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  ) : hoursInfo.status === 'inactive' ? (
                    <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="w-4 h-4 text-ink/50 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5 flex-1">
                    <p className="font-heading font-bold uppercase tracking-wide">
                      {hoursInfo.title}
                    </p>
                    {hoursInfo.message && (
                      <p className="text-[11px] leading-relaxed opacity-90">{hoursInfo.message}</p>
                    )}
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

              {/* Select Vendors Needed for Event (saved to event_vendors table) */}
              <div className="space-y-2 pt-3 border-t border-sand-dark">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-heading uppercase tracking-wider text-ink font-bold">
                    <Store className="w-4 h-4 text-wine" />
                    <span>Select Vendors Needed for Event</span>
                  </label>
                  <span className="text-[11px] font-semibold text-wine bg-wine/10 px-2.5 py-0.5 rounded-full border border-wine/20">
                    {(formData.vendor_ids || []).length} selected
                  </span>
                </div>
                <p className="text-[11px] text-ink/70">
                  Select available vendors (catering, photography, sound, decoration, etc.) required for this event. These will be automatically added to the <code className="font-mono text-[10px] bg-sand-dark/60 px-1 py-0.5 rounded">event_vendors</code> table.
                </p>

                {allVendors.length === 0 ? (
                  <div className="p-3 bg-sand-dark/30 rounded-xl text-center text-xs text-ink/60 border border-dashed border-sand-dark">
                    No vendors found in system. Register vendors in the Vendors module.
                  </div>
                ) : (
                  <div className="max-h-52 overflow-y-auto border border-sand-dark rounded-xl p-2 bg-sand-dark/20 space-y-1.5">
                    {allVendors.map((vendor) => {
                      const isSelected = (formData.vendor_ids || []).includes(vendor.vendor_id);
                      return (
                        <div
                          key={vendor.vendor_id}
                          onClick={() => {
                            const current = formData.vendor_ids || [];
                            const updated = isSelected
                              ? current.filter((id) => id !== vendor.vendor_id)
                              : [...current, vendor.vendor_id];
                            setFormData({ ...formData, vendor_ids: updated });
                          }}
                          className={`flex items-start gap-3 p-2.5 rounded-xl transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'bg-wine/10 border border-wine/40 shadow-xs'
                              : 'bg-sand hover:bg-sand-dark/40 border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            id={`vendor-select-${vendor.vendor_id}`}
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-0.5 w-4 h-4 rounded text-wine border-sand-dark focus:ring-wine accent-wine cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-heading font-bold text-xs text-ink truncate">
                                {vendor.vendor_name}
                              </span>
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-heading uppercase font-semibold bg-wine/10 text-wine border border-wine/20 whitespace-nowrap">
                                {vendor.service_name || 'Vendor'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink/70 mt-1">
                              {vendor.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-ink/40" /> {vendor.phone}
                                </span>
                              )}
                              {vendor.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-ink/40" /> {vendor.email}
                                </span>
                              )}
                              {vendor.pricing && (
                                <span className="font-semibold text-emerald-800">
                                  Rate: {typeof vendor.pricing === 'number' ? `₹${vendor.pricing}` : vendor.pricing}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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

      {/* Quick Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-sand border-2 border-wine/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-sand-dark">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-wine/10 text-wine">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-lg text-ink uppercase tracking-wide">
                    Create New Category
                  </h3>
                  <p className="text-xs text-ink/70">Save directly to Supabase categories table</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="p-1 rounded-lg text-ink/60 hover:text-ink hover:bg-sand-dark/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                  Category Name <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Technology & AI, Music, Sports"
                  className="w-full px-3.5 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-wine"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                  Description <span className="text-ink/60 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={255}
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  placeholder="Short description of this category"
                  className="w-full px-3.5 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-wine"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 border border-sand-dark rounded-xl text-xs font-bold uppercase tracking-wider text-ink hover:bg-sand-dark/50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={categorySubmitting}
                  className="px-5 py-2 bg-wine text-sand rounded-xl text-xs font-heading font-black uppercase tracking-wider hover:bg-wine-dark transition shadow-md disabled:opacity-50"
                >
                  {categorySubmitting ? 'Saving...' : 'Save Category'}
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

      {/* =========================================================================
          EVENT VENDORS COORDINATION MODAL (event_vendors table)
          ========================================================================= */}
      {vendorModalOpen && activeVendorEvent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-sand text-ink rounded-2xl max-w-3xl w-full border border-sand-dark shadow-poster p-6 relative max-h-[90vh] overflow-y-auto space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-sand-dark">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-wine/10 text-wine flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg uppercase tracking-tight text-ink font-black">
                    Event Vendors Coordination
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink/70 mt-0.5">
                    <span className="font-bold text-wine">{activeVendorEvent.title}</span>
                    <span>•</span>
                    <span>#{activeVendorEvent.event_id}</span>
                    <span>•</span>
                    <span>Venue: {activeVendorEvent.venue}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setVendorModalOpen(false);
                  setActiveVendorEvent(null);
                }}
                className="p-1 rounded-lg text-ink/50 hover:text-ink hover:bg-sand-dark/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Currently Assigned Vendors List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-heading text-xs uppercase tracking-wider font-bold text-ink flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-wine" />
                  <span>Assigned Vendors ({eventVendorsList.length})</span>
                </h4>
                <span className="text-[11px] text-ink/60">
                  Synced directly with <code className="font-mono bg-sand-dark/60 px-1 py-0.5 rounded text-[10px]">event_vendors</code> table
                </span>
              </div>

              {loadingEventVendors ? (
                <div className="p-8 text-center text-xs text-ink/60 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-wine" />
                  <span>Loading assigned vendors...</span>
                </div>
              ) : eventVendorsList.length === 0 ? (
                <div className="p-6 bg-sand-dark/20 border border-dashed border-sand-dark rounded-xl text-center space-y-1">
                  <p className="font-heading font-semibold text-xs text-ink">No Vendors Assigned Yet</p>
                  <p className="text-[11px] text-ink/60">
                    Use the form below to assign required vendors (catering, photography, sound, etc.) to this event.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {eventVendorsList.map((evVendor) => {
                    return (
                      <div
                        key={evVendor.vendor_id}
                        className="p-3.5 bg-sand-dark/25 border border-sand-dark rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        {/* Vendor Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-heading font-bold text-sm text-ink truncate">
                              {evVendor.vendor_name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-heading uppercase font-semibold bg-wine/10 text-wine border border-wine/20 shrink-0">
                              {evVendor.service_name}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/70 mt-1">
                            {evVendor.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-ink/50" /> {evVendor.phone}
                              </span>
                            )}
                            {evVendor.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-ink/50" /> {evVendor.email}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status & Agreed Cost Controls */}
                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                          {/* Booking Status Dropdown */}
                          <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] font-heading uppercase tracking-wider text-ink/60 font-semibold">
                              Booking Status
                            </label>
                            <select
                              value={evVendor.booking_status || 'requested'}
                              onChange={(e) => handleUpdateVendorStatus(evVendor.vendor_id, e.target.value)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-wine transition-colors ${
                                evVendor.booking_status === 'confirmed'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : evVendor.booking_status === 'cancelled'
                                  ? 'bg-red-100 text-red-800 border-red-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}
                            >
                              <option value="requested">Requested</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>

                          {/* Agreed Cost Input with Save */}
                          <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] font-heading uppercase tracking-wider text-ink/60 font-semibold">
                              Agreed Cost (₹)
                            </label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={vendorCosts[evVendor.vendor_id] !== undefined ? vendorCosts[evVendor.vendor_id] : String(evVendor.agreed_cost || 0)}
                                onChange={(e) =>
                                  setVendorCosts({
                                    ...vendorCosts,
                                    [evVendor.vendor_id]: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateVendorCost(evVendor.vendor_id, vendorCosts[evVendor.vendor_id]);
                                  }
                                }}
                                className="w-24 px-2 py-1.5 bg-sand border border-sand-dark rounded-lg text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-wine"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateVendorCost(evVendor.vendor_id, vendorCosts[evVendor.vendor_id])
                                }
                                title="Save Agreed Cost"
                                className="p-1.5 rounded-lg bg-wine text-sand hover:bg-wine-dark transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Remove Vendor */}
                          <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] font-heading uppercase tracking-wider text-transparent select-none">
                              Action
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemoveVendorFromEvent(evVendor.vendor_id, evVendor.vendor_name)}
                              title="Unassign vendor from this event"
                              className="p-1.5 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-700 hover:text-white transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section: Assign Another Vendor */}
            <div className="pt-4 border-t border-sand-dark space-y-3">
              <h4 className="font-heading text-xs uppercase tracking-wider font-bold text-ink flex items-center gap-2">
                <Plus className="w-4 h-4 text-wine" />
                <span>Assign Another Vendor to this Event</span>
              </h4>

              <form onSubmit={handleAssignVendorToEvent} className="p-3.5 bg-sand-dark/20 border border-sand-dark rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Vendor Dropdown */}
                  <div className="space-y-1 sm:col-span-1">
                    <label className="block text-[11px] font-heading uppercase tracking-wider text-ink font-semibold">
                      Vendor <span className="text-red-700">*</span>
                    </label>
                    <select
                      value={selectedNewVendorId}
                      onChange={(e) => setSelectedNewVendorId(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-sand border border-sand-dark rounded-xl text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-wine"
                    >
                      <option value="">-- Choose Vendor --</option>
                      {allVendors
                        .filter((v) => !eventVendorsList.some((ev) => ev.vendor_id === v.vendor_id))
                        .map((v) => (
                          <option key={v.vendor_id} value={v.vendor_id}>
                            {v.vendor_name} ({v.service_name})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Agreed Cost */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-heading uppercase tracking-wider text-ink font-semibold">
                      Agreed Cost (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={newVendorAgreedCost}
                      onChange={(e) => setNewVendorAgreedCost(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-sand border border-sand-dark rounded-xl text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-wine"
                    />
                  </div>

                  {/* Initial Status */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-heading uppercase tracking-wider text-ink font-semibold">
                      Booking Status
                    </label>
                    <select
                      value={newVendorStatus}
                      onChange={(e) => setNewVendorStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-sand border border-sand-dark rounded-xl text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-wine"
                    >
                      <option value="requested">Requested</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={!selectedNewVendorId || vendorActionLoading}
                    className="px-4 py-2 bg-wine text-sand rounded-xl text-xs font-heading font-black uppercase tracking-wider hover:bg-wine-dark transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{vendorActionLoading ? 'Assigning...' : 'Assign Vendor'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-sand-dark flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setVendorModalOpen(false);
                  setActiveVendorEvent(null);
                }}
                className="px-5 py-2 rounded-xl bg-ink text-sand text-xs font-heading font-bold uppercase tracking-wider hover:bg-ink/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
