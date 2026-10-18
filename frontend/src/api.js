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

// Venues API
export const venuesApi = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.city) searchParams.set('city', params.city);
    if (params.min_capacity) searchParams.set('min_capacity', params.min_capacity);
    if (params.q) searchParams.set('q', params.q);
    const query = searchParams.toString();
    return request(`/venues${query ? `?${query}` : ''}`);
  },

  getById: (id) => request(`/venues/${id}`),

  create: (venueData) => request('/venues', {
    method: 'POST',
    body: venueData,
  }),

  update: (id, venueData) => request(`/venues/${id}`, {
    method: 'PUT',
    body: venueData,
  }),

  delete: (id) => request(`/venues/${id}`, {
    method: 'DELETE',
  }),

  updateHours: (id, hoursArray) => request(`/venues/${id}/hours`, {
    method: 'PUT',
    body: hoursArray,
  }),
};

// Categories API
export const categoriesApi = {
  getAll: () => request('/categories'),
};

// Users / Auth API
export const authApi = {
  login: (credentials) => request('/users/login', {
    method: 'POST',
    body: credentials,
  }),

  register: (userData) => request('/users/register', {
    method: 'POST',
    body: userData,
  }),
};

// Events API (May not exist yet; falls back to mock list in component with TODO)
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
};

export default {
  API_BASE_URL,
  venues: venuesApi,
  categories: categoriesApi,
  auth: authApi,
  events: eventsApi,
};
