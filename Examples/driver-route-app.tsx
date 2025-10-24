import React, { useState } from 'react';
import { MapPin, Phone, Navigation, CheckCircle, Package, Clock, User, ArrowLeft, Warehouse, AlertCircle } from 'lucide-react';

const drivers = [
  { id: 1, name: 'Mike Johnson' },
  { id: 2, name: 'Sarah Chen' },
  { id: 3, name: 'James Rodriguez' },
];

const sampleStops = [
  {
    id: 'w1',
    type: 'warehouse_pickup',
    warehouseName: 'Warehouse A - Main',
    address: '1500 Adams Ave, Costa Mesa, CA 92626',
    items: [
      { name: 'Bounce House Castle', forOrder: 'PR-2847' },
      { name: 'Cotton Candy Machine', forOrder: 'PR-2847' },
    ],
    instructions: 'Load all items carefully. Check for damage.',
    status: 'pending',
    stopNumber: 1,
  },
  {
    id: 'd1',
    type: 'delivery',
    orderNumber: 'PR-2847',
    customerName: 'Jennifer Martinez',
    customerPhone: '(714) 555-0123',
    address: '1234 Ocean View Dr, Costa Mesa, CA 92627',
    timeWindow: '10:00 AM - 11:00 AM',
    rentalDays: 1,
    items: ['Bounce House Castle', 'Cotton Candy Machine'],
    instructions: 'Gate code: 1234. Set up in backyard.',
    deliveryFee: 50,
    tip: 20,
    status: 'pending',
    stopNumber: 2,
  },
  {
    id: 'p1',
    type: 'pickup',
    orderNumber: 'PR-2801',
    customerName: 'Robert Chen',
    customerPhone: '(714) 555-9999',
    address: '4500 MacArthur Blvd, Newport Beach, CA 92660',
    timeWindow: '3:00 PM - 4:00 PM',
    items: ['Mini Bounce House', 'Tables & Chairs Set'],
    instructions: 'Equipment is in garage.',
    nextBooking: {
      hasNext: true,
      deliveryDate: 'Tomorrow (Oct 21)',
      warehouse: 'Warehouse B - North',
    },
    status: 'pending',
    stopNumber: 3,
  },
  {
    id: 'w2',
    type: 'warehouse_return',
    warehouseName: 'Warehouse B - North',
    address: '2800 Harbor Blvd, Costa Mesa, CA 92626',
    items: [
      { name: 'Mini Bounce House', reason: 'Booked for tomorrow' },
      { name: 'Tables & Chairs Set', reason: 'Booked for tomorrow' },
    ],
    instructions: 'CRITICAL: These items are booked for tomorrow. Do NOT take to Warehouse A.',
    status: 'pending',
    stopNumber: 4,
  },
];

