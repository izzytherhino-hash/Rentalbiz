import React, { useEffect, useRef, useMemo } from 'react'

const InventoryMap = ({ inventory = [], warehouses = [], bookings = [] }) => {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])

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

  useEffect(() => {
    if (!mapRef.current) return

    const HERE_API_KEY = import.meta.env.VITE_HERE_API_KEY

    if (!HERE_API_KEY || HERE_API_KEY === 'placeholder_here_api_key') {
      console.warn('HERE API key not configured')
      return
    }

    // Load HERE Maps script if not already loaded
    if (!window.H) {
      const script = document.createElement('script')
      script.src = 'https://js.api.here.com/v3/3.1/mapsjs-core.js'
      script.async = true
      script.onload = () => {
        // Load additional HERE Maps modules
        Promise.all([
          loadScript('https://js.api.here.com/v3/3.1/mapsjs-service.js'),
          loadScript('https://js.api.here.com/v3/3.1/mapsjs-ui.js'),
          loadScript('https://js.api.here.com/v3/3.1/mapsjs-mapevents.js'),
          loadCSS('https://js.api.here.com/v3/3.1/mapsjs-ui.css')
        ]).then(() => {
          initializeMap()
        })
      }
      document.head.appendChild(script)
    } else {
      initializeMap()
    }

    function loadScript(src) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = src
        script.async = true
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })
    }

    function loadCSS(href) {
      return new Promise((resolve) => {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = href
        link.onload = resolve
        document.head.appendChild(link)
      })
    }

    function initializeMap() {
      if (!window.H || mapInstanceRef.current) return

      // Initialize HERE platform
      const platform = new window.H.service.Platform({
        apikey: HERE_API_KEY
      })

      const defaultLayers = platform.createDefaultLayers()

      // Initialize map centered on Orange County, CA
      const map = new window.H.Map(
        mapRef.current,
        defaultLayers.vector.normal.map,
        {
          center: { lat: 33.6595, lng: -117.9 },
          zoom: 11,
          pixelRatio: window.devicePixelRatio || 1
        }
      )

      // Enable map interactions
      const behavior = new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(map))
      const ui = window.H.ui.UI.createDefault(map, defaultLayers)

      mapInstanceRef.current = map

      // Clear existing markers
      markersRef.current.forEach(marker => map.removeObject(marker))
      markersRef.current = []

      // Add item location markers
      itemLocations.forEach(location => {
        const hasAvailable = location.items.some(item => item.status === 'available')
        const hasRented = location.items.some(item => item.status === 'rented')
        const markerColor = hasRented ? '#EF4444' : hasAvailable ? '#10B981' : '#6B7280'

        // Create marker HTML with count badge
        const markerHTML = `
          <div style="position: relative;">
            <div style="
              width: 30px;
              height: 30px;
              background: ${markerColor};
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            "></div>
            ${location.items.length > 1 ? `
              <div style="
                position: absolute;
                top: -8px;
                right: -8px;
                background: #EF4444;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                border: 2px solid white;
              ">${location.items.length}</div>
            ` : ''}
          </div>
        `

        const icon = new window.H.map.DomIcon(markerHTML)
        const marker = new window.H.map.DomMarker({ lat: location.lat, lng: location.lng }, { icon })

        // Create info bubble content
        const bubbleContent = createBubbleContent(location, false)
        marker.setData(bubbleContent)

        marker.addEventListener('tap', function (evt) {
          const bubble = new window.H.ui.InfoBubble(evt.target.getGeometry(), {
            content: evt.target.getData()
          })
          ui.addBubble(bubble)
        })

        map.addObject(marker)
        markersRef.current.push(marker)
      })

      // Add warehouse location markers
      warehouseLocations.forEach(location => {
        const markerHTML = `
          <div style="position: relative;">
            <div style="
              width: 30px;
              height: 30px;
              background: #3B82F6;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            "></div>
            ${location.items.length > 1 ? `
              <div style="
                position: absolute;
                top: -8px;
                right: -8px;
                background: #EF4444;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                border: 2px solid white;
              ">${location.items.length}</div>
            ` : ''}
          </div>
        `

        const icon = new window.H.map.DomIcon(markerHTML)
        const marker = new window.H.map.DomMarker({ lat: location.lat, lng: location.lng }, { icon })

        const bubbleContent = createBubbleContent(location, true)
        marker.setData(bubbleContent)

        marker.addEventListener('tap', function (evt) {
          const bubble = new window.H.ui.InfoBubble(evt.target.getGeometry(), {
            content: evt.target.getData()
          })
          ui.addBubble(bubble)
        })

        map.addObject(marker)
        markersRef.current.push(marker)
      })
    }

    function createBubbleContent(location, isWarehouse) {
      const items = location.items.map((item, idx) => `
        <div style="${idx > 0 ? 'padding-top: 12px; border-top: 1px solid #e5e7eb;' : ''}">
          ${item.thumbnail ? `
            <div style="width: 100%; height: 96px; background: #f3f4f6; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">
              <img src="${item.thumbnail}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;" onerror="this.style.display='none'" loading="lazy" />
            </div>
          ` : ''}
          <div>
            <h4 style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${item.name}</h4>
            <div style="font-size: 12px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="padding: 2px 8px; font-size: 12px; border-radius: 9999px;
                  background: ${item.status === 'available' ? '#dcfce7' : item.status === 'rented' ? '#fee2e2' : item.status === 'maintenance' ? '#f3f4f6' : '#000'};
                  color: ${item.status === 'available' ? '#166534' : item.status === 'rented' ? '#991b1b' : item.status === 'maintenance' ? '#374151' : '#fff'};
                ">${item.status.toUpperCase()}</span>
              </div>
              <p><strong>Category:</strong> ${item.category}</p>
              <p><strong>Price:</strong> $${parseFloat(item.base_price).toFixed(2)}</p>
              ${isWarehouse && location.warehouses.length > 1 ? `<p><strong>Warehouse:</strong> ${item.warehouseName}</p>` : ''}
            </div>
          </div>
        </div>
      `).join('')

      return `
        <div style="min-width: 250px; max-width: 300px; padding: 8px;">
          <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;">
            <h3 style="font-weight: bold; font-size: 16px;">
              ${isWarehouse ? location.warehouses.map(wh => wh.name).join(', ') : location.location}
            </h3>
            <p style="font-size: 12px; color: #6b7280;">
              ${location.items.length} item${location.items.length > 1 ? 's' : ''} at this location
            </p>
          </div>
          <div style="max-height: 400px; overflow-y: auto;">
            ${items}
          </div>
        </div>
      `
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.dispose()
        mapInstanceRef.current = null
      }
    }
  }, [itemLocations, warehouseLocations])

  return (
    <div className="w-full h-full">
      <div
        ref={mapRef}
        style={{ height: '100%', width: '100%', minHeight: '600px' }}
        className="rounded-lg shadow-md"
      />
    </div>
  )
}

export default InventoryMap
