import { useState, useEffect, useCallback } from 'react'
import { Grid } from 'react-window'

export default function VirtualizedItemGrid({ items, onItemClick }) {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  })

  // Track window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Calculate grid dimensions based on window size
  const getGridDimensions = () => {
    const containerWidth = Math.min(windowSize.width - 32, 1280) // max-w-7xl with padding

    // Responsive columns: 1 (mobile), 2 (tablet), 3 (desktop)
    let columnCount = 1
    if (windowSize.width >= 1024) {
      columnCount = 3 // lg breakpoint
    } else if (windowSize.width >= 768) {
      columnCount = 2 // md breakpoint
    }

    // Calculate column width with gaps
    const gap = 24 // gap-6 in Tailwind
    const columnWidth = (containerWidth - (gap * (columnCount - 1))) / columnCount

    // Item height: image (~220px) + content (~180px) + padding
    const rowHeight = 420

    // Calculate row count
    const rowCount = Math.ceil(items.length / columnCount)

    // Grid height: show up to 2 rows initially, then allow scrolling
    const maxVisibleRows = 2
    const gridHeight = Math.min(rowCount * rowHeight, maxVisibleRows * rowHeight + 100)

    return {
      columnCount,
      columnWidth,
      rowHeight,
      rowCount,
      gridHeight
    }
  }

  const { columnCount, columnWidth, rowHeight, rowCount, gridHeight } = getGridDimensions()

  // Cell renderer for react-window v2.x API
  const Cell = useCallback(({ columnIndex, rowIndex, style }) => {
    const itemIndex = rowIndex * columnCount + columnIndex

    // Return empty cell if index is out of bounds
    if (itemIndex >= items.length) {
      return <div style={style} />
    }

    const item = items[itemIndex]

    // Get image URL - prefer thumbnail, fallback to first photo, then item.image_url for scraped partners
    const imageUrl = item.photos?.find(p => p.is_thumbnail)?.image_url
                    || item.photos?.[0]?.image_url
                    || item.image_url

    return (
      <div style={{...style, padding: '12px'}}>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow h-full">
          <div className="aspect-video bg-gray-200 relative">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={item.name}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            )}
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-lg text-gray-800 mb-2">{item.name}</h3>
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl font-bold text-gray-900">
                ${parseFloat(item.base_price).toFixed(2)}
              </span>
              <span className="text-sm text-gray-500">{item.category}</span>
            </div>
            <button
              onClick={() => onItemClick(item)}
              className="w-full bg-yellow-400 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition-colors"
            >
              View Details & Add to Cart
            </button>
          </div>
        </div>
      </div>
    )
  }, [items, columnCount, onItemClick])

  // Cell props to pass to each cell (required by react-window v2.x)
  const cellProps = {
    items,
    onItemClick
  }

  // If no items, show empty state
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No items found matching your filters.
      </div>
    )
  }

  return (
    <div>
      <Grid
        cellComponent={Cell}
        cellProps={cellProps}
        columnCount={columnCount}
        columnWidth={columnWidth}
        height={gridHeight}
        rowCount={rowCount}
        rowHeight={rowHeight}
        style={{
          margin: '0 auto',
          overflowX: 'hidden',
          width: Math.min(windowSize.width - 32, 1280)
        }}
      />
    </div>
  )
}
