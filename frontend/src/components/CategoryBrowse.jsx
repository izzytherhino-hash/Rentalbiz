import { Link } from 'react-router-dom'
import { Sparkles, Droplets, Utensils, Gamepad2, PartyPopper, Armchair } from 'lucide-react'

export default function CategoryBrowse() {
  const categories = [
    {
      name: 'Bounce Houses',
      icon: PartyPopper,
      description: 'Classic inflatables for endless bouncing fun',
      color: 'bg-pink-100 text-pink-600 hover:bg-pink-200',
      category: 'Bounce Houses'
    },
    {
      name: 'Water Slides',
      icon: Droplets,
      description: 'Make a splash with exciting water attractions',
      color: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
      category: 'Water Slides'
    },
    {
      name: 'Tables & Chairs',
      icon: Armchair,
      description: 'Complete seating solutions for your guests',
      color: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
      category: 'Tables & Chairs'
    },
    {
      name: 'Games',
      icon: Gamepad2,
      description: 'Interactive games and activities for all ages',
      color: 'bg-purple-100 text-purple-600 hover:bg-purple-200',
      category: 'Games'
    },
    {
      name: 'Concessions',
      icon: Utensils,
      description: 'Popcorn, cotton candy, and more treats',
      color: 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200',
      category: 'Concessions'
    },
    {
      name: 'Party Extras',
      icon: Sparkles,
      description: 'Special additions to make your event shine',
      color: 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200',
      category: 'Party Extras'
    }
  ]

  return (
    <div className="bg-white py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl font-light text-gray-800 mb-3">
            Browse by Category
          </h2>
          <p className="text-gray-600 text-lg">
            Find exactly what you need for your perfect party
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <Link
                key={category.name}
                to={`/book?category=${encodeURIComponent(category.category)}`}
                className="group"
              >
                <div className="border border-gray-200 rounded-lg p-6 sm:p-8 hover:border-yellow-400 hover:shadow-lg transition-all duration-300">
                  <div className={`w-16 h-16 rounded-full ${category.color} flex items-center justify-center mb-4 transition-colors`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="font-medium text-xl text-gray-800 mb-2 group-hover:text-yellow-600 transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {category.description}
                  </p>
                  <div className="mt-4 text-sm font-medium text-yellow-600 group-hover:text-yellow-700">
                    Browse {category.name} →
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
