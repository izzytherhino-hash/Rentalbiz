import React, { useState } from 'react';
import { Package, Truck, MapPin, DollarSign, AlertCircle, Clock, Search, Plus, Filter, Users, Warehouse, CheckCircle } from 'lucide-react';

const sampleBookings = [
  {
    id: 'PR-2847',
    customerName: 'Jennifer Martinez',
    customerPhone: '(714) 555-0123',
    address: '1234 Ocean View Dr, Costa Mesa, CA',
    deliveryDate: '2025-10-20',
    pickupDate: '2025-10-20',
    rentalDays: 1,
    items: ['Bounce House Castle', 'Cotton Candy Machine'],
    total: 320,
    status: 'confirmed',
    driver: 'Mike Johnson',
    warehouse: 'Warehouse A'
  },
  {
    id: 'PR-2848',
    customerName: 'David Thompson',
    customerPhone: '(949) 555-0456',
    address: '5678 Park Ave, Newport Beach, CA',
    deliveryDate: '2025-10-20',
    pickupDate: '2025-10-22',
    rentalDays: 3,
    items: ['Water Slide Mega', 'Photo Booth Deluxe'],
    total: 525,
    status: 'out_for_delivery',
    driver: 'Sarah Chen',
    warehouse: 'Warehouse B'
  },
  {
    id: 'PR-2849',
    customerName: 'Lisa Anderson',
    customerPhone: '(562) 555-0789',
    address: '9012 Sunset Blvd, Huntington Beach, CA',
    deliveryDate: '2025-10-20',
    pickupDate: '2025-10-24',
    rentalDays: 5,
    items: ['Obstacle Course', 'Popcorn Machine'],
    total: 625,
    status: 'confirmed',
    driver: 'Mike Johnson',
    warehouse: 'Warehouse A'
  },
  {
    id: 'PR-2851',
    customerName: 'Patricia Wilson',
    customerPhone: '(714) 555-2222',
    address: '8800 Warner Ave, Huntington Beach, CA',
    deliveryDate: '2025-10-22',
    pickupDate: '2025-10-22',
    rentalDays: 1,
    items: ['Bounce House Castle', 'Cotton Candy Machine'],
    total: 320,
    status: 'confirmed',
    driver: null,
    warehouse: 'Warehouse A'
  }
];

const inventory = [
  { 
    id: 1, 
    name: 'Bounce House Castle', 
    currentLocation: 'Warehouse A', 
    status: 'available',
    bookings: [
      { orderId: 'PR-2847', start: '2025-10-20', end: '2025-10-20', customer: 'Jennifer Martinez' },
      { orderId: 'PR-2851', start: '2025-10-22', end: '2025-10-22', customer: 'Patricia Wilson' }
    ]
  },
  { 
    id: 2, 
    name: 'Water Slide Mega', 
    currentLocation: 'With Customer', 
    status: 'rented',
    bookings: [
      { orderId: 'PR-2848', start: '2025-10-20', end: '2025-10-22', customer: 'David Thompson' }
    ]
  },
  { 
    id: 3, 
    name: 'Obstacle Course', 
    currentLocation: 'With Customer', 
    status: 'rented',
    bookings: [
      { orderId: 'PR-2849', start: '2025-10-20', end: '2025-10-24', customer: 'Lisa Anderson' }
    ]
  },
  { 
    id: 4, 
    name: 'Mini Bounce House', 
    currentLocation: 'Warehouse B', 
    status: 'available',
    bookings: []
  },
  { 
    id: 5, 
    name: 'Cotton Candy Machine', 
    currentLocation: 'Warehouse A', 
    status: 'available',
    bookings: [
      { orderId: 'PR-2847', start: '2025-10-20', end: '2025-10-20', customer: 'Jennifer Martinez' },
      { orderId: 'PR-2851', start: '2025-10-22', end: '2025-10-22', customer: 'Patricia Wilson' }
    ]
  },
  { 
    id: 6, 
    name: 'Photo Booth Deluxe', 
    currentLocation: 'With Customer', 
    status: 'rented',
    bookings: [
      { orderId: 'PR-2848', start: '2025-10-20', end: '2025-10-22', customer: 'David Thompson' }
    ]
  },
  { 
    id: 7, 
    name: 'Popcorn Machine', 
    currentLocation: 'With Customer', 
    status: 'rented',
    bookings: [
      { orderId: 'PR-2849', start: '2025-10-20', end: '2025-10-24', customer: 'Lisa Anderson' }
    ]
  },
  { 
    id: 8, 
    name: 'Tables and Chairs Set', 
    currentLocation: 'Warehouse B', 
    status: 'available',
    bookings: []
  }
];

const drivers = [
  { id: 1, name: 'Mike Johnson' },
  { id: 2, name: 'Sarah Chen' },
  { id: 3, name: 'James Rodriguez' }
];

