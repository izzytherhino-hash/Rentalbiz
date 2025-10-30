import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function PaginatedItemGrid({ items, onItemClick, currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) {
  // Get image URL with fallback for scraped partner inventory
  const getImageUrl = (item) => {
    return item.photos?.find(p => p.is_thumbnail)?.image_url
           || item.photos?.[0]?.image_url
           || item.image_url
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No items found matching your filters.
      </div>
    )
  }

  return (
    <div>
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {items.map((item) => {
          const imageUrl = getImageUrl(item)

          return (
            <div
              key={item.inventory_item_id}
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onItemClick(item)}
            >
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
                  onClick={(e) => {
                    e.stopPropagation()
                    onItemClick(item)
                  }}
                  className="w-full bg-yellow-400 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition-colors"
                >
                  View Details & Add to Cart
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-4">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm transition ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, idx) => (
                <button
                  key={`page-${idx + 1}`}
                  onClick={() => onPageChange(idx + 1)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    currentPage === idx + 1
                      ? 'bg-yellow-400 text-gray-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm transition ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
