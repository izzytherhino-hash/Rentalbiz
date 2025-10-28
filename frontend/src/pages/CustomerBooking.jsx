import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ShoppingCart, X, Calendar, AlertCircle, Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react'
import { bookingAPI, inventoryAPI } from '../services/api'
import ItemAvailabilityCalendar from '../components/ItemAvailabilityCalendar'

export default function CustomerBooking() {
  const location = useLocation()
  const navigate = useNavigate()

  // Main state
  const [items, setItems] = useState([])
  const [cart, setCart] = useState([]) // Cart items: [{item, quantity}]
  const [selectedItem, setSelectedItem] = useState(null) // For modal
  const [modalDates, setModalDates] = useState({ delivery: null, pickup: null }) // Date selection in modal
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0) // Track current photo in modal

  // Booking flow state
  const [bookingStage, setBookingStage] = useState('browse') // 'browse', 'dates', 'customer', 'complete'
  const [deliveryDate, setDeliveryDate] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [availabilityChecked, setAvailabilityChecked] = useState(false)
  const [unavailableItems, setUnavailableItems] = useState([])

  // Customer info
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  })

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filterCategory, setFilterCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')

  // Google Maps refs
  const addressInputRef = useRef(null)
  const autocompleteRef = useRef(null)

  // Load items on mount
  useEffect(() => {
    loadItems()

    // Check URL params
    const params = new URLSearchParams(location.search)
    const categoryParam = params.get('category')
    const searchParam = params.get('search')

    if (categoryParam) setFilterCategory(categoryParam)
    if (searchParam) setSearchQuery(searchParam)
  }, [location.search])

  // Load Google Maps for address autocomplete
  useEffect(() => {
    if (bookingStage === 'customer' && addressInputRef.current && !autocompleteRef.current) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAEMxuTCLs_TfO_bqjC93vvMGPxNzZfp3U&libraries=places`
      script.async = true
      script.onload = () => {
        if (window.google && addressInputRef.current) {
          autocompleteRef.current = new window.google.maps.places.Autocomplete(
            addressInputRef.current,
            { types: ['address'] }
          )
        }
      }
      document.body.appendChild(script)
    }
  }, [bookingStage])

  const loadItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await inventoryAPI.listItems()
      setItems(data)
    } catch (err) {
      setError('Failed to load items')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort items
  const getFilteredItems = () => {
    let filtered = [...items]

    if (filterCategory !== 'all') {
      filtered = filtered.filter(item => item.category === filterCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
      )
    }

    filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'price') return parseFloat(a.base_price) - parseFloat(b.base_price)
      return 0
    })

    return filtered
  }

  // Cart functions
  const addToCart = (item, quantity = 1, dates = null) => {
    // Require dates when adding to cart
    if (!dates || !dates.delivery || !dates.pickup) {
      setError('Please select delivery and pickup dates first')
      return
    }

    const existing = cart.find(c => c.item.inventory_item_id === item.inventory_item_id)
    if (existing) {
      setCart(cart.map(c =>
        c.item.inventory_item_id === item.inventory_item_id
          ? { ...c, quantity: c.quantity + quantity, dates }
          : c
      ))
    } else {
      setCart([...cart, { item, quantity, dates }])
    }
    setSelectedItem(null)
    setModalDates({ delivery: null, pickup: null }) // Reset for next item
    setCurrentPhotoIndex(0) // Reset photo index
    setError(null)
  }

  // Photo navigation helpers
  const nextPhoto = () => {
    if (selectedItem && selectedItem.photos) {
      setCurrentPhotoIndex((prev) => (prev + 1) % selectedItem.photos.length)
    }
  }

  const prevPhoto = () => {
    if (selectedItem && selectedItem.photos) {
      setCurrentPhotoIndex((prev) =>
        prev === 0 ? selectedItem.photos.length - 1 : prev - 1
      )
    }
  }

  const removeFromCart = (itemId) => {
    setCart(cart.filter(c => c.item.inventory_item_id !== itemId))
  }

  const getCartTotal = () => {
    return cart.reduce((sum, c) => sum + (parseFloat(c.item.base_price) * c.quantity), 0)
  }

  // Proceed to checkout (skip date selection since dates are per-item now)
  const proceedToCheckout = () => {
    if (cart.length === 0) {
      setError('Please add items to your cart first')
      return
    }
    // Verify all cart items have dates
    const itemsWithoutDates = cart.filter(c => !c.dates || !c.dates.delivery || !c.dates.pickup)
    if (itemsWithoutDates.length > 0) {
      setError('All items must have rental dates selected')
      return
    }
    setBookingStage('customer')
    setError(null)
  }

  // Check availability for selected dates
  const checkAvailability = async () => {
    if (!deliveryDate || !pickupDate) {
      setError('Please select both delivery and pickup dates')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const itemIds = cart.map(c => c.item.inventory_item_id).filter(id => id != null)
      if (itemIds.length === 0) {
        setError('No valid items in cart')
        setLoading(false)
        return
      }
      const result = await bookingAPI.checkAvailability(itemIds, deliveryDate, pickupDate)

      // result.conflicts contains unavailable items
      const unavailable = result.conflicts || []
      setUnavailableItems(unavailable.map(c => c.inventory_item_id))
      setAvailabilityChecked(true)

      if (unavailable.length === cart.length) {
        setError('None of your cart items are available for these dates. Please choose different dates.')
      } else if (unavailable.length > 0) {
        setError(`${unavailable.length} item(s) unavailable for these dates. You can proceed with the available items.`)
      } else {
        setBookingStage('customer')
      }
    } catch (err) {
      setError('Failed to check availability')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Remove unavailable items and proceed
  const proceedWithAvailable = () => {
    setCart(cart.filter(c => !unavailableItems.includes(c.item.inventory_item_id)))
    setUnavailableItems([])
    setAvailabilityChecked(false)
    setBookingStage('customer')
    setError(null)
  }

  // Submit booking
  const submitBooking = async () => {
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone || !customerInfo.address) {
      setError('Please fill in all customer information')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Extract dates from cart items (all items should have the same rental period)
      const firstItemDates = cart[0]?.dates
      if (!firstItemDates || !firstItemDates.delivery || !firstItemDates.pickup) {
        setError('Invalid booking dates. Please try again.')
        setLoading(false)
        return
      }

      const bookingData = {
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        delivery_address: customerInfo.address,
        delivery_date: firstItemDates.delivery,
        pickup_date: firstItemDates.pickup,
        items: cart.map(c => ({
          inventory_item_id: c.item.inventory_item_id,
          quantity: c.quantity,
        })),
      }

      const result = await bookingAPI.createCustomerBooking(bookingData)

      // Navigate to confirmation
      navigate('/confirmation', { state: { booking: result } })
    } catch (err) {
      setError(err.message || 'Failed to create booking')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Get unique categories
  const categories = ['all', ...new Set(items.map(item => item.category).filter(Boolean))]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Cart */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-serif font-light text-gray-800">
            {bookingStage === 'browse' && 'Browse Equipment'}
            {bookingStage === 'dates' && 'Select Event Dates'}
            {bookingStage === 'customer' && 'Your Information'}
          </h1>

          <button
            onClick={() => setBookingStage(cart.length > 0 ? 'dates' : 'browse')}
            className="flex items-center gap-2 bg-yellow-400 text-gray-800 px-3 sm:px-4 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition-colors relative"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="hidden sm:inline">Cart ({cart.length})</span>
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {bookingStage === 'browse' && (
          <div>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search equipment..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  >
                    <option value="name">Name</option>
                    <option value="price">Price</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Items Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600">Loading equipment...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getFilteredItems().map(item => (
                  <div key={item.inventory_item_id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-video bg-gray-200 relative">
                      {item.photos?.[0]?.image_url && (
                        <img src={item.photos[0].image_url} alt={item.name} className="w-full h-full object-cover" />
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
                        onClick={() => {
                          setSelectedItem(item)
                          setCurrentPhotoIndex(0) // Reset photo index when opening modal
                        }}
                        className="w-full bg-yellow-400 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition-colors"
                      >
                        View Details & Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Book Items Button */}
            {cart.length > 0 && (
              <div className="fixed bottom-0 left-0 right-0 sm:bottom-6 sm:right-6 sm:left-auto z-50 px-4 sm:px-0 pb-4 sm:pb-0">
                <button
                  onClick={proceedToCheckout}
                  className="w-full sm:w-auto bg-yellow-400 text-gray-800 px-6 sm:px-8 py-4 rounded-lg sm:rounded-full font-bold text-base sm:text-lg shadow-lg hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2"
                >
                  Book {cart.length} Item{cart.length > 1 ? 's' : ''} (${getCartTotal().toFixed(2)})
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            )}
          </div>
        )}

        {bookingStage === 'customer' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Your Information</h2>

              {/* Booking Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  Delivery: {new Date(deliveryDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  Pickup: {new Date(pickupDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="font-bold text-lg text-gray-900">
                  Total: ${getCartTotal().toFixed(2)} for {cart.length} item{cart.length > 1 ? 's' : ''}
                </p>
              </div>

              {/* Customer Form */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
                  <input
                    ref={addressInputRef}
                    type="text"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="123 Main St, City, State ZIP"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={() => setBookingStage('dates')}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-yellow-400 transition-colors"
                >
                  Back
                </button>

                <button
                  onClick={submitBooking}
                  disabled={loading}
                  className="flex-1 bg-yellow-400 text-gray-800 px-6 py-3 rounded-lg font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Complete Booking'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-none sm:rounded-lg max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-800">{selectedItem.name}</h2>
              <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {selectedItem.photos && selectedItem.photos.length > 0 && (
                <div className="relative mb-6">
                  {/* Photo Carousel */}
                  <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={selectedItem.photos[currentPhotoIndex]?.image_url}
                      alt={`${selectedItem.name} - Photo ${currentPhotoIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Navigation Buttons - Only show if multiple photos */}
                  {selectedItem.photos.length > 1 && (
                    <>
                      <button
                        onClick={prevPhoto}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 shadow-lg transition-all"
                        aria-label="Previous photo"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-800" />
                      </button>
                      <button
                        onClick={nextPhoto}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 shadow-lg transition-all"
                        aria-label="Next photo"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-800" />
                      </button>
                    </>
                  )}

                  {/* Photo Indicators */}
                  {selectedItem.photos.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                      {selectedItem.photos.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentPhotoIndex(index)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === currentPhotoIndex
                              ? 'bg-yellow-400 w-6'
                              : 'bg-white bg-opacity-60 hover:bg-opacity-100'
                          }`}
                          aria-label={`View photo ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Photo Counter */}
                  {selectedItem.photos.length > 1 && (
                    <div className="absolute top-3 right-3 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {currentPhotoIndex + 1} / {selectedItem.photos.length}
                    </div>
                  )}
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-bold text-gray-900">
                    ${parseFloat(selectedItem.base_price).toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {selectedItem.category}
                  </span>
                </div>

                <p className="text-gray-700 mb-4">{selectedItem.description}</p>

                {selectedItem.dimensions && (
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Dimensions:</span> {selectedItem.dimensions}
                  </p>
                )}
              </div>

              {/* Availability Calendar */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Check Availability</h3>
                <div className="border border-gray-200 rounded-lg p-4">
                  <ItemAvailabilityCalendar
                    inventoryId={selectedItem.inventory_item_id}
                    onDateSelect={setModalDates}
                    selectedDates={modalDates}
                  />
                </div>
                {modalDates.delivery && modalDates.pickup && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      <span className="font-semibold">Selected Rental Period:</span>
                      <br />
                      Delivery: {new Date(modalDates.delivery).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      <br />
                      Pickup: {new Date(modalDates.pickup).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-4 mb-6">
                <label className="text-sm font-medium text-gray-700">Quantity:</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const qty = (selectedItem.tempQty || 1) - 1
                      setSelectedItem({ ...selectedItem, tempQty: Math.max(1, qty) })
                    }}
                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-semibold">{selectedItem.tempQty || 1}</span>
                  <button
                    onClick={() => {
                      const qty = (selectedItem.tempQty || 1) + 1
                      setSelectedItem({ ...selectedItem, tempQty: qty })
                    }}
                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={() => addToCart(selectedItem, selectedItem.tempQty || 1, modalDates)}
                disabled={!modalDates.delivery || !modalDates.pickup}
                className={`w-full px-6 py-3 rounded-lg font-bold text-lg transition-colors ${
                  modalDates.delivery && modalDates.pickup
                    ? 'bg-yellow-400 text-gray-800 hover:bg-yellow-500 cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {modalDates.delivery && modalDates.pickup
                  ? `Add to Cart - $${(parseFloat(selectedItem.base_price) * (selectedItem.tempQty || 1)).toFixed(2)}`
                  : 'Select dates first'}
              </button>

              {error && (
                <div className="mt-2 text-red-600 text-sm text-center">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
