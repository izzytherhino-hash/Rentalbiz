import React, { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'

// Fix Leaflet default marker icon issue with Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Create numbered marker with background color
const createNumberedMarker = (number, color, isCompleted) => {
  return new L.DivIcon({
    html: `
      <div style="position: relative;">
        <div style="
          width: 36px;
          height: 36px;
          background: ${isCompleted ? '#10B981' : color};
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: bold;
          color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          ${isCompleted ? '✓' : number}
        </div>
        <div style="
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid ${isCompleted ? '#10B981' : color};
          filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));
        "></div>
      </div>
    `,
    className: '',
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  })
}

const getStopColor = (type) => {
  const colors = {
    'warehouse_pickup': '#3B82F6',    // Blue
    'delivery': '#F59E0B',             // Amber/Yellow
    'pickup': '#8B5CF6',               // Purple
    'warehouse_return': '#10B981'      // Green
  }
  return colors[type] || '#6B7280'
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

const DriverRouteMap = ({ stops = [] }) => {
  // Process stops to extract coordinates
  const processedStops = useMemo(() => {
    return stops
      .map(stop => {
        // Try to extract coordinates from address or warehouse
        let lat, lng, location

        // Determine location label based on stop type
        if (stop.type === 'delivery' || stop.type === 'pickup') {
          // Customer stops - use customer name
          location = stop.customer_name
          if (stop.delivery_lat && stop.delivery_lng) {
            lat = parseFloat(stop.delivery_lat)
            lng = parseFloat(stop.delivery_lng)
          }
        } else if (stop.type === 'warehouse_pickup') {
          // Warehouse pickup - say "Pick up"
          location = 'Pick up'
          lat = parseFloat(stop.delivery_lat)
          lng = parseFloat(stop.delivery_lng)
        } else if (stop.type === 'warehouse_return') {
          // Warehouse return - say "Drop off"
          location = 'Drop off'
          lat = parseFloat(stop.delivery_lat)
          lng = parseFloat(stop.delivery_lng)
        }

        if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
          return {
            ...stop,
            lat,
            lng,
            location: location || 'Unknown location'
          }
        }
        return null
      })
      .filter(Boolean)
  }, [stops])

  // Calculate route polyline coordinates
  const routeCoordinates = useMemo(() => {
    return processedStops.map(stop => [stop.lat, stop.lng])
  }, [processedStops])

  // Calculate center point for the map
  const mapCenter = useMemo(() => {
    if (processedStops.length === 0) {
      return [33.6595, -117.9] // Default to Orange County
    }

    const avgLat = processedStops.reduce((sum, stop) => sum + stop.lat, 0) / processedStops.length
    const avgLng = processedStops.reduce((sum, stop) => sum + stop.lng, 0) / processedStops.length

    return [avgLat, avgLng]
  }, [processedStops])

  // Calculate appropriate zoom level based on stops spread
  const mapZoom = useMemo(() => {
    if (processedStops.length === 0) return 11

    const lats = processedStops.map(s => s.lat)
    const lngs = processedStops.map(s => s.lng)
    const latSpread = Math.max(...lats) - Math.min(...lats)
    const lngSpread = Math.max(...lngs) - Math.min(...lngs)
    const maxSpread = Math.max(latSpread, lngSpread)

    if (maxSpread > 1) return 9
    if (maxSpread > 0.5) return 10
    if (maxSpread > 0.2) return 11
    if (maxSpread > 0.1) return 12
    return 13
  }, [processedStops])

  if (processedStops.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <p className="text-gray-600">No route coordinates available</p>
        <p className="text-sm text-gray-500 mt-2">
          Coordinates need to be added to stop data
        </p>
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%', minHeight: '400px' }}
        className="rounded-lg shadow-md"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Stop markers */}
        {processedStops.map((stop, idx) => (
          <Marker
            key={`stop-${stop.stopNumber}`}
            position={[stop.lat, stop.lng]}
            icon={createNumberedMarker(
              stop.stopNumber,
              getStopColor(stop.type),
              stop.completed
            )}
          >
            <Popup maxWidth={300}>
              <div className="min-w-[250px]">
                {/* Header */}
                <div className="mb-2 pb-2 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-base">Stop #{stop.stopNumber}</h3>
                    {stop.completed && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                        ✓ Complete
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: getStopColor(stop.type) }}>
                    {getStopTypeLabel(stop.type)}
                  </p>
                </div>

                {/* Location */}
                <div className="mb-2">
                  <p className="font-semibold text-sm">{stop.location}</p>
                  <p className="text-xs text-gray-600 mt-1">{stop.address || stop.warehouse?.address}</p>
                </div>

                {/* Customer/Order Info */}
                {stop.booking && (
                  <div className="mb-2 text-xs">
                    {stop.booking.customer_name && (
                      <p><strong>Customer:</strong> {stop.booking.customer_name}</p>
                    )}
                    {stop.booking.order_number && (
                      <p><strong>Order:</strong> {stop.booking.order_number}</p>
                    )}
                    {stop.booking.time_window && (
                      <p><strong>Time:</strong> {stop.booking.time_window}</p>
                    )}
                  </div>
                )}

                {/* Items */}
                {stop.items && stop.items.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold mb-1">Items ({stop.items.length}):</p>
                    <ul className="text-xs space-y-1">
                      {stop.items.slice(0, 3).map((item, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full mr-1.5 mt-1 flex-shrink-0"></span>
                          <span className="flex-1">{item.name}</span>
                        </li>
                      ))}
                      {stop.items.length > 3 && (
                        <li className="text-gray-500">+{stop.items.length - 3} more...</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Earnings (for deliveries) */}
                {stop.type === 'delivery' && stop.booking && (
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Delivery Fee:</span>
                      <span className="font-medium">${stop.booking.delivery_fee || 0}</span>
                    </div>
                    {stop.booking.driver_tip > 0 && (
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-gray-600">Tip:</span>
                        <span className="font-medium text-yellow-600">${stop.booking.driver_tip}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation button */}
                <button
                  onClick={() => {
                    const address = stop.address || stop.warehouse?.address
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank')
                  }}
                  className="w-full mt-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 text-xs font-medium rounded uppercase tracking-wide transition"
                >
                  Navigate →
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

export default DriverRouteMap
