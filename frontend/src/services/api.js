/**
 * API service for backend communication.
 *
 * Provides functions to interact with the FastAPI backend.
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
   * Create a new inventory item.
   */
  createItem: async (itemData) => {
    return apiFetch('/api/inventory/', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  },

  /**
   * List all inventory items with pagination support.
   *
   * The backend now returns paginated responses. This method handles both
   * the old array format (for backwards compatibility) and the new paginated format.
   */
  listItems: async (filters = {}) => {
    // Add default pagination parameters if not provided
    const paginationDefaults = {
      skip: 0,
      limit: 200,  // Get all items for now (max 200)
      ...filters
    };
    const params = new URLSearchParams(paginationDefaults);
    const response = await apiFetch(`/api/inventory?${params}`);

    // Handle paginated response format
    if (response && typeof response === 'object' && 'items' in response) {
      // New paginated format: { items: [...], total: 100, skip: 0, limit: 50, has_more: true }
      return response.items;
    }

    // Old format: just an array of items (for backwards compatibility)
    return response;
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

  /**
   * Delete inventory item.
   */
  deleteItem: async (itemId) => {
    return apiFetch(`/api/inventory/${itemId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Upload an image for an inventory item.
   */
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${API_BASE_URL}/api/inventory/upload-image`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: `HTTP error ${response.status}`,
      }));
      throw new Error(error.detail || `Upload failed with status ${response.status}`);
    }

    return await response.json();
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

  /**
   * Get driver recommendations for a booking.
   */
  getDriverRecommendations: async (bookingId) => {
    return apiFetch(`/api/admin/drivers/recommendations/${bookingId}`);
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

// Phineas AI API
export const phineasAPI = {
  /**
   * Scan for unassigned bookings and create driver assignment proposals.
   */
  scanAssignments: async () => {
    return apiFetch('/api/admin/phineas/scan-assignments', {
      method: 'POST',
    });
  },

  /**
   * Get list of Phineas proposals with optional filters.
   */
  getProposals: async (statusFilter = null, proposalType = null, limit = 50) => {
    const params = new URLSearchParams();
    if (statusFilter) params.append('status_filter', statusFilter);
    if (proposalType) params.append('proposal_type', proposalType);
    if (limit) params.append('limit', limit.toString());
    return apiFetch(`/api/admin/phineas/proposals?${params}`);
  },

  /**
   * Approve a pending proposal.
   */
  approveProposal: async (proposalId) => {
    return apiFetch(`/api/admin/phineas/proposals/${proposalId}/approve`, {
      method: 'PATCH',
    });
  },

  /**
   * Reject a pending proposal.
   */
  rejectProposal: async (proposalId) => {
    return apiFetch(`/api/admin/phineas/proposals/${proposalId}/reject`, {
      method: 'PATCH',
    });
  },

  /**
   * Execute an approved proposal.
   */
  executeProposal: async (proposalId) => {
    return apiFetch('/api/admin/phineas/execute-assignment', {
      method: 'POST',
      body: JSON.stringify({ proposal_id: proposalId }),
    });
  },
};

// Partner API
export const partnerAPI = {
  /**
   * List all partners.
   */
  listPartners: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    return apiFetch(`/api/partners?${params}`);
  },

  /**
   * Create a new partner.
   */
  createPartner: async (partnerData) => {
    return apiFetch('/api/partners/', {
      method: 'POST',
      body: JSON.stringify(partnerData),
    });
  },

  /**
   * Get partner details.
   */
  getPartner: async (partnerId) => {
    return apiFetch(`/api/partners/${partnerId}`);
  },

  /**
   * Update partner information.
   */
  updatePartner: async (partnerId, updateData) => {
    return apiFetch(`/api/partners/${partnerId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  /**
   * Delete a partner.
   */
  deletePartner: async (partnerId) => {
    return apiFetch(`/api/partners/${partnerId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Trigger inventory sync for a partner.
   */
  syncInventory: async (partnerId, warehouseLocationId = null, applyMarkup = true) => {
    const body = {};
    if (warehouseLocationId) body.warehouse_location_id = warehouseLocationId;
    body.apply_markup = applyMarkup;

    return apiFetch(`/api/inventory/sync/${partnerId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /**
   * Get sync logs.
   */
  getSyncLogs: async (partnerId = null, limit = 50) => {
    const params = new URLSearchParams();
    if (partnerId) params.append('partner_id', partnerId);
    params.append('limit', limit.toString());
    return apiFetch(`/api/inventory/sync/logs?${params}`);
  },

  /**
   * Get specific sync log.
   */
  getSyncLog: async (syncLogId) => {
    return apiFetch(`/api/inventory/sync/logs/${syncLogId}`);
  },
};

// Warehouse Location API (nested under Partner)
export const warehouseLocationAPI = {
  /**
   * List all warehouse locations for a partner.
   */
  listLocations: async (partnerId, isActive = null) => {
    const params = new URLSearchParams();
    if (isActive !== null) params.append('is_active', isActive);
    return apiFetch(`/api/partners/${partnerId}/locations?${params}`);
  },

  /**
   * Get a specific warehouse location.
   */
  getLocation: async (partnerId, locationId) => {
    return apiFetch(`/api/partners/${partnerId}/locations/${locationId}`);
  },

  /**
   * Create a new warehouse location for a partner.
   */
  createLocation: async (partnerId, locationData) => {
    return apiFetch(`/api/partners/${partnerId}/locations`, {
      method: 'POST',
      body: JSON.stringify({ ...locationData, partner_id: partnerId }),
    });
  },

  /**
   * Update a warehouse location.
   */
  updateLocation: async (partnerId, locationId, updateData) => {
    return apiFetch(`/api/partners/${partnerId}/locations/${locationId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  /**
   * Delete a warehouse location.
   */
  deleteLocation: async (partnerId, locationId) => {
    return apiFetch(`/api/partners/${partnerId}/locations/${locationId}`, {
      method: 'DELETE',
    });
  },
};

// Health check
export const healthCheck = async () => {
  return apiFetch('/health');
};
