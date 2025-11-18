/**
 * SearchResults Component
 *
 * Displays Craigslist search results with filtering, sorting, and pagination.
 * Each result shows AI-generated summary, price, location, and direct link.
 */

import { useState, useMemo } from 'react';
import {
  ExternalLink,
  MapPin,
  DollarSign,
  Calendar,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  Star,
  AlertCircle,
  ImageOff,
} from 'lucide-react';

export default function SearchResults({
  results,
  searchParams,
  totalFound,
  locationsSearched,
  errors,
  originalPrompt,
}) {
  // Filters and sorting
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedCity, setSelectedCity] = useState('all');
  const [sortBy, setSortBy] = useState('relevance'); // relevance, price-low, price-high, date
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 12;

  // Get unique cities from results
  const uniqueCities = useMemo(() => {
    const cities = [...new Set(results.map((r) => r.city))];
    return cities.sort();
  }, [results]);

  // Apply filters and sorting
  const filteredAndSortedResults = useMemo(() => {
    let filtered = [...results];

    // Filter by price range
    if (priceRange.min !== '') {
      filtered = filtered.filter((r) => r.price >= parseFloat(priceRange.min));
    }
    if (priceRange.max !== '') {
      filtered = filtered.filter((r) => r.price <= parseFloat(priceRange.max));
    }

    // Filter by city
    if (selectedCity !== 'all') {
      filtered = filtered.filter((r) => r.city === selectedCity);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return (a.price || 0) - (b.price || 0);
        case 'price-high':
          return (b.price || 0) - (a.price || 0);
        case 'date':
          return new Date(b.posted_date || 0) - new Date(a.posted_date || 0);
        case 'relevance':
        default:
          return (b.relevance_score || 0) - (a.relevance_score || 0);
      }
    });

    return filtered;
  }, [results, priceRange, selectedCity, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedResults.length / itemsPerPage);
  const paginatedResults = filteredAndSortedResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  const handleFilterChange = (filterFn) => {
    filterFn();
    setCurrentPage(1);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown date';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getRelevanceBadge = (score) => {
    if (score >= 8) return { text: 'Excellent Match', color: 'bg-green-100 text-green-800 border-green-300' };
    if (score >= 6) return { text: 'Good Match', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    if (score >= 4) return { text: 'Fair Match', color: 'bg-gray-100 text-gray-800 border-gray-300' };
    return { text: 'Weak Match', color: 'bg-red-100 text-red-800 border-red-300' };
  };

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Search Results</h3>
            <p className="text-sm text-gray-600">
              Found <span className="font-semibold">{filteredAndSortedResults.length}</span> of{' '}
              <span className="font-semibold">{totalFound}</span> listings
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Searched: {locationsSearched.join(', ')}
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
          </button>
        </div>

        {/* Search Parameters Display */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">
            <strong>Search Query:</strong> "{originalPrompt}"
          </p>
          <div className="flex flex-wrap gap-2 text-sm text-gray-600">
            <span>
              <strong>Category:</strong> {searchParams.category}
            </span>
            {searchParams.min_price && (
              <span>
                <strong>Min Price:</strong> ${searchParams.min_price}
              </span>
            )}
            {searchParams.max_price && (
              <span>
                <strong>Max Price:</strong> ${searchParams.max_price}
              </span>
            )}
            {searchParams.keywords && searchParams.keywords.length > 0 && (
              <span>
                <strong>Keywords:</strong> {searchParams.keywords.join(', ')}
              </span>
            )}
          </div>
        </div>

        {/* Errors Display */}
        {errors && errors.length > 0 && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Some locations failed:</p>
                <ul className="text-sm mt-1 list-disc list-inside">
                  {errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Price Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceRange.min}
                  onChange={(e) =>
                    handleFilterChange(() => setPriceRange({ ...priceRange, min: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={priceRange.max}
                  onChange={(e) =>
                    handleFilterChange(() => setPriceRange({ ...priceRange, max: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            </div>

            {/* City Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <select
                value={selectedCity}
                onChange={(e) => handleFilterChange(() => setSelectedCity(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">All Cities</option>
                {uniqueCities.map((city) => (
                  <option key={city} value={city} className="capitalize">
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
              >
                <option value="relevance">Relevance</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="date">Date: Newest First</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results List */}
      {paginatedResults.length > 0 ? (
        <div className="space-y-4">
          {paginatedResults.map((listing, idx) => {
            const relevanceBadge = getRelevanceBadge(listing.relevance_score);

            return (
              <div
                key={listing.listing_id || idx}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-5 border-l-4 border-yellow-400"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Main Content */}
                  <div className="flex-1 space-y-2">
                    {/* Title and Relevance */}
                    <div className="flex items-start gap-3">
                      <h4 className="font-semibold text-lg text-gray-800 flex-1" title={listing.title}>
                        {listing.title}
                      </h4>
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium border shrink-0 ${relevanceBadge.color}`}
                      >
                        <Star className="w-3 h-3 inline mr-1" />
                        {listing.relevance_score}/10
                      </div>
                    </div>

                    {/* AI Summary */}
                    <p className="text-sm text-gray-600">{listing.ai_summary}</p>

                    {/* Flags */}
                    {listing.flags && listing.flags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {listing.flags.slice(0, 3).map((flag, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Meta Info Row */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      {listing.price && (
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                          <span className="font-semibold text-green-700">${listing.price}</span>
                        </div>
                      )}
                      {listing.location && (
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span className="capitalize">
                            {listing.location}, {listing.city}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>{formatDate(listing.posted_date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* View Button */}
                  <a
                    href={listing.listing_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <span>View Listing</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 font-medium">No results match your filters</p>
          <p className="text-sm text-gray-500 mt-1">Try adjusting your price range or location filter</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
