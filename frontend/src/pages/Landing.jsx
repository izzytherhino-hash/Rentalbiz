import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-5 flex justify-between items-center">
          <Link to="/" className="flex items-center no-underline">
            <span className="font-serif text-2xl sm:text-3xl lg:text-4xl font-light text-gray-800 tracking-tight">
              partay
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/book"
              className="bg-yellow-400 text-gray-800 px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-3.5 rounded-lg text-sm sm:text-base font-semibold uppercase tracking-wide hover:bg-yellow-500 transition-all hover:-translate-y-0.5 hover:shadow-lg no-underline whitespace-nowrap"
            >
              Get Started
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Menu"
            >
              {menuOpen ? (
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" />
              ) : (
                <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" />
              )}
            </button>
          </div>
        </div>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div className="absolute top-full right-0 mt-2 mr-4 sm:mr-10 w-56 bg-white border border-gray-200 rounded-lg shadow-xl">
            <div className="py-2">
              <Link
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 text-gray-800 hover:bg-yellow-50 hover:text-yellow-600 transition-colors no-underline"
              >
                <div className="font-medium">Admin Portal</div>
                <div className="text-xs text-gray-500">Manage bookings & inventory</div>
              </Link>
              <div className="border-t border-gray-100"></div>
              <Link
                to="/driver"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 text-gray-800 hover:bg-yellow-50 hover:text-yellow-600 transition-colors no-underline"
              >
                <div className="font-medium">Driver Portal</div>
                <div className="text-xs text-gray-500">View deliveries & routes</div>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="mt-16 sm:mt-20 pt-12 sm:pt-16 lg:pt-24 pb-8 sm:pb-10 lg:pb-14 bg-gradient-to-b from-white to-yellow-50 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10">
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-7xl font-light text-gray-800 mb-4 sm:mb-6 leading-tight tracking-tight">
            Let's Get The Partay Started
          </h1>
          <p className="text-lg sm:text-2xl lg:text-3xl text-gray-600 mb-6 sm:mb-8 lg:mb-12 font-light">
            AI-Powered Event Equipment Rentals
          </p>
          <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed mb-8 sm:mb-10 lg:mb-12 max-w-3xl mx-auto">
            Partay is an AI-enabled event equipment rental aggregator that designs your partay
            with you and then sources and arranges the best deals on rental equipment.
            So you get the best deal, best service and obviously, the best partay!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 justify-center items-center mb-12 sm:mb-16 lg:mb-20">
            <Link
              to="/book"
              className="w-full sm:w-auto bg-yellow-400 text-gray-800 px-8 sm:px-10 lg:px-12 py-3 sm:py-4 rounded-lg text-sm sm:text-base font-semibold uppercase tracking-wide hover:bg-yellow-500 transition-all hover:-translate-y-0.5 hover:shadow-xl no-underline text-center"
            >
              Plan Your Partay
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto bg-transparent text-gray-800 px-8 sm:px-10 lg:px-12 py-3 sm:py-4 border-2 border-gray-300 rounded-lg text-sm sm:text-base font-semibold uppercase tracking-wide hover:border-yellow-400 hover:text-yellow-400 transition-all no-underline text-center"
            >
              How It Works
            </a>
          </div>

          {/* Delivery Truck SVG */}
          <div className="max-w-2xl mx-auto py-10 px-5">
            <svg className="w-full h-auto" viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg">
              {/* Truck Body */}
              <rect x="250" y="100" width="300" height="120" fill="#FACC15" rx="10"/>

              {/* Cab */}
              <path d="M 200 150 L 250 150 L 250 100 L 200 120 Z" fill="#F59E0B"/>
              <rect x="140" y="120" width="60" height="100" fill="#F59E0B" rx="8"/>

              {/* Windows */}
              <rect x="150" y="130" width="40" height="35" fill="#E0F2FE" rx="4"/>
              <rect x="210" y="110" width="30" height="35" fill="#E0F2FE" rx="4"/>

              {/* Branding */}
              <text x="400" y="160" fontFamily="Georgia, serif" fontSize="48" fontWeight="300" fill="#1f2937" textAnchor="middle">
                partay
              </text>

              {/* Party decorations */}
              <circle cx="320" cy="120" r="8" fill="#FF6B9D"/>
              <circle cx="480" cy="115" r="8" fill="#FF6B9D"/>
              <circle cx="340" cy="105" r="6" fill="#9333EA"/>
              <circle cx="460" cy="108" r="6" fill="#9333EA"/>
              <circle cx="380" cy="110" r="7" fill="#06B6D4"/>
              <circle cx="420" cy="112" r="7" fill="#06B6D4"/>

              {/* Bottom detail line */}
              <line x1="250" y1="220" x2="550" y2="220" stroke="#F59E0B" strokeWidth="3"/>

              {/* Wheels */}
              <circle cx="180" cy="230" r="25" fill="#1f2937"/>
              <circle cx="180" cy="230" r="15" fill="#9CA3AF"/>
              <circle cx="300" cy="230" r="25" fill="#1f2937"/>
              <circle cx="300" cy="230" r="15" fill="#9CA3AF"/>
              <circle cx="500" cy="230" r="25" fill="#1f2937"/>
              <circle cx="500" cy="230" r="15" fill="#9CA3AF"/>

              {/* Ground shadow */}
              <ellipse cx="350" cy="255" rx="200" ry="15" fill="#000000" opacity="0.1"/>
            </svg>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 lg:py-28 px-4 sm:px-6 lg:px-10 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light text-center text-gray-800 mb-10 sm:mb-14 lg:mb-20 tracking-tight">
            Why Choose Partay?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 lg:gap-14">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-lg shadow-yellow-200">
                🤖
              </div>
              <h3 className="text-2xl text-gray-800 mb-4 font-medium">AI-Powered Design</h3>
              <p className="text-base text-gray-600 leading-relaxed">
                Our AI helps you design the perfect party setup based on your space, budget, and style preferences.
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-lg shadow-yellow-200">
                💰
              </div>
              <h3 className="text-2xl text-gray-800 mb-4 font-medium">Best Deals</h3>
              <p className="text-base text-gray-600 leading-relaxed">
                We aggregate rental equipment from multiple suppliers to find you the absolute best prices.
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-lg shadow-yellow-200">
                🚚
              </div>
              <h3 className="text-2xl text-gray-800 mb-4 font-medium">Full Service</h3>
              <p className="text-base text-gray-600 leading-relaxed">
                From delivery to setup to pickup, we handle all the logistics so you can focus on having fun.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-12 sm:py-16 lg:py-28 px-4 sm:px-6 lg:px-10 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light text-center text-gray-800 mb-10 sm:mb-14 lg:mb-20 tracking-tight">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-10">
            {[
              {
                number: '1',
                title: 'Tell Us About Your Event',
                description: 'Share your party details, space size, date, and style preferences with our AI assistant.',
              },
              {
                number: '2',
                title: 'Get AI-Designed Options',
                description: 'Receive personalized party setups with equipment recommendations that fit your space and budget.',
              },
              {
                number: '3',
                title: 'We Find The Best Deals',
                description: 'Our platform compares prices across vendors and secures the best rates for your equipment.',
              },
              {
                number: '4',
                title: 'Relax & Enjoy',
                description: 'We coordinate delivery, setup, and pickup. You just show up and celebrate!',
              },
            ].map((step) => (
              <div
                key={step.number}
                className="bg-white p-10 rounded-xl border-2 border-gray-200 hover:border-yellow-400 hover:-translate-y-1 hover:shadow-xl transition-all"
              >
                <div className="w-12 h-12 bg-yellow-400 text-gray-800 rounded-full flex items-center justify-center text-2xl font-bold mb-6">
                  {step.number}
                </div>
                <h3 className="text-xl text-gray-800 mb-3 font-semibold">{step.title}</h3>
                <p className="text-base text-gray-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 sm:py-16 lg:py-28 px-4 sm:px-6 lg:px-10 bg-gradient-to-br from-yellow-400 to-yellow-500 text-center">
        <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-light text-gray-800 mb-4 sm:mb-6 lg:mb-8 tracking-tight">
          Ready For The Best Partay Ever?
        </h2>
        <p className="text-base sm:text-lg lg:text-xl text-gray-800 mb-8 sm:mb-10 lg:mb-12">
          Join thousands of happy party hosts who trust Partay for their celebrations.
        </p>
        <Link
          to="/book"
          className="bg-gray-800 text-white px-8 sm:px-10 lg:px-12 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-semibold uppercase tracking-wide hover:bg-gray-700 transition-all inline-block no-underline"
        >
          Start Planning Now
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-white py-8 sm:py-10 lg:py-14 px-4 sm:px-6 lg:px-10 border-t border-gray-200">
        <div className="max-w-7xl mx-auto text-center">
          <div className="font-serif text-2xl sm:text-3xl font-light text-gray-800 mb-4 sm:mb-6">
            partay
          </div>
          <p className="text-gray-600 text-xs sm:text-sm">
            © 2025 Partay. All rights reserved. Let's get the partay started!
          </p>
        </div>
      </footer>
    </div>
  )
}
