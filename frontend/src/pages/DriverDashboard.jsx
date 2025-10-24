import { useState, useEffect } from 'react'
import { MapPin, Phone, Navigation, CheckCircle, Package, Clock, User, ArrowLeft, Warehouse, AlertCircle } from 'lucide-react'
import { driverAPI } from '../services/api'

export default function DriverDashboard() {
  const [drivers, setDrivers] = useState([])
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [route, setRoute] = useState(null)
  const [stops, setStops] = useState([])
  const [expandedStop, setExpandedStop] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch drivers list on mount
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const driversList = await driverAPI.listDrivers()
        setDrivers(driversList)
      } catch (err) {
        setError('Failed to load drivers list')
        console.error('Error fetching drivers:', err)
      }
    }
    fetchDrivers()
  }, [])

  // Fetch route when driver or date changes
  useEffect(() => {
    if (selectedDriver) {
      fetchRoute()
    }
  }, [selectedDriver, selectedDate])

  const fetchRoute = async () => {
    if (!selectedDriver) return

    setLoading(true)
    setError(null)
    try {
      const routeData = await driverAPI.getDriverRoute(selectedDriver.driver_id, selectedDate)
      setRoute(routeData)

      // Combine all stops into a single array with proper ordering
      const allStops = [
        ...(routeData.warehouse_pickups || []).map((stop, idx) => ({ ...stop, stopNumber: idx + 1 })),
        ...(routeData.deliveries || []).map((stop, idx) => ({ ...stop, stopNumber: (routeData.warehouse_pickups?.length || 0) + idx + 1 })),
        ...(routeData.pickups || []).map((stop, idx) => ({ ...stop, stopNumber: (routeData.warehouse_pickups?.length || 0) + (routeData.deliveries?.length || 0) + idx + 1 })),
        ...(routeData.warehouse_returns || []).map((stop, idx) => ({ ...stop, stopNumber: (routeData.warehouse_pickups?.length || 0) + (routeData.deliveries?.length || 0) + (routeData.pickups?.length || 0) + idx + 1 })),
      ]
      setStops(allStops)
    } catch (err) {
      setError('Failed to load route for this date')
      console.error('Error fetching route:', err)
      setStops([])
    } finally {
      setLoading(false)
    }
  }

  const totalStops = stops.length
  const completedStops = stops.filter(s => s.completed).length

  // Calculate earnings from delivery fees and tips
  const deliveryFees = stops
    .filter(s => s.type === 'delivery')
    .reduce((sum, s) => sum + ((s.booking || {}).delivery_fee || 0), 0)

  const tips = stops
    .filter(s => s.type === 'delivery')
    .reduce((sum, s) => sum + ((s.booking || {}).driver_tip || 0), 0)

  const totalEarnings = deliveryFees + tips

  const handleCompleteStop = async (stop) => {
    setLoading(true)
    setError(null)

    try {
      // Determine movement type based on stop type
      let movementType
      if (stop.type === 'warehouse_pickup' || stop.type === 'pickup') {
        movementType = 'pickup'
      } else if (stop.type === 'delivery' || stop.type === 'warehouse_return') {
        movementType = 'delivery'
      }

      // Record movement for each item in the stop
      for (const item of stop.items || []) {
        const movementData = {
          item_id: item.item_id,
          driver_id: selectedDriver.driver_id,
          movement_type: movementType,
          quantity: item.quantity || 1,
          location: stop.address || stop.warehouse?.name,
          notes: `${stop.type} - ${stop.booking?.order_number || 'Warehouse transfer'}`
        }

        if (stop.booking?.booking_id) {
          movementData.booking_id = stop.booking.booking_id
        }

        await driverAPI.recordMovement(movementData)
      }

      // Update local state to mark as completed
      setStops(stops.map(s =>
        s === stop ? { ...s, completed: true } : s
      ))

      setExpandedStop(null)
    } catch (err) {
      setError('Failed to record movement. Please try again.')
      console.error('Error recording movement:', err)
    } finally {
      setLoading(false)
    }
  }

  const openNavigation = (address) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank')
  }

  const openFullRoute = () => {
    // Build Google Maps URL with all waypoints
    const addresses = stops
      .map(stop => stop.address || stop.warehouse?.address)
      .filter(Boolean)

    if (addresses.length === 0) return

    // Google Maps URL format: origin → waypoints → destination
    const origin = encodeURIComponent(addresses[0])
    const destination = encodeURIComponent(addresses[addresses.length - 1])
    const waypoints = addresses
      .slice(1, -1)
      .map(addr => encodeURIComponent(addr))
      .join('|')

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`
    if (waypoints) {
      url += `&waypoints=${waypoints}`
    }

    window.open(url, '_blank')
  }

  const callCustomer = (phone) => {
    window.location.href = `tel:${phone}`
  }

  const getStopTypeLabel = (type) => {
    const labels = {
      'warehouse_pickup': 'Warehouse Pickup',
      'delivery': 'Customer Delivery',
      'pickup': 'Customer Pickup',
      'warehouse_return': 'Warehouse Return'
    }
    return labels[type] || 'Stop'
  }

  const getStopColor = (type) => {
    const colors = {
      'warehouse_pickup': 'bg-blue-50 border-blue-300',
      'delivery': 'bg-yellow-50 border-yellow-300',
      'pickup': 'bg-purple-50 border-purple-300',
      'warehouse_return': 'bg-green-50 border-green-300'
    }
    return colors[type] || 'bg-gray-50 border-gray-300'
  }

  const getStopIcon = (type) => {
    const icons = {
      'warehouse_pickup': <Warehouse className="w-5 h-5 text-blue-600" />,
      'delivery': <Package className="w-5 h-5 text-yellow-600" />,
      'pickup': <Package className="w-5 h-5 text-purple-600" />,
      'warehouse_return': <Warehouse className="w-5 h-5 text-green-600" />
    }
    return icons[type] || <MapPin className="w-5 h-5" />
  }

  // Driver selection screen
  if (!selectedDriver) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-white" />
            </div>
            <h1 className="font-serif text-3xl font-light text-gray-800 mb-2">
              Driver Portal
            </h1>
            <p className="text-gray-600 text-sm">Select your name to view route</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {drivers.map(driver => (
              <button
                key={driver.driver_id}
                onClick={() => setSelectedDriver(driver)}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-400 hover:bg-yellow-50 transition text-left flex items-center"
              >
                <User className="w-5 h-5 text-gray-400 mr-3" />
                <span className="font-medium text-gray-800">{driver.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Route view
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedDriver(null)
                setStops([])
                setRoute(null)
              }}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="text-sm">Logout</span>
            </button>
            <div className="text-center flex-1">
              <h1 className="font-serif text-xl font-light text-gray-800">
                {selectedDriver.name}
              </h1>
              <div className="flex items-center justify-center gap-2 mt-1">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs text-gray-600 border border-gray-300 px-2 py-1 rounded focus:outline-none focus:border-yellow-400"
                />
                {stops.length > 0 && (
                  <button
                    onClick={openFullRoute}
                    className="text-xs bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-500 transition flex items-center gap-1"
                  >
                    <Navigation className="w-3 h-3" />
                    Show Route
                  </button>
                )}
              </div>
            </div>
            <div className="w-16"></div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-light text-gray-800">{totalStops}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Total Stops</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-light text-gray-800">{completedStops}/{totalStops}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Complete</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-light text-yellow-500">${totalEarnings.toFixed(2)}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Total Earnings</div>
            <div className="text-xs text-gray-400 mt-2">
              Fees: ${deliveryFees.toFixed(2)} | Tips: ${tips.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Google Maps Route Visualization */}
        {stops.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Route Map</h3>
              <button
                onClick={openFullRoute}
                className="text-xs text-yellow-600 hover:text-yellow-700 font-medium flex items-center gap-1"
              >
                <Navigation className="w-3 h-3" />
                Open in Maps
              </button>
            </div>
            <div className="relative" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={(() => {
                  const addresses = stops
                    .map(stop => stop.address || stop.warehouse?.address)
                    .filter(Boolean)
                  if (addresses.length === 0) return ''

                  const origin = encodeURIComponent(addresses[0])
                  const destination = encodeURIComponent(addresses[addresses.length - 1])
                  const waypoints = addresses
                    .slice(1, -1)
                    .map(addr => encodeURIComponent(addr))
                    .join('|')

                  let url = `https://www.google.com/maps/embed/v1/directions?key=AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw&origin=${origin}&destination=${destination}`
                  if (waypoints) {
                    url += `&waypoints=${waypoints}`
                  }
                  return url
                })()}
                className="absolute top-0 left-0 w-full h-full border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && stops.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading route...</p>
          </div>
        )}

        {/* No stops message */}
        {!loading && stops.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No stops scheduled for this date</p>
          </div>
        )}

        {/* Route stops */}
        {stops.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-4">
              Route Stops ({stops.length})
            </h2>

            {stops.map((stop) => {
              // Check if this is a warehouse pickup with items that have next bookings
              const hasNextBookings = stop.type === 'warehouse_pickup' && stop.items?.some(item => item.next_booking)

              return (
                <div
                  key={`${stop.type}-${stop.stopNumber}`}
                  className={`bg-white rounded-lg border-2 overflow-hidden transition ${
                    stop.completed
                      ? 'border-gray-300 opacity-60'
                      : getStopColor(stop.type)
                  }`}
                >
                  {/* Already Booked Warning for Warehouse Pickups */}
                  {hasNextBookings && !stop.completed && (
                    <div className="bg-purple-600 text-white px-4 py-2 text-xs font-medium flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      ALREADY BOOKED! Items need to go directly to next customer
                    </div>
                  )}

                  <div
                    onClick={() => setExpandedStop(expandedStop === stop.stopNumber ? null : stop.stopNumber)}
                    className="p-4 cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start flex-1">
                        <div className="w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center font-bold mr-3 flex-shrink-0">
                          {stop.stopNumber}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            {getStopIcon(stop.type)}
                            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide ml-2">
                              {getStopTypeLabel(stop.type)}
                            </span>
                          </div>
                          <h3 className="font-medium text-gray-800">
                            {stop.warehouse?.name || stop.booking?.customer_name || 'Unknown'}
                          </h3>
                          {stop.booking?.order_number && (
                            <p className="text-xs text-gray-500 mt-1">Order {stop.booking.order_number}</p>
                          )}
                        </div>
                      </div>
                      {stop.completed && (
                        <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                      )}
                    </div>

                  {stop.booking?.time_window && (
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>{stop.booking.time_window}</span>
                    </div>
                  )}

                  <div className="flex items-start text-sm text-gray-700 mb-3">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{stop.address || stop.warehouse?.address || 'Address not available'}</span>
                  </div>

                  {stop.type === 'delivery' && stop.booking && (
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div className="flex items-center text-sm">
                        <Package className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="text-gray-600">{stop.items?.length || 0} items</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600 mr-3">Fee: ${stop.booking.delivery_fee || 0}</span>
                        <span className="text-sm font-medium text-yellow-600">Tip: ${stop.booking.driver_tip || 0}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded details */}
                {expandedStop === stop.stopNumber && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
                    {/* Items list */}
                    {stop.items && stop.items.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                          Items
                        </h4>
                        <ul className="space-y-2">
                          {stop.items.map((item, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start bg-white rounded p-2">
                              <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                              <div className="flex-1">
                                <div>{item.name}</div>
                                {item.quantity > 1 && (
                                  <div className="text-xs text-gray-500 mt-0.5">Quantity: {item.quantity}</div>
                                )}
                                {item.next_booking && (
                                  <div className="text-xs text-purple-600 mt-0.5">
                                    Booked for {new Date(item.next_booking.delivery_date).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Instructions */}
                    {stop.booking?.notes && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                          Instructions
                        </h4>
                        <div className="text-sm p-3 rounded border bg-yellow-50 border-yellow-200 text-gray-700">
                          {stop.booking.notes}
                        </div>
                      </div>
                    )}

                    {/* Critical return instructions for items with next booking */}
                    {stop.type === 'pickup' && stop.items?.some(item => item.next_booking) && (
                      <div className="p-3 rounded border bg-red-50 border-red-300">
                        <div className="flex items-start mb-2">
                          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-red-600" />
                          <h4 className="text-xs font-medium text-red-800 uppercase tracking-wide">
                            CRITICAL: Return Instructions
                          </h4>
                        </div>
                        <div className="text-sm text-red-800">
                          Some items are already booked. Return to the correct warehouse shown in the next stop.
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {stop.booking?.customer_phone && (
                        <button
                          onClick={() => callCustomer(stop.booking.customer_phone)}
                          className="flex items-center justify-center py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-yellow-400 transition"
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          <span className="text-sm font-medium">Call</span>
                        </button>
                      )}
                      <button
                        onClick={() => openNavigation(stop.address || stop.warehouse?.address)}
                        className={`flex items-center justify-center py-3 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 transition ${!stop.booking?.customer_phone ? 'col-span-2' : ''}`}
                      >
                        <Navigation className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">Navigate</span>
                      </button>
                    </div>

                    {/* Complete button */}
                    {!stop.completed ? (
                      <button
                        onClick={() => handleCompleteStop(stop)}
                        disabled={loading}
                        className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:bg-gray-300 transition flex items-center justify-center"
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        {loading ? 'Recording...' : 'Mark as Complete'}
                      </button>
                    ) : (
                      <div className="flex items-center justify-center py-3 bg-green-100 text-green-700 rounded-lg">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        <span className="font-medium">Completed</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
            })}
          </div>
        )}

        {/* Route complete message */}
        {completedStops === totalStops && totalStops > 0 && (
          <div className="bg-yellow-400 text-white rounded-lg p-6 mt-6 text-center">
            <h3 className="font-serif text-2xl font-light mb-2">
              Route Complete!
            </h3>
            <p className="mb-4">All stops finished for today</p>
            <div className="text-3xl font-light mb-2">${totalEarnings}</div>
            <p className="text-sm opacity-90">Total Earnings Today</p>
          </div>
        )}
      </div>
    </div>
  )
}
