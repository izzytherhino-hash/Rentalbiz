import { useState, useEffect, useRef } from 'react'
import { CheckCircle } from 'lucide-react'
import { bookingAPI, inventoryAPI } from '../services/api'

const areaSizes = [
  { label: '10ft × 10ft', sublabel: 'Small', value: 100 },
  { label: '15ft × 15ft', sublabel: 'Medium', value: 225 },
  { label: '20ft × 20ft', sublabel: 'Large', value: 400 },
  { label: '30ft × 20ft', sublabel: 'Extra Large', value: 600 },
  { label: '40ft × 30ft', sublabel: 'Huge', value: 1200 },
]

const surfaceTypes = [
  { value: 'grass', label: 'Grass' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'asphalt', label: 'Asphalt' },
  { value: 'artificial_turf', label: 'Artificial Turf' },
  { value: 'indoor', label: 'Indoor' },
]

export default function CustomerBooking() {
  const [step, setStep] = useState(1)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [partyDetails, setPartyDetails] = useState({
    areaSize: null,
    surface: '',
    hasPower: null,
  })
  const [availableItems, setAvailableItems] = useState([])
  const [selectedItems, setSelectedItems] = useState([])
  const [quantities, setQuantities] = useState({})
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    addressDetails: null,
  })
  const [showValidation, setShowValidation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [bookingConfirmation, setBookingConfirmation] = useState(null)
  const addressInputRef = useRef(null)
  const autocompleteRef = useRef(null)

  // Load Google Maps script
  useEffect(() => {
    const loadGoogleMapsScript = () => {
      if (window.google && window.google.maps) {
        return Promise.resolve()
      }

      return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'placeholder_google_maps_key'
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
        script.async = true
        script.defer = true
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })
    }

    loadGoogleMapsScript().catch(err => {
      console.warn('Google Maps not loaded (using placeholder key):', err)
    })
  }, [])

  // Initialize autocomplete when on step 4
  useEffect(() => {
    if (step === 4 && addressInputRef.current && window.google && window.google.maps && !autocompleteRef.current) {
      try {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          addressInputRef.current,
          {
            fields: ['formatted_address', 'geometry', 'address_components', 'place_id'],
            types: ['address'],
          }
        )

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace()

          if (place.geometry) {
            setCustomerInfo(prev => ({
              ...prev,
              address: place.formatted_address || '',
              addressDetails: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                placeId: place.place_id,
                formatted: place.formatted_address,
              }
            }))
          }
        })
      } catch (err) {
        console.warn('Autocomplete not initialized (using placeholder key):', err)
      }
    }
  }, [step])

  // Fetch filtered items from backend
  const fetchFilteredItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await bookingAPI.filterItems(
        partyDetails.areaSize,
        partyDetails.surface,
        partyDetails.hasPower
      )
      setAvailableItems(items)
    } catch (err) {
      setError('Failed to load available items. Please try again.')
      console.error('Error fetching items:', err)
    } finally {
      setLoading(false)
    }
  }

  const total = selectedItems.reduce((sum, itemId) => {
    const item = availableItems.find(i => i.inventory_item_id === itemId)
    const quantity = quantities[itemId] || 1
    return sum + ((item?.base_price || 0) * quantity)
  }, 0)

  const toggleItem = (itemId) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId))
      const newQuantities = { ...quantities }
      delete newQuantities[itemId]
      setQuantities(newQuantities)
    } else {
      setSelectedItems([...selectedItems, itemId])
      setQuantities({ ...quantities, [itemId]: 1 })
    }
  }

  const updateQuantity = (itemId, quantity) => {
    if (quantity > 0) {
      setQuantities({ ...quantities, [itemId]: quantity })
    }
  }

  const handleCreateBooking = async () => {
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone || !customerInfo.address) {
      setShowValidation(true)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create booking data
      const bookingData = {
        delivery_date: deliveryDate,
        pickup_date: pickupDate,
        delivery_address: customerInfo.address,
        delivery_latitude: customerInfo.addressDetails?.lat || null,
        delivery_longitude: customerInfo.addressDetails?.lng || null,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        items: selectedItems.map(itemId => ({
          inventory_item_id: itemId,
          quantity: quantities[itemId] || 1
        })),
        notes: `Party space: ${areaSizes.find(s => s.value === partyDetails.areaSize)?.label}, Surface: ${surfaceTypes.find(s => s.value === partyDetails.surface)?.label}, Power: ${partyDetails.hasPower ? 'Available' : 'Not Available'}`
      }

      // Use the simplified customer booking endpoint
      const result = await bookingAPI.createCustomerBooking(bookingData)
      setBookingConfirmation(result)
      setStep(5)
    } catch (err) {
      setError(err.message || 'Failed to create booking. Please try again.')
      console.error('Error creating booking:', err)
    } finally {
      setLoading(false)
    }
  }

  const canProceedFromDetails = partyDetails.areaSize !== null &&
                                 partyDetails.surface !== '' &&
                                 partyDetails.hasPower !== null

  const handleShowItems = () => {
    if (canProceedFromDetails) {
      fetchFilteredItems()
      setStep(3)
      setShowValidation(false)
    } else {
      setShowValidation(true)
    }
  }

  const canProceedFromDates = deliveryDate && pickupDate && new Date(pickupDate) >= new Date(deliveryDate)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light text-center text-gray-800 tracking-wide mb-2">
            Book Your Partay
          </h1>
          <p className="text-center text-gray-500 text-xs sm:text-sm tracking-widest uppercase">No stress. No hassle. Just fun.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Progress bar */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[1, 2, 3, 4].map((s, idx) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all ${
                  step >= s ? 'border-yellow-400 bg-yellow-400 text-white' : 'border-gray-300 bg-white text-gray-400'
                }`}>
                  <span className="text-xs sm:text-sm font-medium">{s}</span>
                </div>
                {idx < 3 && (
                  <div className="flex-1 h-0.5 mx-1 sm:mx-3 bg-gray-200">
                    <div className={`h-full transition-all ${step > s ? 'bg-yellow-400' : 'bg-gray-200'}`}></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Main Content Card */}
        <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10">
            {/* Step 1: Date Selection */}
            {step === 1 && (
              <div className="max-w-md mx-auto">
                <h2 className="font-serif text-2xl sm:text-3xl font-light text-gray-800 mb-2 sm:mb-3">
                  Select Your Dates
                </h2>
                <p className="text-gray-600 mb-6 sm:mb-8 text-sm">When do you need the equipment?</p>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2 tracking-wide uppercase">
                    Delivery Date
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-4 border border-gray-300 text-lg mb-2 focus:outline-none focus:border-yellow-400 transition"
                  />
                </div>

                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-2 tracking-wide uppercase">
                    Pickup Date
                  </label>
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    min={deliveryDate || new Date().toISOString().split('T')[0]}
                    className="w-full p-4 border border-gray-300 text-lg mb-2 focus:outline-none focus:border-yellow-400 transition"
                  />
                  {pickupDate && deliveryDate && new Date(pickupDate) < new Date(deliveryDate) && (
                    <p className="text-red-500 text-xs mt-2">Pickup date must be on or after delivery date</p>
                  )}
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={!canProceedFromDates}
                  className="w-full bg-yellow-400 text-white py-4 text-sm font-medium tracking-wider uppercase hover:bg-yellow-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  Continue
                </button>
              </div>
            )}

            {/* Step 2: Party Setup Details */}
            {step === 2 && (
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-light text-gray-800 mb-2 sm:mb-3">
                  Your Party Space
                </h2>
                <p className="text-gray-600 mb-6 sm:mb-10 text-sm">Help us find the perfect fit</p>

                {/* Area Size */}
                <div className="mb-10">
                  <label className={`block text-sm font-medium mb-4 tracking-wide uppercase ${
                    showValidation && partyDetails.areaSize === null ? 'text-red-500' : 'text-gray-700'
                  }`}>
                    Party Area Size {showValidation && partyDetails.areaSize === null && <span className="text-red-500">*</span>}
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {areaSizes.map(size => (
                      <button
                        key={size.value}
                        onClick={() => {
                          setPartyDetails({...partyDetails, areaSize: size.value})
                          setShowValidation(false)
                        }}
                        className={`p-4 border text-left transition ${
                          partyDetails.areaSize === size.value
                            ? 'border-yellow-400 bg-yellow-50'
                            : showValidation && partyDetails.areaSize === null
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200 hover:border-yellow-300'
                        }`}
                      >
                        <span className="font-medium text-gray-800">{size.label}</span>
                        <span className="text-gray-500 ml-2">({size.sublabel})</span>
                      </button>
                    ))}
                  </div>
                  {showValidation && partyDetails.areaSize === null && (
                    <p className="text-red-500 text-xs mt-2">Please select a party area size</p>
                  )}
                </div>

                {/* Surface Type */}
                <div className="mb-10">
                  <label className={`block text-sm font-medium mb-4 tracking-wide uppercase ${
                    showValidation && partyDetails.surface === '' ? 'text-red-500' : 'text-gray-700'
                  }`}>
                    Surface Type {showValidation && partyDetails.surface === '' && <span className="text-red-500">*</span>}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {surfaceTypes.map(surface => (
                      <button
                        key={surface.value}
                        onClick={() => {
                          setPartyDetails({...partyDetails, surface: surface.value})
                          setShowValidation(false)
                        }}
                        className={`p-4 border text-center transition ${
                          partyDetails.surface === surface.value
                            ? 'border-yellow-400 bg-yellow-50'
                            : showValidation && partyDetails.surface === ''
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200 hover:border-yellow-300'
                        }`}
                      >
                        <div className="text-sm font-medium text-gray-800">{surface.label}</div>
                      </button>
                    ))}
                  </div>
                  {showValidation && partyDetails.surface === '' && (
                    <p className="text-red-500 text-xs mt-2">Please select a surface type</p>
                  )}
                </div>

                {/* Power Access */}
                <div className="mb-10">
                  <label className={`block text-sm font-medium mb-4 tracking-wide uppercase ${
                    showValidation && partyDetails.hasPower === null ? 'text-red-500' : 'text-gray-700'
                  }`}>
                    Power Outlet Nearby? {showValidation && partyDetails.hasPower === null && <span className="text-red-500">*</span>}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setPartyDetails({...partyDetails, hasPower: true})
                        setShowValidation(false)
                      }}
                      className={`p-4 border font-medium transition ${
                        partyDetails.hasPower === true
                          ? 'border-yellow-400 bg-yellow-50'
                          : showValidation && partyDetails.hasPower === null
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200 hover:border-yellow-300'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => {
                        setPartyDetails({...partyDetails, hasPower: false})
                        setShowValidation(false)
                      }}
                      className={`p-4 border font-medium transition ${
                        partyDetails.hasPower === false
                          ? 'border-yellow-400 bg-yellow-50'
                          : showValidation && partyDetails.hasPower === null
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200 hover:border-yellow-300'
                      }`}
                    >
                      No
                    </button>
                  </div>
                  {showValidation && partyDetails.hasPower === null && (
                    <p className="text-red-500 text-xs mt-2">Please select whether power is available</p>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-100 text-gray-700 py-4 text-sm font-medium tracking-wider uppercase hover:bg-gray-200 transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleShowItems}
                    disabled={loading}
                    className="flex-1 bg-yellow-400 text-white py-4 text-sm font-medium tracking-wider uppercase hover:bg-yellow-500 disabled:bg-gray-300 transition"
                  >
                    {loading ? 'Loading...' : 'Show Items'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Item Selection */}
            {step === 3 && (
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-light text-gray-800 mb-2 sm:mb-3">
                  Available Items
                </h2>
                <p className="text-gray-600 mb-6 sm:mb-8 text-xs sm:text-sm">
                  {deliveryDate && new Date(deliveryDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  {pickupDate && ` - ${new Date(pickupDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`}
                </p>

                {loading ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">Loading available items...</p>
                  </div>
                ) : availableItems.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600 mb-6">No items match your party setup.</p>
                    <button
                      onClick={() => setStep(2)}
                      className="bg-yellow-400 text-white px-8 py-3 text-sm font-medium tracking-wider uppercase hover:bg-yellow-500 transition"
                    >
                      Adjust Details
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="bg-gray-50 border border-gray-200 p-6 mb-8 text-sm text-gray-600">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <span className="font-medium text-gray-700">Area:</span> {areaSizes.find(s => s.value === partyDetails.areaSize)?.label}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Surface:</span> {surfaceTypes.find(s => s.value === partyDetails.surface)?.label}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Power:</span> {partyDetails.hasPower ? 'Available' : 'Not Available'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      {availableItems.map(item => (
                        <div
                          key={item.inventory_item_id}
                          onClick={() => toggleItem(item.inventory_item_id)}
                          className={`border cursor-pointer transition ${
                            selectedItems.includes(item.inventory_item_id)
                              ? 'border-yellow-400 bg-yellow-50'
                              : 'border-gray-200 hover:border-yellow-300'
                          }`}
                        >
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-800 mb-1">{item.name}</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{item.category}</p>
                                <p className="text-xl font-light text-gray-800">${item.base_price}</p>
                              </div>
                              {selectedItems.includes(item.inventory_item_id) && (
                                <CheckCircle className="w-5 h-5 text-yellow-400" />
                              )}
                            </div>
                            {selectedItems.includes(item.inventory_item_id) && (
                              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                                <label className="text-sm text-gray-600">Quantity:</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={quantities[item.inventory_item_id] || 1}
                                  onChange={(e) => updateQuantity(item.inventory_item_id, parseInt(e.target.value))}
                                  className="w-20 p-2 border border-gray-300 text-center focus:outline-none focus:border-yellow-400"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-200 pt-6 mb-8">
                      <div className="flex justify-between items-center">
                        <span className="text-sm uppercase tracking-wide text-gray-600">Total</span>
                        <span className="font-serif text-3xl font-light text-gray-800">${total}</span>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() => setStep(2)}
                        className="flex-1 bg-gray-100 text-gray-700 py-4 text-sm font-medium tracking-wider uppercase hover:bg-gray-200 transition"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setStep(4)}
                        disabled={selectedItems.length === 0}
                        className="flex-1 bg-yellow-400 text-white py-4 text-sm font-medium tracking-wider uppercase hover:bg-yellow-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                      >
                        Checkout
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 4: Customer Info */}
            {step === 4 && (
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-light text-gray-800 mb-2 sm:mb-3">
                  Your Information
                </h2>
                <p className="text-gray-600 mb-6 sm:mb-10 text-sm">We'll send you all the details</p>

                <div className="space-y-5 mb-10">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                    className="w-full p-4 border border-gray-300 text-sm focus:outline-none focus:border-yellow-400 transition"
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                    className="w-full p-4 border border-gray-300 text-sm focus:outline-none focus:border-yellow-400 transition"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                    className="w-full p-4 border border-gray-300 text-sm focus:outline-none focus:border-yellow-400 transition"
                  />
                  <div>
                    <input
                      ref={addressInputRef}
                      type="text"
                      placeholder="Start typing your delivery address..."
                      value={customerInfo.address}
                      onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                      className="w-full p-4 border border-gray-300 text-sm focus:outline-none focus:border-yellow-400 transition"
                    />
                    <p className="text-xs text-gray-500 mt-2">Select an address from the dropdown for accurate delivery routing</p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 p-6 mb-8">
                  <h3 className="text-sm uppercase tracking-wide text-gray-700 mb-4 font-medium">Order Summary</h3>
                  <p className="text-xs text-gray-600 mb-4">
                    {deliveryDate && new Date(deliveryDate + 'T00:00:00').toLocaleDateString()} - {pickupDate && new Date(pickupDate + 'T00:00:00').toLocaleDateString()}
                  </p>
                  {selectedItems.map(itemId => {
                    const item = availableItems.find(i => i.inventory_item_id === itemId)
                    const quantity = quantities[itemId] || 1
                    return (
                      <div key={itemId} className="flex justify-between text-sm mb-2 text-gray-700">
                        <span>{item?.name} {quantity > 1 && `(×${quantity})`}</span>
                        <span>${(item?.base_price || 0) * quantity}</span>
                      </div>
                    )
                  })}
                  <div className="border-t border-gray-300 mt-4 pt-4 flex justify-between">
                    <span className="text-sm uppercase tracking-wide text-gray-600">Total</span>
                    <span className="font-serif text-2xl font-light text-gray-800">${total}</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 bg-gray-100 text-gray-700 py-4 text-sm font-medium tracking-wider uppercase hover:bg-gray-200 transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCreateBooking}
                    disabled={!customerInfo.name || !customerInfo.email || !customerInfo.phone || !customerInfo.address || loading}
                    className="flex-1 bg-yellow-400 text-white py-4 text-sm font-medium tracking-wider uppercase hover:bg-yellow-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                  >
                    {loading ? 'Processing...' : 'Complete Booking'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Confirmation */}
            {step === 5 && bookingConfirmation && (
              <div className="text-center py-8 sm:py-12">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-light text-gray-800 mb-3 sm:mb-4">
                  You're All Set!
                </h2>
                <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base px-4">
                  Thank you, {customerInfo.name}. We'll send confirmation to {customerInfo.email}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mb-6 sm:mb-10">
                  Order Number: <span className="font-medium text-gray-700">{bookingConfirmation.order_number}</span>
                </p>
                <div className="bg-gray-50 border border-gray-200 p-6 sm:p-8 mb-8 sm:mb-10 text-left max-w-md mx-auto">
                  <h3 className="text-sm uppercase tracking-wide text-gray-700 mb-4 font-medium">Booking Details</h3>
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">Delivery:</span> {new Date(deliveryDate + 'T00:00:00').toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">Pickup:</span> {new Date(pickupDate + 'T00:00:00').toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">Items:</span> {selectedItems.length}
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">Total:</span> ${total}
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">Status:</span> {bookingConfirmation.status}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Address:</span> {customerInfo.address}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setStep(1)
                    setDeliveryDate('')
                    setPickupDate('')
                    setPartyDetails({ areaSize: null, surface: '', hasPower: null })
                    setSelectedItems([])
                    setQuantities({})
                    setCustomerInfo({ name: '', email: '', phone: '', address: '', addressDetails: null })
                    setBookingConfirmation(null)
                    setError(null)
                  }}
                  className="bg-yellow-400 text-white px-10 py-4 text-sm font-medium tracking-wider uppercase hover:bg-yellow-500 transition"
                >
                  Book Another Party
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
