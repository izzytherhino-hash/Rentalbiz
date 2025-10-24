import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'

// Lazy load all pages for better performance
const Landing = lazy(() => import('./pages/Landing'))
const CustomerBooking = lazy(() => import('./pages/CustomerBooking'))
const DriverDashboard = lazy(() => import('./pages/DriverDashboard'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/book" element={<CustomerBooking />} />
          <Route path="/driver" element={<DriverDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App
