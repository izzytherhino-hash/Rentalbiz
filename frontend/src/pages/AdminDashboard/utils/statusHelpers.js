/**
 * Status utility functions for booking status display.
 *
 * Provides functions for formatting and styling booking status values.
 */

/**
 * Get Tailwind CSS classes for booking status badge.
 *
 * Args:
 *   status: Booking status string
 *
 * Returns:
 *   String of Tailwind CSS classes for background, text, and border color
 */
export function getStatusColor(status) {
  const colors = {
    'pending': 'bg-gray-100 text-gray-800 border-gray-300',
    'confirmed': 'bg-blue-100 text-blue-800 border-blue-300',
    'out_for_delivery': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'delivered': 'bg-green-100 text-green-800 border-green-300',
    'active': 'bg-green-100 text-green-800 border-green-300',
    'picked_up': 'bg-purple-100 text-purple-800 border-purple-300',
    'completed': 'bg-gray-100 text-gray-800 border-gray-300',
    'cancelled': 'bg-red-100 text-red-800 border-red-300'
  }
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300'
}

/**
 * Get human-readable label for booking status.
 *
 * Args:
 *   status: Booking status string
 *
 * Returns:
 *   Formatted string for display
 */
export function getStatusLabel(status) {
  const labels = {
    'pending': 'Pending',
    'confirmed': 'Confirmed',
    'out_for_delivery': 'Out for Delivery',
    'delivered': 'Delivered',
    'active': 'Active Rental',
    'picked_up': 'Picked Up',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  }
  return labels[status] || status
}
