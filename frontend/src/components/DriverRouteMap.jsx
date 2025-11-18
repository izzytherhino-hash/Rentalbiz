import React, { useEffect, useRef, useMemo } from 'react'

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
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const routeLineRef = useRef(null)

  // Process stops to extract coordinates
  const processedStops = useMemo(() => {
    return stops
      .map(stop => {
        let lat, lng, location

        // Determine location label based on stop type
        if (stop.type === 'delivery' || stop.type === 'pickup') {
          location = stop.customer_name
          if (stop.delivery_lat && stop.delivery_lng) {
            lat = parseFloat(stop.delivery_lat)
            lng = parseFloat(stop.delivery_lng)
          }
        } else if (stop.type === 'warehouse_pickup') {
          location = 'Pick up'
          lat = parseFloat(stop.delivery_lat)
          lng = parseFloat(stop.delivery_lng)
        } else if (stop.type === 'warehouse_return') {
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

  // Calculate center point for the map
  const mapCenter = useMemo(() => {
    if (processedStops.length === 0) {
      return { lat: 33.6595, lng: -117.9 } // Default to Orange County
    }

    const avgLat = processedStops.reduce((sum, stop) => sum + stop.lat, 0) / processedStops.length
    const avgLng = processedStops.reduce((sum, stop) => sum + stop.lng, 0) / processedStops.length

    return { lat: avgLat, lng: avgLng }
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

      // Initialize map
      const map = new window.H.Map(
        mapRef.current,
        defaultLayers.vector.normal.map,
        {
          center: mapCenter,
          zoom: mapZoom,
          pixelRatio: window.devicePixelRatio || 1
        }
      )

      // Enable map interactions
      const behavior = new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(map))
      const ui = window.H.ui.UI.createDefault(map, defaultLayers)

      mapInstanceRef.current = map

      // Clear existing markers and route
      markersRef.current.forEach(marker => map.removeObject(marker))
      markersRef.current = []
      if (routeLineRef.current) {
        map.removeObject(routeLineRef.current)
        routeLineRef.current = null
      }

      // Draw route line if we have multiple stops
      if (processedStops.length > 1) {
        const lineString = new window.H.geo.LineString()
        processedStops.forEach(stop => {
          lineString.pushPoint({ lat: stop.lat, lng: stop.lng })
        })

        const routeLine = new window.H.map.Polyline(lineString, {
          style: {
            strokeColor: '#F59E0B',
            lineWidth: 4,
            lineDash: [0, 2],
            lineTailCap: 'arrow-tail',
            lineHeadCap: 'arrow-head'
          }
        })

        map.addObject(routeLine)
        routeLineRef.current = routeLine
      }

      // Add stop markers
      processedStops.forEach((stop, idx) => {
        const color = getStopColor(stop.type)
        const isCompleted = stop.completed

        // Create numbered marker with background color
        const markerHTML = `
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
              ${isCompleted ? '✓' : stop.stopNumber}
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
        `

        const icon = new window.H.map.DomIcon(markerHTML)
        const marker = new window.H.map.DomMarker({ lat: stop.lat, lng: stop.lng }, { icon })

        // Create info bubble content
        const bubbleContent = createBubbleContent(stop)
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

      // Fit map to show all markers
      if (processedStops.length > 0) {
        const group = new window.H.map.Group()
        processedStops.forEach(stop => {
          group.addObject(new window.H.map.Marker({ lat: stop.lat, lng: stop.lng }))
        })
        map.getViewModel().setLookAtData({ bounds: group.getBoundingBox() })
      }
    }

    function createBubbleContent(stop) {
      const items = stop.items && stop.items.length > 0 ? `
        <div style="margin-bottom: 8px;">
          <p style="font-size: 12px; font-weight: 600; margin-bottom: 4px;">Items (${stop.items.length}):</p>
          <ul style="font-size: 12px; margin: 0; padding-left: 0; list-style: none;">
            ${stop.items.slice(0, 3).map(item => `
              <li style="display: flex; align-items: start; margin-bottom: 4px;">
                <span style="width: 6px; height: 6px; background: #FBBF24; border-radius: 50%; margin-right: 6px; margin-top: 4px; flex-shrink: 0;"></span>
                <span style="flex: 1;">${item.name}</span>
              </li>
            `).join('')}
            ${stop.items.length > 3 ? `<li style="color: #6b7280; font-size: 12px;">+${stop.items.length - 3} more...</li>` : ''}
          </ul>
        </div>
      ` : ''

      const earnings = stop.type === 'delivery' && stop.booking ? `
        <div style="padding-top: 8px; border-top: 1px solid #e5e7eb;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span style="color: #6b7280;">Delivery Fee:</span>
            <span style="font-weight: 500;">$${stop.booking.delivery_fee || 0}</span>
          </div>
          ${stop.booking.driver_tip > 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <span style="color: #6b7280;">Tip:</span>
              <span style="font-weight: 500; color: #D97706;">$${stop.booking.driver_tip}</span>
            </div>
          ` : ''}
        </div>
      ` : ''

      const address = stop.address || stop.warehouse?.address
      return `
        <div style="min-width: 250px; padding: 4px;">
          <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <h3 style="font-weight: bold; font-size: 16px; margin: 0;">Stop #${stop.stopNumber}</h3>
              ${stop.completed ? '<span style="font-size: 12px; background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 9999px;">✓ Complete</span>' : ''}
            </div>
            <p style="font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; color: ${getStopColor(stop.type)}; margin: 0;">
              ${getStopTypeLabel(stop.type)}
            </p>
          </div>

          <div style="margin-bottom: 8px;">
            <p style="font-weight: 600; font-size: 14px; margin: 0 0 4px 0;">${stop.location}</p>
            <p style="font-size: 12px; color: #6b7280; margin: 0;">${address}</p>
          </div>

          ${stop.booking ? `
            <div style="margin-bottom: 8px; font-size: 12px;">
              ${stop.booking.customer_name ? `<p style="margin: 0 0 4px 0;"><strong>Customer:</strong> ${stop.booking.customer_name}</p>` : ''}
              ${stop.booking.order_number ? `<p style="margin: 0 0 4px 0;"><strong>Order:</strong> ${stop.booking.order_number}</p>` : ''}
              ${stop.booking.time_window ? `<p style="margin: 0;"><strong>Time:</strong> ${stop.booking.time_window}</p>` : ''}
            </div>
          ` : ''}

          ${items}
          ${earnings}

          <button
            onclick="window.open('https://wego.here.com/directions/mix/?map=0,0,0&dest=${encodeURIComponent(address)}', '_blank')"
            style="
              width: 100%;
              margin-top: 12px;
              padding: 8px;
              background: #FBBF24;
              color: #1F2937;
              font-size: 12px;
              font-weight: 500;
              border: none;
              border-radius: 4px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              cursor: pointer;
              transition: background 0.2s;
            "
            onmouseover="this.style.background='#F59E0B'"
            onmouseout="this.style.background='#FBBF24'"
          >
            Navigate →
          </button>
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
  }, [processedStops, mapCenter, mapZoom])

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
      <div
        ref={mapRef}
        style={{ height: '100%', width: '100%', minHeight: '400px' }}
        className="rounded-lg shadow-md"
      />
    </div>
  )
}

export default DriverRouteMap
