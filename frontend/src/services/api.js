import { config } from '../config'
import { authService } from './auth'

const API_BASE = config.apiEndpoint

async function getAuthHeaders() {
  try {
    const session = await authService.getSession()
    return {
      'Content-Type': 'application/json',
      'Authorization': session.idToken,
    }
  } catch {
    throw new Error('Not authenticated')
  }
}

async function handleResponse(response) {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'API request failed')
  }
  return data
}

export const publicApi = {
  getClasses: async () => {
    const response = await fetch(`${API_BASE}/classes`, {
      headers: { 'Content-Type': 'application/json' },
    })
    return handleResponse(response)
  },

  getClass: async (id) => {
    const response = await fetch(`${API_BASE}/classes/${id}`, {
      headers: { 'Content-Type': 'application/json' },
    })
    return handleResponse(response)
  },

  bookClass: async (classId, bookingData) => {
    const response = await fetch(`${API_BASE}/classes/${classId}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData),
    })
    return handleResponse(response)
  },
}

export const adminApi = {
  getClasses: async () => {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE}/admin/classes`, { headers })
    return handleResponse(response)
  },

  getClass: async (id) => {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE}/admin/classes/${id}`, { headers })
    return handleResponse(response)
  },

  createClass: async (classData) => {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE}/admin/classes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(classData),
    })
    return handleResponse(response)
  },

  updateClass: async (id, classData) => {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE}/admin/classes/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(classData),
    })
    return handleResponse(response)
  },

  deleteClass: async (id) => {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE}/admin/classes/${id}`, {
      method: 'DELETE',
      headers,
    })
    return handleResponse(response)
  },

  updateBookingStatus: async (bookingId, status) => {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE}/admin/bookings/${bookingId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status }),
    })
    return handleResponse(response)
  },

  cancelBooking: async (bookingId) => {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE}/admin/bookings/${bookingId}`, {
      method: 'DELETE',
      headers,
    })
    return handleResponse(response)
  },
}