export default function DriverDashboard() {
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [stops, setStops] = useState(sampleStops);
  const [expandedStop, setExpandedStop] = useState(null);

  const deliveryStops = stops.filter(s => s.type === 'delivery');
  const totalEarnings = deliveryStops.reduce((sum, s) => sum + (s.deliveryFee || 0) + (s.tip || 0), 0);
  const completedStops = stops.filter(s => s.status === 'completed').length;

  const handleStatusChange = (stopId, newStatus) => {
    setStops(stops.map(s => 
      s.id === stopId ? { ...s, status: newStatus } : s
    ));
  };

  const openNavigation = (address) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
  };

  const callCustomer = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  const getStopTypeLabel = (type) => {
    const labels = {
      'warehouse_pickup': 'Warehouse Pickup',
      'delivery': 'Customer Delivery',
      'pickup': 'Customer Pickup',
      'warehouse_return': 'Warehouse Return'
    };
    return labels[type] || 'Stop';
  };

  const getStopColor = (type) => {
    const colors = {
      'warehouse_pickup': 'bg-blue-50 border-blue-300',
      'delivery': 'bg-yellow-50 border-yellow-300',
      'pickup': 'bg-purple-50 border-purple-300',
      'warehouse_return': 'bg-green-50 border-green-300'
    };
    return colors[type] || 'bg-gray-50 border-gray-300';
  };

  const getStopIcon = (type) => {
    const icons = {
      'warehouse_pickup': <Warehouse className="w-5 h-5 text-blue-600" />,
      'delivery': <Package className="w-5 h-5 text-yellow-600" />,
      'pickup': <Package className="w-5 h-5 text-purple-600" />,
      'warehouse_return': <Warehouse className="w-5 h-5 text-green-600" />
    };
    return icons[type] || <MapPin className="w-5 h-5" />;
  };

  if (!selectedDriver) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-light text-gray-800 mb-2" style={{fontFamily: 'Georgia, serif'}}>
              Driver Portal
            </h1>
            <p className="text-gray-600 text-sm">Select your name to view route</p>
          </div>

          <div className="space-y-3">
            {drivers.map(driver => (
              <button
                key={driver.id}
                onClick={() => setSelectedDriver(driver)}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-400 hover:bg-yellow-50 transition text-left flex items-center"
              >
                <User className="w-5 h-5 text-gray-400 mr-3" />
                <span className="font-medium text-gray-800">{driver.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedDriver(null)}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="text-sm">Logout</span>
            </button>
            <div className="text-center">
              <h1 className="text-xl font-light text-gray-800" style={{fontFamily: 'Georgia, serif'}}>
                {selectedDriver.name}
              </h1>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div className="w-16"></div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-light text-gray-800">{stops.length}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Total Stops</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-light text-gray-800">{completedStops}/{stops.length}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Complete</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-light text-yellow-500">${totalEarnings}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Earnings</div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-4">
            Route Stops ({stops.length})
          </h2>

          {stops.map((stop) => (
            <div
              key={stop.id}
              className={`bg-white rounded-lg border-2 overflow-hidden transition ${
                stop.status === 'completed' 
                  ? 'border-gray-300 opacity-60' 
                  : getStopColor(stop.type)
              }`}
            >
              <div
                onClick={() => setExpandedStop(expandedStop === stop.id ? null : stop.id)}
                className="p-4 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start flex-1">
                    <div className="w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center font-bold mr-3 flex-shrink-0">
                      {stop.stopNumber}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        {getStopIcon(stop.type)}
                        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide ml-2">
                          {getStopTypeLabel(stop.type)}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-800">
                        {stop.warehouseName || stop.customerName}
                      </h3>
                      {stop.orderNumber && (
                        <p className="text-xs text-gray-500 mt-1">Order {stop.orderNumber}</p>
                      )}
                    </div>
                  </div>
                  {stop.status === 'completed' && (
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                  )}
                </div>

                {stop.timeWindow && (
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>{stop.timeWindow}</span>
                  </div>
                )}

                <div className="flex items-start text-sm text-gray-700 mb-3">
                  <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{stop.address}</span>
                </div>

                {stop.type === 'delivery' && (
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex items-center text-sm">
                      <Package className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">{stop.items?.length || 0} items</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 mr-3">Fee: ${stop.deliveryFee}</span>
                      <span className="text-sm font-medium text-yellow-600">Tip: ${stop.tip}</span>
                    </div>
                  </div>
                )}
              </div>

              {expandedStop === stop.id && (
                <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                      Items
                    </h4>
                    <ul className="space-y-2">
                      {stop.items?.map((item, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start bg-white rounded p-2">
                          <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                          <div className="flex-1">
                            <div>{typeof item === 'string' ? item : item.name}</div>
                            {item.forOrder && (
                              <div className="text-xs text-gray-500 mt-0.5">For order {item.forOrder}</div>
                            )}
                            {item.reason && (
                              <div className="text-xs text-purple-600 mt-0.5">{item.reason}</div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {stop.instructions && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                        Instructions
                      </h4>
                      <div className={`text-sm p-3 rounded border ${
                        stop.instructions.includes('CRITICAL')
                          ? 'bg-red-50 border-red-300 text-red-800'
                          : 'bg-yellow-50 border-yellow-200 text-gray-700'
                      }`}>
                        {stop.instructions.includes('CRITICAL') && (
                          <div className="flex items-start mb-2">
                            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-red-600" />
                            <span className="font-medium">IMPORTANT</span>
                          </div>
                        )}
                        {stop.instructions}
                      </div>
                    </div>
                  )}

                  {stop.nextBooking && (
                    <div className={`p-3 rounded border ${
                      stop.nextBooking.hasNext 
                        ? 'bg-orange-50 border-orange-300'
                        : 'bg-gray-100 border-gray-300'
                    }`}>
                      <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                        Return Instructions
                      </h4>
                      {stop.nextBooking.hasNext ? (
                        <div className="text-sm text-orange-800">
                          <div className="flex items-center mb-1">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            <span className="font-medium">Already Booked!</span>
                          </div>
                          <div>Next delivery: {stop.nextBooking.deliveryDate}</div>
                          <div className="font-medium mt-2">Return to: {stop.nextBooking.warehouse}</div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-700">
                          No upcoming booking. Return to: {stop.nextBooking.warehouse}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {stop.customerPhone && (
                      <button
                        onClick={() => callCustomer(stop.customerPhone)}
                        className="flex items-center justify-center py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-yellow-400 transition"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">Call</span>
                      </button>
                    )}
                    <button
                      onClick={() => openNavigation(stop.address)}
                      className={`flex items-center justify-center py-3 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 transition ${!stop.customerPhone ? 'col-span-2' : ''}`}
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">Navigate</span>
                    </button>
                  </div>

                  {stop.status === 'pending' ? (
                    <button
                      onClick={() => handleStatusChange(stop.id, 'completed')}
                      className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition flex items-center justify-center"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Mark as Complete
                    </button>
                  ) : (
                    <div className="flex items-center justify-center py-3 bg-green-100 text-green-700 rounded-lg">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <span className="font-medium">Completed</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {completedStops === stops.length && (
          <div className="bg-yellow-400 text-white rounded-lg p-6 mt-6 text-center">
            <h3 className="text-2xl font-light mb-2" style={{fontFamily: 'Georgia, serif'}}>
              Route Complete!
            </h3>
            <p className="mb-4">All stops finished for today</p>
            <div className="text-3xl font-light mb-2">${totalEarnings}</div>
            <p className="text-sm opacity-90">Total Earnings Today</p>
          </div>
        )}
      </div>
    </div>
  );
}