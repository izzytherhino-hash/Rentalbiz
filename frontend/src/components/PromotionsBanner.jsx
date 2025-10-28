import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'

export default function PromotionsBanner() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 text-gray-800 py-3 px-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-white rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto flex items-center justify-between relative z-10">
        <div className="flex-1 flex items-center justify-center gap-3">
          <Sparkles className="w-5 h-5 flex-shrink-0 hidden sm:block" />
          <p className="text-sm sm:text-base font-semibold text-center">
            <span className="hidden sm:inline">🎉 </span>
            <span className="font-bold">Fall Special:</span> 15% off all weekend bookings in October!
            <span className="hidden md:inline ml-2 font-normal">Use code: FALL2025</span>
          </p>
          <Sparkles className="w-5 h-5 flex-shrink-0 hidden sm:block" />
        </div>

        <button
          onClick={() => setIsVisible(false)}
          className="ml-4 p-1 hover:bg-yellow-600 rounded-full transition-colors flex-shrink-0"
          aria-label="Close banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
