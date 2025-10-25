import { useState, useEffect } from 'react'
import { Package, Truck, MapPin, DollarSign, AlertCircle, Clock, Search, Plus, Filter, Users, Warehouse, CheckCircle, Calendar, X, Edit, Trash2 } from 'lucide-react'
import { adminAPI, inventoryAPI, driverAPI } from '../services/api'
import Chatbot from '../components/Chatbot'
import InventoryModal from '../components/InventoryModal'

export default function AdminDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [view, setView] = useState('calendar')
  const [bookings, setBookings] = useState([])
  const [inventory, setInventory] = useState([])
  const [drivers, setDrivers] = useState([])
  const [stats, setStats] = useState(null)
  const [conflicts, setConflicts] = useState([])
  const [unassignedBookings, setUnassignedBookings] = useState([])
  const [driverWorkload, setDriverWorkload] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showDriverModal, setShowDriverModal] = useState(false)
  const [editingDriver, setEditingDriver] = useState(null)
  const [driverForm, setDriverForm] = useState({
    name: '',
    email: '',
    phone: '',
    license_number: '',
    is_active: true
  })
  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [warehouses, setWarehouses] = useState([])
  const [assigningDriver, setAssigningDriver] = useState(false)

  // Fetch initial data
  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [
        bookingsData,
        inventoryData,
        driversData,
        statsData,
        conflictsData,
        unassignedData,
        workloadData
      ] = await Promise.all([
        adminAPI.getAllBookings(),
        inventoryAPI.listItems(),
        driverAPI.listDrivers(),
        adminAPI.getStats(),
        adminAPI.getConflicts(),
        adminAPI.getUnassignedBookings(),
        adminAPI.getDriverWorkload()
      ])

      setBookings(bookingsData)
      setInventory(inventoryData)
      setDrivers(driversData)
      setStats(statsData)
      setConflicts(conflictsData.conflicts || [])
      setUnassignedBookings(unassignedData)
      setDriverWorkload(workloadData.drivers || [])
    } catch (err) {
      setError('Failed to load dashboard data')
      console.error('Error loading dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateCalendarDays = () => {
    const days = []
    const [year, month] = selectedDate.split('-').map(Number)

    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const startDay = firstDay.getDay()

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayBookings = bookings.filter(b =>
        b.delivery_date === dateStr || b.pickup_date === dateStr
      )
      days.push({ date: day, dateStr: dateStr, bookings: dayBookings })
    }

    return days
  }

  const calendarDays = generateCalendarDays()
  const selectedDayBookings = bookings.filter(b =>
    b.delivery_date === selectedDate || b.pickup_date === selectedDate
  )

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-gray-100 text-gray-800 border-gray-300',
      'confirmed': 'bg-blue-100 text-blue-800 border-blue-300',
      'out_for_delivery': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'delivered': 'bg-green-100 text-green-800 border-green-300',
      'active': 'bg-green-100 text-green-800 border-green-300',
      'picked_up': 'bg-purple-100 text-purple-800 border-purple-300',
      'completed': 'bg-gray-100 text-gray-800 border-gray-300',
      'cancelled': 'bg-red-100 text-red-800 border-red-300'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const getStatusLabel = (status) => {
    const labels = {
      'pending': 'Pending',
      'confirmed': 'Confirmed',
      'out_for_delivery': 'Out for Delivery',
      'delivered': 'Delivered',
      'active': 'Active Rental',
      'picked_up': 'Picked Up',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    }
    return labels[status] || status
  }

  const handleAssignDriver = async (bookingId, driverId) => {
    setAssigningDriver(true)
    setError(null)
    try {
      await adminAPI.updateBooking(bookingId, { assigned_driver_id: driverId })
      await fetchDashboardData() // Refresh data
    } catch (err) {
      setError('Failed to assign driver')
      console.error('Error assigning driver:', err)
      throw err // Re-throw to let the caller handle it
    } finally {
      setAssigningDriver(false)
    }
  }

  const openDriverModal = (driver = null) => {
    if (driver) {
      setEditingDriver(driver)
      setDriverForm({
        name: driver.name,
        email: driver.email || '',
        phone: driver.phone,
        license_number: driver.license_number || '',
        is_active: driver.is_active
      })
    } else {
      setEditingDriver(null)
      setDriverForm({
        name: '',
        email: '',
        phone: '',
        license_number: '',
        is_active: true
      })
    }
    setShowDriverModal(true)
  }

  const closeDriverModal = () => {
    setShowDriverModal(false)
    setEditingDriver(null)
    setDriverForm({
      name: '',
      email: '',
      phone: '',
      license_number: '',
      is_active: true
    })
  }

  const handleSaveDriver = async () => {
    setLoading(true)
    setError(null)

    try {
      if (editingDriver) {
        // Update existing driver
        await driverAPI.updateDriver(editingDriver.driver_id, driverForm)
      } else {
        // Create new driver
        await driverAPI.createDriver(driverForm)
      }
      await fetchDashboardData() // Refresh data
      closeDriverModal()
    } catch (err) {
      setError(editingDriver ? 'Failed to update driver' : 'Failed to create driver')
      console.error('Error saving driver:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleDriverStatus = async (driver) => {
    setLoading(true)
    setError(null)

    try {
      await driverAPI.updateDriver(driver.driver_id, { is_active: !driver.is_active })
      await fetchDashboardData() // Refresh data
    } catch (err) {
      setError('Failed to update driver status')
      console.error('Error toggling driver status:', err)
    } finally {
      setLoading(false)
    }
  }

  // Inventory Management Functions
  const openInventoryModal = (item = null) => {
    setEditingItem(item)
    setShowInventoryModal(true)
  }

  const closeInventoryModal = () => {
    setShowInventoryModal(false)
    setEditingItem(null)
  }

  const handleSaveInventoryItem = async (itemData) => {
    setLoading(true)
    setError(null)

    try {
      if (editingItem) {
        // Update existing item
        await inventoryAPI.updateItem(editingItem.inventory_item_id, itemData)
      } else {
        // Create new item
        await inventoryAPI.createItem(itemData)
      }
      await fetchDashboardData() // Refresh data
      closeInventoryModal()
    } catch (err) {
      setError(editingItem ? 'Failed to update item' : 'Failed to create item')
      console.error('Error saving inventory item:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteInventoryItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item? This cannot be undone.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      await inventoryAPI.deleteItem(itemId)
      await fetchDashboardData() // Refresh data
    } catch (err) {
      setError(err.message || 'Failed to delete item')
      console.error('Error deleting inventory item:', err)
    } finally {
      setLoading(false)
    }
  }

  // Get warehouses from seed data (hardcoded for now)
  useEffect(() => {
    // In production, fetch from an API endpoint
    // For now, use the warehouses from seed data
    setWarehouses([
      {
        warehouse_id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Warehouse A - Main'
      },
      {
        warehouse_id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Warehouse B - North'
      }
    ])
  }, [])

  if (loading && !bookings.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-xl sm:text-2xl lg:text-3xl font-light text-gray-800">
                Partay Admin
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 hidden sm:block">Manage your rental business</p>
            </div>
            <button
              onClick={fetchDashboardData}
              className="bg-yellow-400 text-gray-800 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-lg text-sm font-medium hover:bg-yellow-500 transition flex items-center uppercase tracking-wide"
            >
              <Package className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setView('calendar')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition ${
                view === 'calendar'
                  ? 'border-yellow-400 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Calendar
            </button>
            <button
              onClick={() => setView('inventory')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition ${
                view === 'inventory'
                  ? 'border-yellow-400 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Warehouse className="w-4 h-4 inline mr-2" />
              Inventory
            </button>
            <button
              onClick={() => setView('drivers')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition ${
                view === 'drivers'
                  ? 'border-yellow-400 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Drivers
            </button>
            <button
              onClick={() => setView('bookings')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition ${
                view === 'bookings'
                  ? 'border-yellow-400 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              All Bookings
            </button>
            <button
              onClick={() => setView('conflicts')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition ${
                view === 'conflicts'
                  ? 'border-yellow-400 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Conflicts
              {conflicts.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
                  {conflicts.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Error display */}
        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs sm:text-sm text-gray-600">Total Bookings</span>
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-light text-gray-800">
              {stats?.total_bookings || bookings.length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs sm:text-sm text-gray-600">Total Revenue</span>
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-light text-gray-800">
              ${stats?.total_revenue || bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs sm:text-sm text-gray-600">Unassigned</span>
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-light text-gray-800">
              {unassignedBookings.length}
            </div>
          </div>
          <div className={`rounded-lg border-2 p-3 sm:p-4 ${
            conflicts.length > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs sm:text-sm text-gray-600">Conflicts</span>
              <AlertCircle className={`w-4 h-4 sm:w-5 sm:h-5 ${
                conflicts.length > 0 ? 'text-red-500' : 'text-gray-400'
              }`} />
            </div>
            <div className={`text-2xl sm:text-3xl font-light ${
              conflicts.length > 0 ? 'text-red-600' : 'text-gray-800'
            }`}>
              {conflicts.length}
            </div>
          </div>
        </div>

        {/* Calendar View */}
        {view === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="font-serif text-lg sm:text-xl font-light text-gray-800">
                  {new Date(selectedDate).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </h2>
                <input
                  type="month"
                  value={selectedDate.substring(0, 7)}
                  onChange={(e) => setSelectedDate(e.target.value + '-01')}
                  className="border border-gray-300 px-3 py-2 rounded text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
                {calendarDays.map((day, idx) => (
                  <div
                    key={idx}
                    onClick={() => day && setSelectedDate(day.dateStr)}
                    className={`min-h-20 border rounded-lg p-2 cursor-pointer transition ${
                      day
                        ? day.dateStr === selectedDate
                          ? 'border-yellow-400 bg-yellow-50'
                          : day.bookings.length > 0
                          ? 'border-blue-200 bg-blue-50 hover:border-blue-400'
                          : 'border-gray-200 hover:border-gray-300'
                        : 'border-transparent'
                    }`}
                  >
                    {day && (
                      <>
                        <div className={`text-sm font-medium mb-1 ${
                          day.dateStr === new Date().toISOString().split('T')[0]
                            ? 'text-yellow-600'
                            : 'text-gray-700'
                        }`}>
                          {day.date}
                        </div>
                        {day.bookings.length > 0 && (
                          <div className="space-y-1">
                            {day.bookings.slice(0, 2).map(booking => (
                              <div
                                key={booking.booking_id}
                                className="text-xs bg-white border border-gray-200 rounded px-1 py-0.5 truncate"
                              >
                                {booking.customer?.name?.split(' ')[0] || 'N/A'}
                              </div>
                            ))}
                            {day.bookings.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{day.bookings.length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Day Details Sidebar */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>

              {selectedDayBookings.length === 0 ? (
                <p className="text-gray-500 text-sm">No bookings for this day</p>
              ) : (
                <div className="space-y-3">
                  {selectedDayBookings.map(booking => (
                    <div
                      key={booking.booking_id}
                      onClick={() => setSelectedBooking(booking)}
                      className="border border-gray-200 rounded-lg p-3 hover:border-yellow-400 transition cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800 text-sm mb-1">
                            {booking.customer?.name || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {booking.order_number}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(booking.status)}`}>
                          {getStatusLabel(booking.status)}
                        </span>
                      </div>

                      <div className="text-xs text-gray-600 mb-2">
                        ${booking.total_amount}
                      </div>

                      {booking.driver_id ? (
                        <div className="text-xs text-gray-500 flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          Driver assigned
                        </div>
                      ) : (
                        <div className="text-xs text-orange-600 flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          No driver assigned
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Actions Panel */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => window.location.href = '/book'}
                    className="w-full flex items-center justify-between py-3 px-4 bg-yellow-400 text-gray-800 rounded-lg font-medium hover:bg-yellow-500 transition"
                  >
                    <div className="flex items-center">
                      <Plus className="w-4 h-4 mr-2" />
                      <span className="text-sm uppercase tracking-wide">Create Booking</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      const deliveries = bookings.filter(b => b.delivery_date === selectedDate)
                      alert(`${deliveries.length} deliveries scheduled for this date`)
                    }}
                    className="w-full flex items-center justify-between py-3 px-4 bg-white border-2 border-gray-200 rounded-lg font-medium hover:border-yellow-400 transition"
                  >
                    <div className="flex items-center">
                      <Truck className="w-4 h-4 mr-2 text-yellow-600" />
                      <span className="text-sm text-gray-700">View Deliveries</span>
                    </div>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      {bookings.filter(b => b.delivery_date === selectedDate).length}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      const pickups = bookings.filter(b => b.pickup_date === selectedDate)
                      alert(`${pickups.length} pickups scheduled for this date`)
                    }}
                    className="w-full flex items-center justify-between py-3 px-4 bg-white border-2 border-gray-200 rounded-lg font-medium hover:border-yellow-400 transition"
                  >
                    <div className="flex items-center">
                      <Package className="w-4 h-4 mr-2 text-purple-600" />
                      <span className="text-sm text-gray-700">View Pickups</span>
                    </div>
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                      {bookings.filter(b => b.pickup_date === selectedDate).length}
                    </span>
                  </button>
                  <button
                    onClick={() => setView('inventory')}
                    className="w-full flex items-center py-3 px-4 bg-white border-2 border-gray-200 rounded-lg font-medium hover:border-yellow-400 transition"
                  >
                    <Warehouse className="w-4 h-4 mr-2 text-gray-600" />
                    <span className="text-sm text-gray-700">Check Inventory</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory View */}
        {view === 'inventory' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-lg sm:text-xl font-light text-gray-800">
                Inventory Management
              </h2>
              <button
                onClick={() => openInventoryModal()}
                className="bg-yellow-400 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-yellow-500 transition flex items-center text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inventory.map(item => (
                <div
                  key={item.inventory_item_id}
                  className="border-2 border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800">{item.name}</h3>
                      <p className="text-sm text-gray-600">{item.category}</p>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ml-2 ${
                      item.status === 'available'
                        ? 'bg-green-100 text-green-800'
                        : item.status === 'rented'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-3 border-t border-gray-200">
                    <div>
                      <div className="text-sm text-gray-600">Price</div>
                      <div className="text-lg font-medium text-gray-800">${item.base_price}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Warehouse</div>
                      <div className="text-xs text-gray-800 truncate">
                        {warehouses.find(w => w.warehouse_id === item.current_warehouse_id)?.name || 'Unknown'}
                      </div>
                    </div>
                  </div>

                  {(item.requires_power || item.min_space_sqft || item.allowed_surfaces?.length > 0) && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.requires_power && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Requires Power
                        </span>
                      )}
                      {item.min_space_sqft && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          {item.min_space_sqft} sq ft
                        </span>
                      )}
                      {item.website_visible && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          On Website
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => openInventoryModal(item)}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition flex items-center justify-center"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteInventoryItem(item.inventory_item_id)}
                      className="flex-1 bg-red-100 text-red-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-200 transition flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drivers View */}
        {view === 'drivers' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-lg sm:text-xl font-light text-gray-800">
                Driver Management
              </h2>
              <button
                onClick={() => openDriverModal()}
                className="bg-yellow-400 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-yellow-500 transition flex items-center text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Driver
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {drivers.map(driver => {
                const workload = driverWorkload.find(w => w.driver_id === driver.driver_id)
                return (
                  <div
                    key={driver.driver_id}
                    className={`border-2 rounded-lg p-4 ${
                      driver.is_active ? 'border-gray-200' : 'border-gray-300 bg-gray-50 opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
                          driver.is_active ? 'bg-yellow-400' : 'bg-gray-400'
                        }`}>
                          <Users className={`w-5 h-5 ${driver.is_active ? 'text-gray-800' : 'text-white'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-800">{driver.name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              driver.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {driver.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          {driver.email && (
                            <p className="text-xs text-gray-500 mb-1">{driver.email}</p>
                          )}
                          <p className="text-xs text-gray-500">{driver.phone}</p>
                          {driver.license_number && (
                            <p className="text-xs text-gray-500 mt-1">License: {driver.license_number}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-3 border-t border-gray-200">
                      <div className="text-center">
                        <div className="text-lg font-light text-gray-800">
                          {workload?.assigned_bookings || 0}
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Active</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-light text-gray-800">
                          {driver.total_deliveries || 0}
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Deliveries</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-light text-yellow-600">
                          ${Number(driver.total_earnings || 0).toFixed(0)}
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Earned</div>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    {driver.total_deliveries > 0 && (
                      <div className="grid grid-cols-2 gap-2 py-3 border-t border-gray-200">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            {driver.avg_rating ? (
                              <>
                                <span className="text-lg font-serif text-gray-800">{Number(driver.avg_rating).toFixed(1)}</span>
                                <span className="text-yellow-400">★</span>
                              </>
                            ) : (
                              <span className="text-sm text-gray-400">No ratings</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">
                            Rating {driver.total_ratings > 0 && `(${driver.total_ratings})`}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-light text-gray-800">
                            {driver.on_time_deliveries + driver.late_deliveries > 0
                              ? Math.round((driver.on_time_deliveries / (driver.on_time_deliveries + driver.late_deliveries)) * 100)
                              : 0}%
                          </div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">On-Time</div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => openDriverModal(driver)}
                        className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition flex items-center justify-center"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleDriverStatus(driver)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                          driver.is_active
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {driver.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Unassigned Bookings */}
            {unassignedBookings.length > 0 && (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 sm:p-6 mt-6">
                <div className="flex items-center mb-4">
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 mr-3" />
                  <h3 className="text-base sm:text-lg font-medium text-orange-800">
                    Unassigned Bookings ({unassignedBookings.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {unassignedBookings.map(booking => (
                    <div key={booking.booking_id} className="bg-white border border-orange-200 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                        <div>
                          <h4 className="font-medium text-gray-800">{booking.customer_name}</h4>
                          <p className="text-sm text-gray-600">{booking.order_number}</p>
                        </div>
                        <span className="text-sm text-gray-600">
                          {new Date(booking.delivery_date).toLocaleDateString()}
                        </span>
                      </div>
                      <select
                        onChange={(e) => handleAssignDriver(booking.booking_id, e.target.value)}
                        className="w-full bg-yellow-400 text-gray-800 py-2 px-3 rounded-lg text-sm font-medium hover:bg-yellow-500 transition focus:outline-none"
                        defaultValue=""
                      >
                        <option value="" disabled>Assign Driver</option>
                        {drivers.filter(d => d.is_active).map(driver => (
                          <option key={driver.driver_id} value={driver.driver_id} className="text-gray-800">
                            {driver.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Conflicts View */}
        {view === 'conflicts' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="font-serif text-xl font-light text-gray-800 mb-4">
              Booking Conflicts
            </h2>
            {conflicts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">No conflicts detected!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {conflicts.map((conflict, idx) => (
                  <div key={idx} className="border-2 border-red-300 bg-red-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-red-900 mb-2">
                      Item Conflict
                    </h3>
                    <p className="text-sm text-red-700 mb-3">
                      Double-booked: {conflict.item_name}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded">
                        <p className="font-medium">{conflict.booking1.customer?.name || 'N/A'}</p>
                        <p className="text-sm text-gray-600">{conflict.booking1.order_number}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(conflict.booking1.delivery_date).toLocaleDateString()} - {new Date(conflict.booking1.pickup_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded">
                        <p className="font-medium">{conflict.booking2.customer?.name || 'N/A'}</p>
                        <p className="text-sm text-gray-600">{conflict.booking2.order_number}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(conflict.booking2.delivery_date).toLocaleDateString()} - {new Date(conflict.booking2.pickup_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Bookings View */}
        {view === 'bookings' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-serif text-xl font-light text-gray-800">
                All Bookings
              </h2>
            </div>
            <div className="overflow-x-auto">
              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No bookings found</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Delivery Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pickup Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Driver
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bookings.map((booking) => (
                      <tr
                        key={booking.booking_id}
                        onClick={() => setSelectedBooking(booking)}
                        className="hover:bg-gray-50 cursor-pointer transition"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {booking.order_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {booking.customer?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {new Date(booking.delivery_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {new Date(booking.pickup_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {booking.booking_items?.length || 0} items
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${parseFloat(booking.total).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                            getStatusColor(booking.status)
                          }`}>
                            {booking.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {drivers.find(d => d.driver_id === booking.assigned_driver_id)?.name || 'Unassigned'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Item-Specific Calendar Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-light text-gray-800">
                  {selectedItem.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Booking Calendar</p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Item Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-gray-600 uppercase tracking-wide block mb-1">Category</span>
                    <span className="text-sm font-medium text-gray-800">{selectedItem.category}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600 uppercase tracking-wide block mb-1">Daily Rate</span>
                    <span className="text-sm font-medium text-gray-800">${selectedItem.base_price}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600 uppercase tracking-wide block mb-1">Status</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      selectedItem.status === 'available'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedItem.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Month Selector */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-800">
                  {new Date(selectedDate).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </h3>
                <input
                  type="month"
                  value={selectedDate.substring(0, 7)}
                  onChange={(e) => setSelectedDate(e.target.value + '-01')}
                  className="border border-gray-300 px-3 py-2 rounded text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 mb-6">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
                {calendarDays.map((day, idx) => {
                  // Filter bookings for this item
                  const itemBookings = day?.bookings.filter(b =>
                    b.booking_items?.some(bi => bi.inventory_item_id === selectedItem.inventory_item_id)
                  ) || []

                  // Check if date is in the past
                  const today = new Date().toISOString().split('T')[0]
                  const isPast = day && day.dateStr < today

                  return (
                    <div
                      key={idx}
                      className={`min-h-20 border rounded-lg p-2 transition ${
                        day
                          ? isPast
                            ? 'border-gray-200 bg-gray-50'
                            : itemBookings.length > 0
                              ? 'border-red-300 bg-red-50'
                              : 'border-green-200 bg-green-50'
                          : 'border-transparent'
                      }`}
                    >
                      {day && (
                        <>
                          <div className={`text-sm font-medium mb-1 ${
                            day.dateStr === today
                              ? 'text-yellow-600'
                              : isPast
                                ? 'text-gray-400'
                                : 'text-gray-700'
                          }`}>
                            {day.date}
                          </div>
                          {isPast ? (
                            <div className="text-xs text-gray-400 font-medium">
                              Past
                            </div>
                          ) : itemBookings.length > 0 ? (
                            <div className="text-xs text-red-700 font-medium">
                              {itemBookings.length} booking{itemBookings.length > 1 ? 's' : ''}
                            </div>
                          ) : (
                            <div className="text-xs text-green-700 font-medium">
                              Available
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Bookings List for Selected Month */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">
                  Bookings This Month
                </h3>
                {(() => {
                  const monthBookings = bookings.filter(b =>
                    (b.delivery_date.startsWith(selectedDate.substring(0, 7)) ||
                     b.pickup_date.startsWith(selectedDate.substring(0, 7))) &&
                    b.booking_items?.some(bi => bi.inventory_item_id === selectedItem.inventory_item_id)
                  )

                  if (monthBookings.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No bookings for this item this month</p>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-2">
                      {monthBookings.map(booking => (
                        <div
                          key={booking.booking_id}
                          onClick={() => setSelectedBooking(booking)}
                          className="border border-gray-200 rounded-lg p-3 hover:border-yellow-400 transition cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-medium text-sm text-gray-800">{booking.customer?.name || 'N/A'}</div>
                              <div className="text-xs text-gray-500">{booking.order_number}</div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(booking.status)}`}>
                              {getStatusLabel(booking.status)}
                            </span>
                          </div>
                          <div className="flex items-center text-xs text-gray-600">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(booking.delivery_date).toLocaleDateString()} - {new Date(booking.pickup_date).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>

              {/* Close Button */}
              <div className="mt-6">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="w-full py-3 bg-yellow-400 text-gray-800 rounded-lg font-medium hover:bg-yellow-500 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedBooking(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-light text-gray-800">
                  Booking Details
                </h2>
                <p className="text-sm text-gray-500 mt-1">{selectedBooking.order_number}</p>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className={`px-4 py-2 rounded-full text-sm font-medium border-2 ${getStatusColor(selectedBooking.status)}`}>
                  {getStatusLabel(selectedBooking.status)}
                </span>
                <span className="text-2xl font-light text-gray-800">
                  ${selectedBooking.total_amount}
                </span>
              </div>

              {/* Customer Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">Customer Information</h3>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <Users className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-gray-800">{selectedBooking.customer?.name || 'N/A'}</div>
                      {selectedBooking.customer?.email && (
                        <div className="text-xs text-gray-600">{selectedBooking.customer.email}</div>
                      )}
                      {selectedBooking.customer?.phone && (
                        <div className="text-xs text-gray-600">{selectedBooking.customer.phone}</div>
                      )}
                    </div>
                  </div>
                  {selectedBooking.delivery_address && (
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                      <div className="text-sm text-gray-700">{selectedBooking.delivery_address}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery & Pickup Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Truck className="w-4 h-4 text-yellow-600 mr-2" />
                    <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Delivery</span>
                  </div>
                  <div className="text-sm font-medium text-gray-800">
                    {new Date(selectedBooking.delivery_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  {selectedBooking.delivery_time_window && (
                    <div className="text-xs text-gray-600 mt-1">{selectedBooking.delivery_time_window}</div>
                  )}
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Package className="w-4 h-4 text-purple-600 mr-2" />
                    <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Pickup</span>
                  </div>
                  <div className="text-sm font-medium text-gray-800">
                    {new Date(selectedBooking.pickup_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  {selectedBooking.pickup_time_window && (
                    <div className="text-xs text-gray-600 mt-1">{selectedBooking.pickup_time_window}</div>
                  )}
                </div>
              </div>

              {/* Rental Days */}
              <div className="flex items-center justify-between py-3 border-t border-b border-gray-200">
                <span className="text-sm text-gray-600">Rental Duration</span>
                <span className="text-sm font-medium text-gray-800">{selectedBooking.rental_days || 1} days</span>
              </div>

              {/* Items */}
              {selectedBooking.booking_items && selectedBooking.booking_items.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">Items</h3>
                  <div className="space-y-2">
                    {selectedBooking.booking_items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                        <div className="flex items-center">
                          <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></span>
                          <div>
                            <div className="text-sm font-medium text-gray-800">{item.inventory_item?.name || `Item ${idx + 1}`}</div>
                            {item.quantity > 1 && (
                              <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-gray-600">${item.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing Breakdown */}
              <div className="space-y-2 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-800">${selectedBooking.subtotal || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="text-gray-800">${selectedBooking.delivery_fee || 0}</span>
                </div>
                {selectedBooking.driver_tip > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Driver Tip</span>
                    <span className="text-gray-800">${selectedBooking.driver_tip}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-lg font-medium pt-2 border-t border-gray-200">
                  <span className="text-gray-800">Total</span>
                  <span className="text-gray-800">${selectedBooking.total_amount}</span>
                </div>
              </div>

              {/* Setup Instructions */}
              {selectedBooking.setup_instructions && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-2">Setup Instructions</h3>
                  <p className="text-sm text-gray-700">{selectedBooking.setup_instructions}</p>
                </div>
              )}

              {/* Driver Assignment */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">Driver Assignment</h3>
                {selectedBooking.driver_id ? (
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Driver assigned
                  </div>
                ) : (
                  <>
                    <select
                      onChange={async (e) => {
                        const driverId = e.target.value
                        if (!driverId) return

                        try {
                          await handleAssignDriver(selectedBooking.booking_id, driverId)
                          setSelectedBooking(null)
                        } catch (err) {
                          console.error('Error assigning driver:', err)
                          // Keep modal open on error so user can see the error message
                        }
                      }}
                      disabled={assigningDriver}
                      className="w-full bg-yellow-400 text-gray-800 py-2 px-3 rounded-lg text-sm font-medium hover:bg-yellow-500 transition focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        {assigningDriver ? 'Assigning...' : 'Assign Driver'}
                      </option>
                      {drivers.map(driver => (
                        <option key={driver.driver_id} value={driver.driver_id} className="text-gray-800">
                          {driver.name}
                        </option>
                      ))}
                    </select>
                    {assigningDriver && (
                      <p className="text-sm text-gray-600 mt-2">Assigning driver...</p>
                    )}
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    // Future: Implement edit functionality
                    alert('Edit functionality coming soon!')
                  }}
                  className="flex-1 flex items-center justify-center py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Booking
                </button>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="flex-1 py-3 bg-yellow-400 text-gray-800 rounded-lg font-medium hover:bg-yellow-500 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Driver Form Modal */}
      {showDriverModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={closeDriverModal}>
          <div className="bg-white rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="font-serif text-2xl font-light text-gray-800">
                {editingDriver ? 'Edit Driver' : 'Add Driver'}
              </h2>
              <button
                onClick={closeDriverModal}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <form onSubmit={(e) => {
                e.preventDefault()
                handleSaveDriver()
              }} className="space-y-4">
                {/* Name Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={driverForm.name}
                    onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    required
                    placeholder="John Smith"
                  />
                </div>

                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={driverForm.email}
                    onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>

                {/* Phone Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={driverForm.phone}
                    onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    required
                    placeholder="(555) 123-4567"
                  />
                </div>

                {/* License Number Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Number
                  </label>
                  <input
                    type="text"
                    value={driverForm.license_number}
                    onChange={(e) => setDriverForm({ ...driverForm, license_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="DL123456"
                  />
                </div>

                {/* Active Status Checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={driverForm.is_active}
                    onChange={(e) => setDriverForm({ ...driverForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-yellow-400 border-gray-300 rounded focus:ring-yellow-400"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
                    Active Driver
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeDriverModal}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-yellow-400 text-gray-800 rounded-lg font-medium hover:bg-yellow-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : editingDriver ? 'Update Driver' : 'Add Driver'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Modal */}
      {showInventoryModal && (
        <InventoryModal
          item={editingItem}
          warehouses={warehouses}
          onClose={closeInventoryModal}
          onSave={handleSaveInventoryItem}
        />
      )}

      {/* AI Chatbot */}
      <Chatbot />
    </div>
  )
}
