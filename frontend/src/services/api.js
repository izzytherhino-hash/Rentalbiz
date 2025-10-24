/**
 * API service for backend communication.
 *
 * Provides functions to interact with the FastAPI backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Generic fetch wrapper with error handling.
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: `HTTP error ${response.status}`,
      }));

      // Handle complex error details (objects/arrays)
      let errorMessage;
      if (typeof error.detail === 'object' && error.detail !== null) {
        // If detail is an object with a message property, use that
        if (error.detail.message) {
          errorMessage = error.detail.message;
          // If there are conflicts, add them to the message
          if (error.detail.conflicts && Array.isArray(error.detail.conflicts)) {
            const conflictList = error.detail.conflicts
              .map(c => {
                if (c.item_name && c.conflicting_booking) {
                  return `${c.item_name} conflicts with Order ${c.conflicting_booking} (${c.conflict_dates})`;
                }
                return `Item ${c.item_id || 'N/A'}: ${c.reason || 'Unavailable'}`;
              })
              .join(', ');
            errorMessage += `. Conflicts: ${conflictList}`;
          }
        } else {
          // Stringify the object
          errorMessage = JSON.stringify(error.detail);
        }
      } else {
        errorMessage = error.detail || `Request failed with status ${response.status}`;
      }

      throw new Error(errorMessage);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Booking API
export const bookingAPI = {
  /**
   * Check if items are available for date range.
   */
  checkAvailability: async (itemIds, deliveryDate, pickupDate) => {
    return apiFetch('/api/bookings/check-availability', {
      method: 'POST',
      body: JSON.stringify({
        item_ids: itemIds,
        delivery_date: deliveryDate,
        pickup_date: pickupDate,
      }),
    });
  },

  /**
   * Filter items by party space requirements.
   */
  filterItems: async (areaSize, surface, hasPower) => {
    return apiFetch('/api/bookings/filter-items', {
      method: 'POST',
      body: JSON.stringify({
        area_size: areaSize,
        surface: surface,
        has_power: hasPower,
      }),
    });
  },

  /**
   * Create a new booking.
   */
  createBooking: async (bookingData) => {
    return apiFetch('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  /**
   * Create a new booking with customer details (simplified flow).
   */
  createCustomerBooking: async (bookingData) => {
    return apiFetch('/api/bookings/customer', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  /**
   * Get booking by ID.
   */
  getBooking: async (bookingId) => {
    return apiFetch(`/api/bookings/${bookingId}`);
  },

  /**
   * List bookings with filters.
   */
  listBookings: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    return apiFetch(`/api/bookings?${params}`);
  },
};

// Inventory API
export const inventoryAPI = {
  /**
   * List all inventory items.
   */
  listItems: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    return apiFetch(`/api/inventory?${params}`);
  },

  /**
   * Get item details.
   */
  getItem: async (itemId) => {
    return apiFetch(`/api/inventory/${itemId}`);
  },

  /**
   * Get item booking calendar.
   */
  getItemCalendar: async (itemId, startDate, endDate) => {
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
    return apiFetch(`/api/inventory/${itemId}/calendar?${params}`);
  },

  /**
   * Check item availability.
   */
  checkItemAvailability: async (itemId, deliveryDate, pickupDate) => {
    const params = new URLSearchParams({
      delivery_date: deliveryDate,
      pickup_date: pickupDate,
    });
    return apiFetch(`/api/inventory/${itemId}/availability?${params}`);
  },

  /**
   * Update inventory item.
   */
  updateItem: async (itemId, updateData) => {
    return apiFetch(`/api/inventory/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  },
};

// Driver API
export const driverAPI = {
  /**
   * List all drivers.
   */
  listDrivers: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    return apiFetch(`/api/drivers?${params}`);
  },

  /**
   * Create a new driver.
   */
  createDriver: async (driverData) => {
    return apiFetch('/api/drivers/', {
      method: 'POST',
      body: JSON.stringify(driverData),
    });
  },

  /**
   * Get driver details.
   */
  getDriver: async (driverId) => {
    return apiFetch(`/api/drivers/${driverId}`);
  },

  /**
   * Update driver information.
   */
  updateDriver: async (driverId, updateData) => {
    return apiFetch(`/api/drivers/${driverId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  },

  /**
   * Get driver route for specific date.
   */
  getDriverRoute: async (driverId, routeDate) => {
    return apiFetch(`/api/drivers/${driverId}/route/${routeDate}`);
  },

  /**
   * Record inventory movement.
   */
  recordMovement: async (movementData) => {
    return apiFetch('/api/drivers/movements', {
      method: 'POST',
      body: JSON.stringify(movementData),
    });
  },
};

// Admin API
export const adminAPI = {
  /**
   * Get all bookings.
   */
  getAllBookings: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    return apiFetch(`/api/admin/bookings?${params}`);
  },

  /**
   * Get all conflicts.
   */
  getConflicts: async () => {
    return apiFetch('/api/admin/conflicts');
  },

  /**
   * Get dashboard stats.
   */
  getStats: async () => {
    return apiFetch('/api/admin/stats');
  },

  /**
   * Update booking.
   */
  updateBooking: async (bookingId, updateData) => {
    return apiFetch(`/api/admin/bookings/${bookingId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  },

  /**
   * Get unassigned bookings.
   */
  getUnassignedBookings: async () => {
    return apiFetch('/api/admin/drivers/unassigned-bookings');
  },

  /**
   * Get driver workload.
   */
  getDriverWorkload: async () => {
    return apiFetch('/api/admin/drivers/workload');
  },
};

// Chatbot API
export const chatbotAPI = {
  /**
   * Send message to chatbot.
   */
  sendMessage: async (message, conversationHistory = []) => {
    return apiFetch('/api/admin/chatbot/', {
      method: 'POST',
      body: JSON.stringify({
        message: message,
        conversation_history: conversationHistory,
      }),
    });
  },
};

// Health check
export const healthCheck = async () => {
  return apiFetch('/health');
};
