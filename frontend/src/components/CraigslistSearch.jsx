/**
 * CraigslistSearch Component
 *
 * Main search interface for AI-powered Craigslist searches.
 * Includes location selector, natural language prompt, and results display.
 */

import { useState } from 'react';
import { Search, Loader, AlertCircle, Sparkles } from 'lucide-react';
import LocationSelector from './LocationSelector';
import SearchResults from './SearchResults';
import { exploreAPI } from '../services/api';

export default function CraigslistSearch() {
  const [searchPrompt, setSearchPrompt] = useState('');
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [maxResults, setMaxResults] = useState(50);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [error, setError] = useState(null);
  const [showSearchForm, setShowSearchForm] = useState(true);

  // Craigslist categories
  const categories = [
    { value: 'all', label: 'All Categories' },
    // For Sale
    { value: 'furniture', label: 'Furniture' },
    { value: 'appliances', label: 'Appliances' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'antiques', label: 'Antiques' },
    { value: 'bikes', label: 'Bikes' },
    { value: 'books', label: 'Books' },
    { value: 'clothing', label: 'Clothing & Accessories' },
    { value: 'computers', label: 'Computers' },
    { value: 'tools', label: 'Tools' },
    { value: 'household', label: 'Household Items' },
    { value: 'sporting', label: 'Sporting Goods' },
    { value: 'toys', label: 'Toys & Games' },
    { value: 'jewelry', label: 'Jewelry' },
    { value: 'materials', label: 'Materials' },
    { value: 'music', label: 'Musical Instruments' },
    { value: 'photo', label: 'Photo/Video Equipment' },
    { value: 'free', label: 'Free Stuff' },
    { value: 'cars', label: 'Cars & Trucks' },
    { value: 'motorcycles', label: 'Motorcycles' },
    { value: 'boats', label: 'Boats' },
    // Real Estate / Housing
    { value: 'housing', label: '--- Housing ---', disabled: true },
    { value: 'apartments', label: 'Apartments / Housing for Rent' },
    { value: 'rooms', label: 'Rooms & Shares' },
    { value: 'office', label: 'Office & Commercial Space' },
    { value: 'parking', label: 'Parking & Storage' },
    { value: 'real_estate', label: 'Real Estate for Sale' },
  ];

  const handleSearch = async () => {
    // Validation
    if (!searchPrompt.trim()) {
      setError('Please enter a search query');
      return;
    }

    if (selectedLocations.length === 0) {
      setError('Please select at least one location');
      return;
    }

    setError(null);
    setIsSearching(true);

    try {
      const result = await exploreAPI.searchCraigslist(
        searchPrompt.trim(),
        selectedLocations,
        maxResults,
        selectedCategory
      );

      setSearchResults(result);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Search failed. Please try again.');
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSearch();
    }
  };

  const handleClearResults = () => {
    setSearchResults(null);
    setError(null);
  };

  // Example prompts
  const examplePrompts = [
    "cheap furniture in good condition under $200",
    "vintage bikes for sale",
    "free stuff near me",
    "used appliances like refrigerator or washer",
    "antique furniture with detailed photos",
  ];

  return (
    <div className="space-y-6">
      {/* Search Interface */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Sparkles className="w-6 h-6 mr-2 text-yellow-500" />
            AI-Powered Craigslist Search
          </h2>
          {searchResults && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowSearchForm(!showSearchForm)}
                className="text-sm text-yellow-600 hover:text-yellow-700 font-medium"
              >
                {showSearchForm ? 'Hide' : 'Edit'} Search
              </button>
              <button
                onClick={handleClearResults}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                New Search
              </button>
            </div>
          )}
        </div>

        {(!searchResults || showSearchForm) && (
          <>
            {/* Search Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What are you looking for?
              </label>
              <textarea
                value={searchPrompt}
                onChange={(e) => setSearchPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe what you're looking for in natural language..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
                rows={4}
                disabled={isSearching}
              />
              <p className="mt-2 text-sm text-gray-500">
                Tip: Press Ctrl+Enter to search. Be specific about condition, price range, or features.
              </p>
            </div>

            {/* Example Prompts */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Example searches:</p>
              <div className="flex flex-wrap gap-2">
                {examplePrompts.map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSearchPrompt(example)}
                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-yellow-100 text-gray-700 hover:text-yellow-800 rounded-full border border-gray-200 hover:border-yellow-300 transition-colors"
                    disabled={isSearching}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category (helps narrow down results)
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                disabled={isSearching}
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value} disabled={cat.disabled}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Selecting a specific category will make your search results more relevant
              </p>
            </div>

            {/* Location Selector */}
            <LocationSelector
              selectedLocations={selectedLocations}
              onLocationsChange={setSelectedLocations}
              maxSelections={5}
            />

            {/* Advanced Options */}
            <div className="border-t pt-4">
              <details className="group">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900 flex items-center">
                  Advanced Options
                  <span className="ml-2 text-gray-400 group-open:rotate-90 transition-transform">▶</span>
                </summary>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Results: {maxResults}
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="10"
                      value={maxResults}
                      onChange={(e) => setMaxResults(parseInt(e.target.value))}
                      className="w-full"
                      disabled={isSearching}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>10</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>
              </details>
            </div>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchPrompt.trim() || selectedLocations.length === 0}
              className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSearching ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Search Craigslist</span>
                </>
              )}
            </button>
          </>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Search Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchResults && (
        <SearchResults
          results={searchResults.results}
          searchParams={searchResults.search_params}
          totalFound={searchResults.total_found}
          locationsSearched={searchResults.locations_searched}
          errors={searchResults.errors}
          originalPrompt={searchPrompt}
        />
      )}
    </div>
  );
}
