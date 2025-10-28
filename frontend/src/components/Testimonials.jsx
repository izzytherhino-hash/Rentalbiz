import { Star } from 'lucide-react'

export default function Testimonials() {
  const testimonials = [
    {
      name: "Sarah Thompson",
      event: "Birthday Party",
      rating: 5,
      text: "The bounce house was a huge hit! Setup was quick and the equipment was spotless. Our kids had an amazing time!",
      date: "March 2025"
    },
    {
      name: "Michael Chen",
      event: "Company Picnic",
      rating: 5,
      text: "Professional service from start to finish. The obstacle course kept everyone entertained for hours. Highly recommend!",
      date: "February 2025"
    },
    {
      name: "Jessica Martinez",
      event: "Wedding Reception",
      rating: 5,
      text: "Made our reception unforgettable! The photo booth and games were perfect. Great communication and timely delivery.",
      date: "January 2025"
    }
  ]

  return (
    <div className="bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl font-light text-gray-800 mb-3">
            What Our Customers Say
          </h2>
          <p className="text-gray-600 text-lg">
            Join hundreds of happy customers who made their events unforgettable
          </p>
        </div>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Review Text */}
              <p className="text-gray-700 mb-4 leading-relaxed">
                {testimonial.text}
              </p>

              {/* Author Info */}
              <div className="border-t border-gray-200 pt-4">
                <p className="font-medium text-gray-800">{testimonial.name}</p>
                <p className="text-sm text-gray-500">{testimonial.event}</p>
                <p className="text-xs text-gray-400 mt-1">{testimonial.date}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Signals */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="font-serif text-4xl font-light text-yellow-500 mb-2">500+</div>
            <div className="text-gray-600 text-sm uppercase tracking-wide">Happy Customers</div>
          </div>
          <div>
            <div className="font-serif text-4xl font-light text-yellow-500 mb-2">2,000+</div>
            <div className="text-gray-600 text-sm uppercase tracking-wide">Events Hosted</div>
          </div>
          <div>
            <div className="font-serif text-4xl font-light text-yellow-500 mb-2">4.9</div>
            <div className="text-gray-600 text-sm uppercase tracking-wide">Average Rating</div>
          </div>
          <div>
            <div className="font-serif text-4xl font-light text-yellow-500 mb-2">100%</div>
            <div className="text-gray-600 text-sm uppercase tracking-wide">On-Time Delivery</div>
          </div>
        </div>
      </div>
    </div>
  )
}
