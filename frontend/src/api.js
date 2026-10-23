/**
 * Eventilion API Client
 * Plain fetch helper reading base URL from import.meta.env.VITE_API_URL
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    let data = null;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text ? { detail: text } : null;
      }
    }

    if (!response.ok) {
      const errorMessage = data?.detail || data?.message || `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    // If it's a network error (e.g., backend not reachable)
    if (!err.status) {
      const networkErr = new Error(`Cannot connect to backend server at ${API_BASE_URL}.`);
      networkErr.original = err;
      throw networkErr;
    }
    throw err;
  }
}

// Venues API  (backend: /api/venues, hours in table venueoperatinghours)
// Every venue object returned here carries a `hours` array from /api/venue-hours.
function groupHours(rows) {
  const byVenue = {};
  (rows || []).forEach((h) => {
    (byVenue[h.venue_id] = byVenue[h.venue_id] || []).push(h);
  });
  return byVenue;
}

export const venuesApi = {
    getAll: async () => {
    const venues = await request('/api/venues');
    return (venues || []).map((v) => ({
      ...v,
      hours: v.hours || [],
    }));
  },

  getById: async (id) => {
    const [venue, hours] = await Promise.all([
      request(`/api/venues/${id}`),
      request(`/api/venue-hours?venue_id=${id}`),
    ]);
    return { ...venue, hours: hours || [] };
  },

  // Backend responds with { message, venue }
  create: async (venueData) => (await request('/api/venues', { method: 'POST', body: venueData })).venue,

  update: async (id, venueData) =>
    (await request(`/api/venues/${id}`, { method: 'PUT', body: venueData })).venue,

  delete: (id) => request(`/api/venues/${id}`, { method: 'DELETE' }),

  // Saves a 7-day schedule: updates days that already have a row, inserts the rest.
  updateHours: async (id, hoursArray) => {
    const existing = await request(`/api/venue-hours?venue_id=${id}`);
    const byDay = {};
    (existing || []).forEach((h) => { byDay[Number(h.day_of_week)] = h; });
    for (const h of hoursArray) {
      const body = {
        day_of_week: Number(h.day_of_week),
        open_time: h.is_closed ? null : h.open_time,
        close_time: h.is_closed ? null : h.close_time,
        is_closed: Boolean(h.is_closed),
      };
      const current = byDay[body.day_of_week];
      if (current) {
        await request(`/api/venues/operating-hours/${current.hours_id}`, { method: 'PUT', body });
      } else {
        await request(`/api/venues/${id}/operating-hours`, { method: 'POST', body });
      }
    }
  },
};

// Categories API (table: categories)
export const categoriesApi = {
  getAll: () => request('/api/categories'),
};

// Services API (table: services, referenced by vendors.service_id)
export const servicesApi = {
  getAll: () => request('/api/services'),
};

// Users / Auth API
export const authApi = {
  login: (credentials) => request('/api/auth/login', {
    method: 'POST',
    body: credentials,
  }),

  register: (userData) => request('/users/register', {
    method: 'POST',
    body: userData,
  }),
};

// Events API
export const eventsApi = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.set(key, val);
      }
    });
    const query = searchParams.toString();
    return request(`/events${query ? `?${query}` : ''}`);
  },

  create: (eventData) => request('/events', {
    method: 'POST',
    body: eventData,
  }),

  update: (id, eventData) => request(`/events/${id}`, {
    method: 'PUT',
    body: eventData,
  }),

  delete: (id) => request(`/events/${id}`, {
    method: 'DELETE',
  }),
};

// Admin Analytics API
export const adminApi = {
  getStats: () => request('/api/admin/stats'),
  getEvents: () => request('/api/admin/events'),
  getVenues: () => request('/api/admin/venues'),
  getVendors: () => request('/api/admin/vendors'),
};

// Vendors API (Full CRUD)
export const vendorsApi = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.service_id) searchParams.set('service_id', params.service_id);
    if (params.q) searchParams.set('q', params.q);
    const query = searchParams.toString();
    return request(`/api/vendors${query ? `?${query}` : ''}`);
  },

  getById: (id) => request(`/api/vendors/${id}`),

  create: (vendorData) => request('/api/vendors', {
    method: 'POST',
    body: vendorData,
  }),

  update: (id, vendorData) => request(`/api/vendors/${id}`, {
    method: 'PUT',
    body: vendorData,
  }),

  delete: (id) => request(`/api/vendors/${id}`, {
    method: 'DELETE',
  }),
};

export default {
  API_BASE_URL,
  venues: venuesApi,
  categories: categoriesApi,
  services: servicesApi,
  auth: authApi,
  events: eventsApi,
  admin: adminApi,
  vendors: vendorsApi,
};
