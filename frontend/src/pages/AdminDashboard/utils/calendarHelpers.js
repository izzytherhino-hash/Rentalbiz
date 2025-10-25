/**
 * Calendar utility functions for AdminDashboard.
 *
 * Provides functions for generating calendar data and determining
 * booking event types and colors.
 */

/**
 * Generate calendar days for a given month with associated bookings.
 *
 * Args:
 *   selectedDate: ISO date string (YYYY-MM-DD)
 *   bookings: Array of booking objects with delivery_date and pickup_date
 *
 * Returns:
 *   Array of day objects with { date, dateStr, bookings } or null for empty cells
 */
export function generateCalendarDays(selectedDate, bookings) {
  const days = []
  const [year, month] = selectedDate.split('-').map(Number)

  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const startDay = firstDay.getDay()

  // Add empty cells for days before the first of the month
  for (let i = 0; i < startDay; i++) {
    days.push(null)
  }

  // Add all days of the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayBookings = bookings.filter(b =>
      b.delivery_date === dateStr || b.pickup_date === dateStr
    )
    days.push({ date: day, dateStr: dateStr, bookings: dayBookings })
  }

  return days
}

/**
 * Get bookings for a specific date.
 *
 * Args:
 *   bookings: Array of booking objects
 *   dateStr: Date string in YYYY-MM-DD format
 *
 * Returns:
 *   Filtered array of bookings for the specified date
 */
export function getBookingsForDate(bookings, dateStr) {
  return bookings.filter(b =>
    b.delivery_date === dateStr || b.pickup_date === dateStr
  )
}

/**
 * Determine if a booking is a delivery or pickup for a given date.
 *
 * Args:
 *   booking: Booking object with delivery_date and pickup_date
 *   dateStr: Date string in YYYY-MM-DD format
 *
 * Returns:
 *   'delivery', 'pickup', or null
 */
export function getBookingEventType(booking, dateStr) {
  if (booking.delivery_date === dateStr) return 'delivery'
  if (booking.pickup_date === dateStr) return 'pickup'
  return null
}

/**
 * Get Tailwind CSS classes for event type color coding.
 *
 * Args:
 *   booking: Booking object
 *   dateStr: Date string in YYYY-MM-DD format
 *
 * Returns:
 *   String of Tailwind CSS classes for background, border, and text color
 */
export function getEventTypeColor(booking, dateStr) {
  const eventType = getBookingEventType(booking, dateStr)
  if (eventType === 'delivery') {
    return 'bg-green-100 border-green-400 text-green-800'
  }
  if (eventType === 'pickup') {
    return 'bg-blue-100 border-blue-400 text-blue-800'
  }
  return 'bg-white border-gray-200 text-gray-800'
}
