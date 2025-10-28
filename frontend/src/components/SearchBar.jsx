import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'

export default function SearchBar() {
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/book?search=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      navigate('/book')
    }
  }

  return (
    <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto">
      <div className="relative flex items-center">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for bounce houses, tables, games..."
          className="w-full px-6 py-4 pr-32 text-base rounded-lg border-2 border-gray-300 focus:border-yellow-400 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          className="absolute right-2 bg-yellow-400 text-gray-800 px-6 py-2.5 rounded-md font-semibold hover:bg-yellow-500 transition-colors flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search</span>
        </button>
      </div>
    </form>
  )
}
