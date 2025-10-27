import { useState, useEffect } from 'react'
import { X, Calendar, Package, DollarSign, MapPin } from 'lucide-react'
import axios from 'axios'

export default function InventoryCalendarModal({ item, onClose }) {
  const [calendarData, setCalendarData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const API_URL = 'http://localhost:8000/api'

  useEffect(() => {
    if (item) {
      fetchCalendar()
    }
  }, [item, currentMonth])

  const fetchCalendar = async () => {
    setLoading(true)
    try {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth() + 1
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`

      // Calculate end date (last day of month)
      const lastDay = new Date(year, month, 0).getDate()
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      const response = await axios.get(
        `${API_URL}/inventory/${item.inventory_item_id}/calendar?start_date=${startDate}&end_date=${endDate}`
      )
      setCalendarData(response.data)
    } catch (error) {
      console.error('Error fetching calendar:', error)
    } finally {
      setLoading(false)
    }
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDay = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const bookingsForDay = calendarData?.bookings?.filter(b =>
        b.delivery_date === dateStr || b.pickup_date === dateStr
      ) || []

      days.push({
        date: day,
        dateStr: dateStr,
        bookings: bookingsForDay
      })
    }

    return days
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  const thumbnail = item.photos?.find(p => p.is_thumbnail) || item.photos?.[0]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full my-8">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-yellow-500" />
            <div>
              <h2 className="font-serif text-2xl font-light text-gray-800">{item.name}</h2>
              <p className="text-sm text-gray-500">Booking Calendar & Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Calendar Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={previousMonth}
                className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                ← Previous
              </button>
              <h3 className="text-lg font-medium text-gray-800">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>
              <button
                onClick={nextMonth}
                className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Next →
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Day headers */}
                <div className="grid grid-cols-7 bg-gray-50">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center text-xs font-medium text-gray-600">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 divide-x divide-y divide-gray-200">
                  {generateCalendarDays().map((day, idx) => (
                    <div
                      key={idx}
                      className={`min-h-[80px] p-2 ${
                        day ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'
                      }`}
                    >
                      {day && (
                        <>
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            {day.date}
                          </div>
                          {day.bookings.length > 0 && (
                            <div className="space-y-1">
                              {day.bookings.map((booking, bidx) => {
                                const isDelivery = booking.delivery_date === day.dateStr
                                const isPickup = booking.pickup_date === day.dateStr
                                return (
                                  <div
                                    key={bidx}
                                    className={`text-xs px-1.5 py-0.5 rounded ${
                                      isDelivery && isPickup
                                        ? 'bg-purple-100 text-purple-800'
                                        : isDelivery
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                    title={`${booking.customer_name} - ${
                                      isDelivery && isPickup
                                        ? 'Delivery & Pickup'
                                        : isDelivery
                                        ? 'Delivery'
                                        : 'Pickup'
                                    }`}
                                  >
                                    {booking.customer_name?.split(' ')[0]}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span>Delivery</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                <span>Pickup</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
                <span>Both</span>
              </div>
            </div>
          </div>

          {/* Item Details Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Item Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Image and Basic Info */}
              <div>
                {thumbnail && (
                  <div className="mb-4 rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={thumbnail.image_url}
                      alt={item.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-600">Category</div>
                    <div className="text-gray-800">{item.category}</div>
                  </div>

                  {item.description && (
                    <div>
                      <div className="text-sm font-medium text-gray-600">Description</div>
                      <div className="text-gray-800">{item.description}</div>
                    </div>
                  )}

                  <div>
                    <div className="text-sm font-medium text-gray-600">Status</div>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                      item.status === 'available'
                        ? 'bg-green-100 text-green-800'
                        : item.status === 'rented'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.status?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column - Pricing and Features */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-2xl font-semibold text-gray-800">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  ${parseFloat(item.base_price).toFixed(2)} / day
                </div>

                {item.requires_power && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Requires Power</span>
                  </div>
                )}

                {item.min_space_sqft && (
                  <div>
                    <div className="text-sm font-medium text-gray-600">Minimum Space Required</div>
                    <div className="text-gray-800">{item.min_space_sqft} sq ft</div>
                  </div>
                )}

                {item.allowed_surfaces && item.allowed_surfaces.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-2">Allowed Surfaces</div>
                    <div className="flex flex-wrap gap-2">
                      {item.allowed_surfaces.map(surface => (
                        <span
                          key={surface}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded"
                        >
                          {surface}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-gray-600">Website Visibility</div>
                  <div className="text-gray-800">
                    {item.website_visible ? (
                      <span className="text-green-600">Visible to customers</span>
                    ) : (
                      <span className="text-gray-500">Hidden from website</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