export default function AdminDashboard() {
  const [selectedDate, setSelectedDate] = useState('2025-10-20');
  const [view, setView] = useState('calendar');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const generateCalendarDays = () => {
    const days = [];
    const today = new Date('2025-10-20');
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      const dayBookings = sampleBookings.filter(b => 
        b.deliveryDate === dateStr || b.pickupDate === dateStr
      );
      days.push({ date: day, dateStr: dateStr, bookings: dayBookings });
    }
    
    return days;
  };

  const generateItemCalendar = (item) => {
    const days = [];
    for (let i = 15; i <= 31; i++) {
      const dateStr = '2025-10-' + String(i).padStart(2, '0');
      const booking = item.bookings.find(b => dateStr >= b.start && dateStr <= b.end);
      days.push({ date: i, dateStr: dateStr, booking: booking });
    }
    return days;
  };

  const detectConflicts = () => {
    const conflicts = [];
    const itemBookings = {};
    
    sampleBookings.forEach(booking => {
      if (booking.status === 'cancelled') return;
      
      booking.items.forEach(itemName => {
        if (!itemBookings[itemName]) {
          itemBookings[itemName] = [];
        }
        itemBookings[itemName].push({
          orderId: booking.id,
          customer: booking.customerName,
          start: booking.deliveryDate,
          end: booking.pickupDate
        });
      });
    });

    Object.keys(itemBookings).forEach(itemName => {
      const bookings = itemBookings[itemName];
      for (let i = 0; i < bookings.length; i++) {
        for (let j = i + 1; j < bookings.length; j++) {
          const b1 = bookings[i];
          const b2 = bookings[j];
          
          if (b1.start <= b2.end && b2.start <= b1.end) {
            conflicts.push({
              item: itemName,
              booking1: b1,
              booking2: b2
            });
          }
        }
      }
    });

    return conflicts;
  };

  const calendarDays = generateCalendarDays();
  const selectedDayBookings = sampleBookings.filter(b => 
    b.deliveryDate === selectedDate || b.pickupDate === selectedDate
  );

  const getStatusColor = (status) => {
    if (status === 'confirmed') return 'bg-blue-100 text-blue-800 border-blue-300';
    if (status === 'out_for_delivery') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (status === 'active') return 'bg-green-100 text-green-800 border-green-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusLabel = (status) => {
    if (status === 'confirmed') return 'Confirmed';
    if (status === 'out_for_delivery') return 'Out for Delivery';
    if (status === 'active') return 'Active Rental';
    return status;
  };

  const totalRevenue = sampleBookings.reduce((sum, b) => sum + b.total, 0);
  const activeRentals = sampleBookings.filter(b => b.status === 'active').length;
  const todayDeliveries = sampleBookings.filter(b => b.deliveryDate === selectedDate).length;
  const unassignedBookings = sampleBookings.filter(b => !b.driver);
  const conflicts = detectConflicts();

  const handleQuickAction = (action, booking) => {
    alert('Action: ' + action + ' for ' + booking.id);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light text-gray-800" style={{fontFamily: 'Georgia, serif'}}>
                Party Rentals Admin
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage your rental business</p>
            </div>
            <button className="bg-yellow-400 text-white px-6 py-3 rounded-lg font-medium hover:bg-yellow-500 transition flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              New Booking
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setView('calendar')}
              className={'py-4 px-2 border-b-2 font-medium text-sm transition ' + (view === 'calendar' ? 'border-yellow-400 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700')}
            >
              📅 Calendar
            </button>
            <button
              onClick={() => setView('inventory')}
              className={'py-4 px-2 border-b-2 font-medium text-sm transition ' + (view === 'inventory' ? 'border-yellow-400 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700')}
            >
              <Warehouse className="w-4 h-4 inline mr-2" />
              Inventory
            </button>
            <button
              onClick={() => setView('drivers')}
              className={'py-4 px-2 border-b-2 font-medium text-sm transition ' + (view === 'drivers' ? 'border-yellow-400 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700')}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Drivers
            </button>
            <button
              onClick={() => setView('conflicts')}
              className={'py-4 px-2 border-b-2 font-medium text-sm transition ' + (view === 'conflicts' ? 'border-yellow-400 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700')}
            >
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Conflicts {conflicts.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{conflicts.length}</span>}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Deliveries Today</span>
              <Truck className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-light text-gray-800">{todayDeliveries}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Active Rentals</span>
              <Package className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-light text-gray-800">{activeRentals}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Unassigned</span>
              <AlertCircle className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-3xl font-light text-gray-800">{unassignedBookings.length}</div>
          </div>
          <div className={'rounded-lg border-2 p-4 ' + (conflicts.length > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200')}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Conflicts</span>
              <AlertCircle className={'w-5 h-5 ' + (conflicts.length > 0 ? 'text-red-500' : 'text-gray-400')} />
            </div>
            <div className={'text-3xl font-light ' + (conflicts.length > 0 ? 'text-red-600' : 'text-gray-800')}>{conflicts.length}</div>
          </div>
        </div>

        {view === 'calendar' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-light text-gray-800 mb-6" style={{fontFamily: 'Georgia, serif'}}>
                October 2025
              </h2>

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
                    className={'min-h-20 border rounded-lg p-2 cursor-pointer transition ' + (
                      day
                        ? day.dateStr === selectedDate
                          ? 'border-yellow-400 bg-yellow-50'
                          : day.bookings.length > 0
                          ? 'border-blue-200 bg-blue-50 hover:border-blue-400'
                          : 'border-gray-200 hover:border-gray-300'
                        : 'border-transparent'
                    )}
                  >
                    {day && (
                      <>
                        <div className={'text-sm font-medium mb-1 ' + (day.dateStr === '2025-10-20' ? 'text-yellow-600' : 'text-gray-700')}>
                          {day.date}
                        </div>
                        {day.bookings.length > 0 && (
                          <div className="space-y-1">
                            {day.bookings.slice(0, 2).map(booking => (
                              <div
                                key={booking.id}
                                className="text-xs bg-white border border-gray-200 rounded px-1 py-0.5 truncate"
                              >
                                {booking.customerName.split(' ')[0]}
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
                      key={booking.id}
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowBookingModal(true);
                      }}
                      className="border border-gray-200 rounded-lg p-3 hover:border-yellow-400 transition cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800 text-sm mb-1">
                            {booking.customerName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {booking.id}
                          </div>
                        </div>
                        <span className={'text-xs px-2 py-1 rounded border ' + getStatusColor(booking.status)}>
                          {getStatusLabel(booking.status)}
                        </span>
                      </div>

                      <div className="text-xs text-gray-600 mb-2">
                        {booking.items.length} items • ${booking.total}
                      </div>

                      {booking.driver ? (
                        <div className="text-xs text-gray-500 flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          {booking.driver}
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
            </div>
          </div>
        )}

        {view === 'inventory' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-light text-gray-800 mb-4" style={{fontFamily: 'Georgia, serif'}}>
              Inventory Tracking
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {inventory.map(item => (
                <div key={item.id} className="border-2 border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800">{item.name}</h3>
                  <p className="text-sm text-gray-600">{item.currentLocation}</p>
                  <button 
                    onClick={() => setSelectedItem(item)}
                    className="mt-2 text-sm text-yellow-600 hover:text-yellow-700 font-medium"
                  >
                    View Calendar →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'drivers' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-light text-gray-800 mb-6" style={{fontFamily: 'Georgia, serif'}}>
              Driver Management
            </h2>
            <div className="space-y-4">
              {drivers.map(driver => {
                const driverBookings = sampleBookings.filter(b => b.driver === driver.name);
                const driverEarnings = Math.round(driverBookings.reduce((sum, b) => sum + (b.total * 0.15), 0));
                return (
                  <div key={driver.id} className="border-2 border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center mr-3">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-800">{driver.name}</h3>
                          <p className="text-sm text-gray-500">{driverBookings.length} bookings assigned</p>
                        </div>
                      </div>
                      <span className="text-2xl font-light text-gray-800">
                        ${driverEarnings}
                      </span>
                    </div>
                    {driverBookings.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                        {driverBookings.map(booking => (
                          <div key={booking.id} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                            <div>
                              <span className="font-medium text-gray-800">{booking.customerName}</span>
                              <span className="text-gray-500 ml-2">• {booking.id}</span>
                            </div>
                            <span className="text-gray-600">
                              {new Date(booking.deliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {unassignedBookings.length > 0 && (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-6 mt-6">
                <div className="flex items-center mb-4">
                  <AlertCircle className="w-6 h-6 text-orange-600 mr-3" />
                  <h3 className="text-lg font-medium text-orange-800">
                    Unassigned Bookings ({unassignedBookings.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {unassignedBookings.map(booking => (
                    <div key={booking.id} className="bg-white border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-800">{booking.customerName}</h4>
                          <p className="text-sm text-gray-600">{booking.id}</p>
                        </div>
                        <span className="text-sm text-gray-600">
                          {new Date(booking.deliveryDate).toLocaleDateString()}
                        </span>
                      </div>
                      <button className="w-full bg-yellow-400 text-white py-2 rounded-lg text-sm font-medium hover:bg-yellow-500 transition">
                        Assign Driver
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'conflicts' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-light text-gray-800 mb-4" style={{fontFamily: 'Georgia, serif'}}>
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
                    <h3 className="text-lg font-medium text-red-900 mb-2">{conflict.item}</h3>
                    <p className="text-sm text-red-700 mb-3">Double-booked</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded">
                        <p className="font-medium">{conflict.booking1.customer}</p>
                        <p className="text-sm text-gray-600">{conflict.booking1.orderId}</p>
                      </div>
                      <div className="bg-white p-3 rounded">
                        <p className="font-medium">{conflict.booking2.customer}</p>
                        <p className="text-sm text-gray-600">{conflict.booking2.orderId}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-light text-gray-800" style={{fontFamily: 'Georgia, serif'}}>
                  {selectedItem.name}
                </h2>
                <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 text-2xl">
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-600">Item calendar view</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}