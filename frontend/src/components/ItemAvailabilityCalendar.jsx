import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function ItemAvailabilityCalendar({
  inventoryId,
  onDateSelect,
  selectedDates = { delivery: null, pickup: null }
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [bookings, setBookings] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectingType, setSelectingType] = useState('delivery') // 'delivery' or 'pickup'

  // Fetch bookings calendar for the item
  useEffect(() => {
    const fetchCalendar = async () => {
      setIsLoading(true)
      try {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth() + 1
        const startDate = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0) // Last day of the month

        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/inventory/${inventoryId}/calendar?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`
        )
        if (response.ok) {
          const data = await response.json()
          setBookings(data.bookings || [])
        }
      } catch (error) {
        console.error('Error fetching calendar:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (inventoryId) {
      fetchCalendar()
    }
  }, [inventoryId, currentMonth])

  // Generate calendar days
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty slots for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const formatDate = (date) => {
    if (!date) return null
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const isDateAvailable = (date) => {
    if (!date) return false
    const dateStr = formatDate(date)
    // Check if date is in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) return false

    // Check if date falls within any booking period
    return !bookings.some(booking => {
      const deliveryDate = booking.delivery_date.split('T')[0]
      const pickupDate = booking.pickup_date.split('T')[0]
      return dateStr >= deliveryDate && dateStr <= pickupDate
    })
  }

  const isDateSelected = (date) => {
    if (!date) return false
    const dateStr = formatDate(date)
    return dateStr === selectedDates.delivery || dateStr === selectedDates.pickup
  }

  const isDateInRange = (date) => {
    if (!date || !selectedDates.delivery || !selectedDates.pickup) return false
    const dateStr = formatDate(date)
    return dateStr > selectedDates.delivery && dateStr < selectedDates.pickup
  }

  const isDateBooked = (date) => {
    if (!date) return false
    const dateStr = formatDate(date)
    return bookings.some(booking => {
      const deliveryDate = booking.delivery_date.split('T')[0]
      const pickupDate = booking.pickup_date.split('T')[0]
      return dateStr >= deliveryDate && dateStr <= pickupDate
    })
  }

  const handleDateClick = (date) => {
    if (!isDateAvailable(date)) return

    const dateStr = formatDate(date)

    if (selectingType === 'delivery') {
      onDateSelect({ delivery: dateStr, pickup: null })
      setSelectingType('pickup')
    } else {
      // Make sure pickup is after delivery
      if (dateStr > selectedDates.delivery) {
        onDateSelect({ delivery: selectedDates.delivery, pickup: dateStr })
        setSelectingType('delivery') // Reset for next selection
      }
    }
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const days = getDaysInMonth()
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h3 className="text-lg font-semibold text-gray-800">{monthName}</h3>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Selection status */}
      <div className="mb-3 text-sm">
        {!selectedDates.delivery ? (
          <p className="text-gray-600">Select <span className="font-semibold">delivery date</span></p>
        ) : !selectedDates.pickup ? (
          <p className="text-gray-600">Select <span className="font-semibold">pickup date</span></p>
        ) : (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-md">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Dates selected</span>
          </div>
        )}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {isLoading ? (
          <div className="col-span-7 text-center py-8 text-gray-500">
            Loading availability...
          </div>
        ) : (
          days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="aspect-square" />
            }

            const available = isDateAvailable(date)
            const selected = isDateSelected(date)
            const inRange = isDateInRange(date)
            const booked = isDateBooked(date)

            return (
              <button
                key={date.toISOString()}
                onClick={() => handleDateClick(date)}
                disabled={!available}
                className={`
                  aspect-square flex items-center justify-center text-sm rounded-lg
                  transition-colors relative
                  ${available ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed'}
                  ${selected ? 'bg-yellow-400 text-gray-800 font-semibold' : ''}
                  ${inRange ? 'bg-yellow-100' : ''}
                  ${!selected && !inRange && available ? 'text-gray-700' : ''}
                  ${!available && booked ? 'bg-red-50 text-red-400' : ''}
                  ${!available && !booked ? 'text-gray-400' : ''}
                `}
              >
                {date.getDate()}
                {booked && !selected && (
                  <span className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-red-400 rounded-full"></span>
                )}
              </button>
            )
          })
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-yellow-400 rounded"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-yellow-100 rounded"></div>
          <span>Your rental</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-red-50 rounded relative">
            <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-red-400 rounded-full"></span>
          </div>
          <span>Booked</span>
        </div>
      </div>
    </div>
  )
}
