import React, { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

// Fix Leaflet default marker icon issue with Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Create custom colored marker icons for different statuses
const createColoredIcon = (color) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })
}

// Create marker with count badge
const createMarkerWithCount = (color, count) => {
  if (count <= 1) {
    return createColoredIcon(color)
  }

  return new L.DivIcon({
    html: `
      <div style="position: relative;">
        <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png"
             style="width: 25px; height: 41px;" />
        <div style="position: absolute; top: -8px; right: -8px; background: #EF4444; color: white;
                    border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center;
                    justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white;">
          ${count}
        </div>
      </div>
    `,
    className: '',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  })
}

const statusIcons = {
  available: createColoredIcon('green'),   // 🟢 Available at warehouse
  rented: createColoredIcon('red'),        // 🔴 Rented (at customer)
  maintenance: createColoredIcon('grey'),  // ⚫ In maintenance
  retired: createColoredIcon('black'),     // ⚫ Retired
}

const InventoryMap = ({ inventory = [], warehouses = [], bookings = [] }) => {
  // Calculate item locations and group by coordinates
  const itemLocations = useMemo(() => {
    const locationMap = new Map()

    inventory.forEach(item => {
      let lat, lng, location, status

      // Find if this item is in any active booking
      const activeBooking = bookings.find(booking =>
        booking.booking_items?.some(bi => bi.inventory_item_id === item.inventory_item_id) &&
        (booking.status === 'active' || booking.status === 'confirmed' || booking.status === 'out_for_delivery')
      )

      if (activeBooking && activeBooking.delivery_lat && activeBooking.delivery_lng) {
        // Item is in active booking - show at customer location
        lat = parseFloat(activeBooking.delivery_lat)
        lng = parseFloat(activeBooking.delivery_lng)
        location = activeBooking.delivery_address
        status = 'rented'
      }

      // If not in active booking, show at current warehouse
      if (!lat || !lng) {
        const warehouse = warehouses.find(w => w.warehouse_id === item.current_warehouse_id)
        if (warehouse && warehouse.address_lat && warehouse.address_lng) {
          lat = parseFloat(warehouse.address_lat)
          lng = parseFloat(warehouse.address_lng)
          location = warehouse.name
          status = item.status
        }
      }

      // Only add location if we have valid coordinates
      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        // Get thumbnail photo
        const thumbnail = item.photos?.find(p => p.is_thumbnail) || item.photos?.[0]

        // Prepend backend URL for uploaded photos (keep external URLs as-is)
        const thumbnailUrl = thumbnail?.image_url
          ? (thumbnail.image_url.startsWith('http')
              ? thumbnail.image_url
              : `http://localhost:8000${thumbnail.image_url}`)
          : null

        // Create a unique key for this location
        const locationKey = `${lat},${lng}`

        // Group items by location
        if (!locationMap.has(locationKey)) {
          locationMap.set(locationKey, {
            lat,
            lng,
            location,
            items: []
          })
        }

        locationMap.get(locationKey).items.push({
          id: item.inventory_item_id,
          name: item.name,
          status,
          category: item.category,
          base_price: item.base_price,
          thumbnail: thumbnailUrl,
        })
      }
    })

    // Convert map to array
    return Array.from(locationMap.values())
  }, [inventory, warehouses, bookings])

  // Group warehouses by location
  const warehouseLocations = useMemo(() => {
    const locationMap = new Map()

    warehouses.forEach(warehouse => {
      const lat = parseFloat(warehouse.address_lat)
      const lng = parseFloat(warehouse.address_lng)

      if (!isNaN(lat) && !isNaN(lng)) {
        // Get items in this warehouse (from filtered inventory)
        const warehouseItems = inventory.filter(i => i.current_warehouse_id === warehouse.warehouse_id)

        // Skip warehouses with no items after filtering
        if (warehouseItems.length === 0) {
          return
        }

        const locationKey = `${lat},${lng}`

        if (!locationMap.has(locationKey)) {
          locationMap.set(locationKey, {
            lat,
            lng,
            warehouses: [],
            items: []
          })
        }

        locationMap.get(locationKey).warehouses.push({
          id: warehouse.warehouse_id,
          name: warehouse.name,
          address: warehouse.address,
          itemCount: warehouseItems.length
        })

        // Add items with their details
        warehouseItems.forEach(item => {
          const thumbnail = item.photos?.find(p => p.is_thumbnail) || item.photos?.[0]
          const thumbnailUrl = thumbnail?.image_url
            ? (thumbnail.image_url.startsWith('http')
                ? thumbnail.image_url
                : `http://localhost:8000${thumbnail.image_url}`)
            : null

          locationMap.get(locationKey).items.push({
            id: item.inventory_item_id,
            name: item.name,
            status: item.status,
            category: item.category,
            base_price: item.base_price,
            thumbnail: thumbnailUrl,
            warehouseName: warehouse.name
          })
        })
      }
    })

    return Array.from(locationMap.values())
  }, [warehouses, inventory])

  // Center map on Orange County, CA (between Santa Ana and Newport Beach)
  const center = [33.6595, -117.9]
  const zoom = 11

  return (
    <div className="w-full h-full">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', minHeight: '600px' }}
        className="rounded-lg shadow-md"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {itemLocations.map((location) => {
          // Determine icon color based on the statuses of items at this location
          const hasAvailable = location.items.some(item => item.status === 'available')
          const hasRented = location.items.some(item => item.status === 'rented')
          const markerColor = hasRented ? 'red' : hasAvailable ? 'green' : 'grey'

          return (
            <Marker
              key={`item-${location.lat}-${location.lng}-${location.items.length}`}
              position={[location.lat, location.lng]}
              icon={createMarkerWithCount(markerColor, location.items.length)}
            >
              <Popup maxWidth={300}>
                <div className="min-w-[250px] max-w-[300px]">
                  {/* Location Header */}
                  <div className="mb-2 pb-2 border-b border-gray-200">
                    <h3 className="font-bold text-base">{location.location}</h3>
                    <p className="text-xs text-gray-600">{location.items.length} item{location.items.length > 1 ? 's' : ''} at this location</p>
                  </div>

                  {/* List all items at this location */}
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {location.items.map((item, itemIdx) => (
                      <div key={item.id} className={`${itemIdx > 0 ? 'pt-3 border-t border-gray-100' : ''}`}>
                        {/* Thumbnail Image */}
                        {item.thumbnail && (
                          <div className="w-full h-24 bg-gray-100 mb-2 flex items-center justify-center rounded">
                            <img
                              src={item.thumbnail}
                              alt={item.name}
                              className="w-full h-full object-cover rounded"
                              onError={(e) => {
                                console.error('Map marker image failed to load:', item.thumbnail)
                                e.target.style.display = 'none'
                              }}
                              loading="lazy"
                            />
                          </div>
                        )}

                        <div>
                          <h4 className="font-semibold text-sm mb-1">{item.name}</h4>
                          <div className="text-xs space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                item.status === 'available' ? 'bg-green-100 text-green-800' :
                                item.status === 'rented' ? 'bg-red-100 text-red-800' :
                                item.status === 'maintenance' ? 'bg-gray-100 text-gray-800' :
                                'bg-black text-white'
                              }`}>
                                {item.status.toUpperCase()}
                              </span>
                            </div>
                            <p><strong>Category:</strong> {item.category}</p>
                            <p><strong>Price:</strong> ${parseFloat(item.base_price).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Add warehouse markers */}
        {warehouseLocations.map((location) => (
          <Marker
            key={`warehouse-${location.lat}-${location.lng}-${location.items.length}`}
            position={[location.lat, location.lng]}
            icon={createMarkerWithCount('blue', location.items.length)}
          >
            <Popup maxWidth={300}>
              <div className="min-w-[250px] max-w-[300px]">
                {/* Location Header */}
                <div className="mb-2 pb-2 border-b border-gray-200">
                  <h3 className="font-bold text-base">
                    {location.warehouses.map(wh => wh.name).join(', ')}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {location.items.length} item{location.items.length > 1 ? 's' : ''} at this location
                  </p>
                </div>

                {/* List all items at this location */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {location.items.map((item, itemIdx) => (
                    <div key={item.id} className={`${itemIdx > 0 ? 'pt-3 border-t border-gray-100' : ''}`}>
                      {/* Thumbnail Image */}
                      {item.thumbnail && (
                        <div className="w-full h-24 bg-gray-100 mb-2 flex items-center justify-center rounded">
                          <img
                            src={item.thumbnail}
                            alt={item.name}
                            className="w-full h-full object-cover rounded"
                            onError={(e) => {
                              console.error('Map marker image failed to load:', item.thumbnail)
                              e.target.style.display = 'none'
                            }}
                            loading="lazy"
                          />
                        </div>
                      )}

                      <div>
                        <h4 className="font-semibold text-sm mb-1">{item.name}</h4>
                        <div className="text-xs space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              item.status === 'available' ? 'bg-green-100 text-green-800' :
                              item.status === 'rented' ? 'bg-red-100 text-red-800' :
                              item.status === 'maintenance' ? 'bg-gray-100 text-gray-800' :
                              'bg-black text-white'
                            }`}>
                              {item.status.toUpperCase()}
                            </span>
                          </div>
                          <p><strong>Category:</strong> {item.category}</p>
                          <p><strong>Price:</strong> ${parseFloat(item.base_price).toFixed(2)}</p>
                          {location.warehouses.length > 1 && (
                            <p><strong>Warehouse:</strong> {item.warehouseName}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

export default InventoryMap
