import { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { CheckCircle, Calendar, MapPin, Package, Phone, Mail } from 'lucide-react'

export default function OrderConfirmation() {
  const location = useLocation()
  const [bookingData, setBookingData] = useState(null)

  useEffect(() => {
    // Get booking data from navigation state
    if (location.state && location.state.booking) {
      setBookingData(location.state.booking)
    }
  }, [location])

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-800 mb-4">No booking found</h1>
          <Link
            to="/"
            className="inline-block bg-yellow-400 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-yellow-500 transition-colors no-underline"
          >
            Return Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Success Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-light text-gray-800 mb-3">
            Booking Confirmed!
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Your party equipment has been reserved
          </p>
          <div className="inline-block bg-yellow-50 border border-yellow-200 rounded-lg px-6 py-3">
            <p className="text-sm text-gray-600 mb-1">Order Number</p>
            <p className="text-2xl font-bold text-gray-800">{bookingData.order_number}</p>
          </div>
        </div>

        {/* Booking Details */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Booking Details</h2>

          {/* Dates */}
          <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-200">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 mb-1">Event Dates</p>
              <p className="text-base text-gray-900">
                Delivery: {new Date(bookingData.delivery_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-base text-gray-900">
                Pickup: {new Date(bookingData.pickup_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-200">
            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 mb-1">Delivery Address</p>
              <p className="text-base text-gray-900">
                {bookingData.delivery_address}
              </p>
            </div>
          </div>

          {/* Items */}
          <div className="flex items-start gap-4">
            <Package className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 mb-3">Rental Items</p>
              <div className="space-y-3">
                {bookingData.items && bookingData.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <span className="text-base text-gray-900">{item.name}</span>
                    <span className="text-base font-medium text-gray-900">
                      ${parseFloat(item.price).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Payment Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal</span>
              <span>${parseFloat(bookingData.subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Delivery Fee</span>
              <span>${parseFloat(bookingData.delivery_fee || 0).toFixed(2)}</span>
            </div>
            {bookingData.tip && parseFloat(bookingData.tip) > 0 && (
              <div className="flex justify-between text-gray-700">
                <span>Driver Tip</span>
                <span>${parseFloat(bookingData.tip).toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="flex justify-between text-lg font-semibold text-gray-900">
                <span>Total</span>
                <span>${parseFloat(bookingData.total_price || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">What Happens Next?</h2>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-yellow-400 text-gray-800 rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </span>
              <span className="text-gray-700">
                You'll receive a confirmation email with your booking details
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-yellow-400 text-gray-800 rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </span>
              <span className="text-gray-700">
                Our team will prepare your equipment and confirm delivery time
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-yellow-400 text-gray-800 rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </span>
              <span className="text-gray-700">
                We'll deliver and set up everything on your scheduled date
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-yellow-400 text-gray-800 rounded-full flex items-center justify-center text-sm font-semibold">
                4
              </span>
              <span className="text-gray-700">
                Enjoy your partay! We'll pick up the equipment after your event
              </span>
            </li>
          </ol>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Need Help?</h2>
          <p className="text-gray-600 mb-4">
            Our team is here to make your event perfect. Reach out anytime!
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <a href="tel:+15555551234" className="text-gray-700 hover:text-yellow-600 transition-colors">
                (555) 555-1234
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <a href="mailto:hello@partay.com" className="text-gray-700 hover:text-yellow-600 transition-colors">
                hello@partay.com
              </a>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/"
            className="flex-1 bg-yellow-400 text-gray-800 px-6 py-3 rounded-lg text-center font-semibold hover:bg-yellow-500 transition-colors no-underline"
          >
            Return Home
          </Link>
          <button
            onClick={() => window.print()}
            className="flex-1 bg-white text-gray-800 px-6 py-3 rounded-lg font-semibold border-2 border-gray-300 hover:border-yellow-400 hover:text-yellow-600 transition-colors"
          >
            Print Confirmation
          </button>
        </div>
      </div>
    </div>
  )
}
