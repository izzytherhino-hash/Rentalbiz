import { useState, useEffect } from 'react'
import { X, Calendar, MapPin, Package, Clock, DollarSign, Truck } from 'lucide-react'
import axios from 'axios'
import { API_BASE_URL } from '../services/api'

export default function DriverCalendarModal({ driver, onClose }) {
  const [routeData, setRouteData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())

  useEffect(() => {
    if (driver) {
      fetchRoute()
    }
  }, [driver, selectedDate])

  const fetchRoute = async () => {
    setLoading(true)
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      const response = await axios.get(
        `${API_BASE_URL}/api/drivers/${driver.driver_id}/route/${dateStr}`
      )
      setRouteData(response.data)
    } catch (error) {
      console.error('Error fetching driver route:', error)
    } finally {
      setLoading(false)
    }
  }

  const previousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const nextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStopIcon = (type) => {
    switch (type) {
      case 'warehouse_pickup':
        return <Package className="w-5 h-5 text-blue-600" />
      case 'delivery':
        return <Truck className="w-5 h-5 text-green-600" />
      case 'pickup':
        return <Package className="w-5 h-5 text-orange-600" />
      case 'warehouse_return':
        return <Package className="w-5 h-5 text-purple-600" />
      default:
        return <MapPin className="w-5 h-5 text-gray-600" />
    }
  }

  const getStopColor = (type) => {
    switch (type) {
      case 'warehouse_pickup':
        return 'bg-blue-50 border-blue-200'
      case 'delivery':
        return 'bg-green-50 border-green-200'
      case 'pickup':
        return 'bg-orange-50 border-orange-200'
      case 'warehouse_return':
        return 'bg-purple-50 border-purple-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getStopTitle = (type) => {
    switch (type) {
      case 'warehouse_pickup':
        return 'Warehouse Pickup'
      case 'delivery':
        return 'Customer Delivery'
      case 'pickup':
        return 'Customer Pickup'
      case 'warehouse_return':
        return 'Warehouse Return'
      default:
        return 'Stop'
    }
  }

  const renderStop = (stop) => (
    <div
      key={stop.stop_number}
      className={`border-2 rounded-lg p-4 ${getStopColor(stop.type)}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full border-2 border-gray-300 font-semibold text-sm">
            {stop.stop_number}
          </div>
          {getStopIcon(stop.type)}
          <div>
            <h4 className="font-medium text-gray-800">{getStopTitle(stop.type)}</h4>
            {stop.order_number && (
              <p className="text-xs text-gray-500">Order #{stop.order_number}</p>
            )}
          </div>
        </div>
        {stop.time_window && (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            {stop.time_window}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {/* Customer/Warehouse Info */}
        {stop.customer_name && (
          <div>
            <p className="font-medium text-gray-800">{stop.customer_name}</p>
            {stop.customer_phone && (
              <p className="text-sm text-gray-600">{stop.customer_phone}</p>
            )}
          </div>
        )}
        {stop.warehouse_name && (
          <p className="font-medium text-gray-800">{stop.warehouse_name}</p>
        )}

        {/* Address */}
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-700">{stop.address}</p>
        </div>

        {/* Items */}
        {stop.items && stop.items.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-600 mb-1.5">Items:</p>
            <div className="space-y-1">
              {stop.items.map((item, idx) => (
                <div key={idx} className="text-sm text-gray-700 pl-2 border-l-2 border-gray-300">
                  {typeof item === 'string' ? (
                    item
                  ) : (
                    <div>
                      <p>{item.name}</p>
                      {item.for_order && (
                        <p className="text-xs text-gray-500">For: Order #{item.for_order}</p>
                      )}
                      {item.from_order && (
                        <p className="text-xs text-gray-500">From: Order #{item.from_order}</p>
                      )}
                      {item.return_warehouse && (
                        <p className="text-xs text-gray-500">Return to: {item.return_warehouse}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {stop.instructions && (
          <div className="mt-2 p-2 bg-white rounded border border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-1">Instructions:</p>
            <p className="text-sm text-gray-700">{stop.instructions}</p>
          </div>
        )}

        {/* Earnings */}
        {(stop.delivery_fee || stop.tip) && (
          <div className="mt-2 flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1 text-green-700">
              <DollarSign className="w-4 h-4" />
              <span>Fee: ${parseFloat(stop.delivery_fee || 0).toFixed(2)}</span>
            </div>
            {stop.tip > 0 && (
              <div className="flex items-center gap-1 text-green-700">
                <span>Tip: ${parseFloat(stop.tip).toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Status */}
        <div className="mt-2">
          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
            stop.status === 'pending' || stop.status === 'confirmed'
              ? 'bg-yellow-100 text-yellow-800'
              : stop.status === 'completed'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {stop.status?.toUpperCase() || 'PENDING'}
          </span>
        </div>
      </div>
    </div>
  )

  const allStops = routeData ? [
    ...(routeData.warehouse_pickups || []),
    ...(routeData.deliveries || []),
    ...(routeData.pickups || []),
    ...(routeData.warehouse_returns || [])
  ] : []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full my-8">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-yellow-500" />
            <div>
              <h2 className="font-serif text-2xl font-light text-gray-800">
                {driver.name}'s Route
              </h2>
              <p className="text-sm text-gray-500">
                {driver.email} • {driver.phone}
              </p>
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
          {/* Date Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={previousDay}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              ← Previous Day
            </button>
            <h3 className="text-lg font-medium text-gray-800">
              {formatDate(selectedDate)}
            </h3>
            <button
              onClick={nextDay}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Next Day →
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
            </div>
          ) : (
            <>
              {/* Summary */}
              {routeData && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-600 font-medium">Total Stops</p>
                    <p className="text-2xl font-semibold text-blue-900">{routeData.total_stops}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-600 font-medium">Total Earnings</p>
                    <p className="text-2xl font-semibold text-green-900">
                      ${parseFloat(routeData.total_earnings || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-sm text-purple-600 font-medium">Deliveries</p>
                    <p className="text-2xl font-semibold text-purple-900">
                      {routeData.deliveries?.length || 0}
                    </p>
                  </div>
                </div>
              )}

              {/* Route Stops */}
              {allStops.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800 mb-3">Route Details</h4>
                  {allStops.map(renderStop)}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Truck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No scheduled stops for this date</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
