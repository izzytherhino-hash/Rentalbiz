/**
 * LocationSelector Component
 *
 * Multi-select location picker for Craigslist searches.
 * Allows selecting state → cities with visual chips for selected locations.
 */

import { useState, useEffect } from 'react';
import { MapPin, X } from 'lucide-react';

// Craigslist city data organized by state
const CRAIGSLIST_LOCATIONS = {
  'Massachusetts': ['boston', 'worcester', 'capecod', 'southcoast', 'westernmass'],
  'Rhode Island': ['providence'],
  'Connecticut': ['newhaven', 'hartford', 'easternct'],
  'New York': ['newyork', 'albany', 'buffalo', 'rochester', 'syracuse', 'longisland'],
  'California': ['losangeles', 'sfbay', 'sandiego', 'orangecounty', 'inlandempire', 'sacramento', 'fresno', 'bakersfield', 'ventura', 'santabarbara'],
  'Florida': ['miami', 'orlando', 'tampa', 'jacksonville', 'tallahassee'],
  'Texas': ['houston', 'dallas', 'austin', 'sanantonio', 'elpaso'],
  'Pennsylvania': ['philadelphia', 'pittsburgh', 'harrisburg', 'allentown'],
  'Illinois': ['chicago', 'champaign', 'peoria', 'rockford'],
  'Ohio': ['cleveland', 'columbus', 'cincinnati', 'toledo', 'akron'],
  'Georgia': ['atlanta', 'athens', 'augusta', 'savannah', 'macon'],
  'North Carolina': ['charlotte', 'raleigh', 'greensboro', 'wilmington', 'asheville'],
  'Michigan': ['detroit', 'annarbor', 'lansing', 'grandrapids', 'flint'],
  'New Jersey': ['newjersey', 'jerseyshore', 'southjersey', 'cnj'],
  'Virginia': ['richmond', 'norfolk', 'roanoke', 'charlottesville'],
  'Washington': ['seattle', 'spokane', 'olympic', 'bellingham'],
  'Arizona': ['phoenix', 'tucson', 'flagstaff', 'yuma'],
  'Tennessee': ['nashville', 'memphis', 'knoxville', 'chattanooga'],
  'Indiana': ['indianapolis', 'bloomington', 'fortwayne', 'southbend'],
  'Missouri': ['stlouis', 'kansascity', 'springfield', 'columbiamo'],
  'Maryland': ['baltimore', 'frederick', 'easternshore'],
  'Wisconsin': ['milwaukee', 'madison', 'greenbay', 'appleton'],
  'Minnesota': ['minneapolis', 'duluth', 'rochester', 'mankato'],
  'Colorado': ['denver', 'boulder', 'cosprings', 'fortcollins'],
  'Alabama': ['birmingham', 'huntsville', 'mobile', 'montgomery'],
  'South Carolina': ['charleston', 'columbia', 'greenville', 'myrtlebeach'],
  'Louisiana': ['neworleans', 'batonrouge', 'lafayette', 'shreveport'],
  'Kentucky': ['louisville', 'lexington', 'owensboro', 'bowling green'],
  'Oregon': ['portland', 'eugene', 'salem', 'medford'],
  'Oklahoma': ['oklahomacity', 'tulsa', 'stillwater', 'lawton'],
  'Nevada': ['lasvegas', 'reno', 'elko'],
  'New Mexico': ['albuquerque', 'santafe', 'lascruces', 'farmington'],
  'West Virginia': ['charleston', 'huntington', 'morgantown', 'wheeling'],
  'Nebraska': ['omaha', 'lincoln', 'grandisland', 'northplatte'],
  'Idaho': ['boise', 'twinfalls', 'lewiston', 'idahofalls'],
  'Hawaii': ['honolulu'],
  'Maine': ['maine'],
  'New Hampshire': ['nh'],
  'Vermont': ['burlington'],
  'Delaware': ['delaware'],
  'Alaska': ['anchorage', 'fairbanks', 'kenai'],
};

export default function LocationSelector({ selectedLocations, onLocationsChange, maxSelections = 5 }) {
  const [selectedState, setSelectedState] = useState('');
  const [availableCities, setAvailableCities] = useState([]);

  // Update available cities when state changes
  useEffect(() => {
    if (selectedState) {
      setAvailableCities(CRAIGSLIST_LOCATIONS[selectedState] || []);
    } else {
      setAvailableCities([]);
    }
  }, [selectedState]);

  const handleAddCity = (city) => {
    if (selectedLocations.length >= maxSelections) {
      alert(`Maximum ${maxSelections} locations allowed`);
      return;
    }

    if (!selectedLocations.includes(city)) {
      onLocationsChange([...selectedLocations, city]);
    }
  };

  const handleRemoveCity = (city) => {
    onLocationsChange(selectedLocations.filter((loc) => loc !== city));
  };

  const handleSelectAll = () => {
    if (!selectedState) return;

    const citiesToAdd = CRAIGSLIST_LOCATIONS[selectedState]
      .filter((city) => !selectedLocations.includes(city))
      .slice(0, maxSelections - selectedLocations.length);

    onLocationsChange([...selectedLocations, ...citiesToAdd]);
  };

  const handleClearAll = () => {
    onLocationsChange([]);
  };

  return (
    <div className="space-y-4">
      {/* State selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MapPin className="w-4 h-4 inline mr-1" />
          Select State
        </label>
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
        >
          <option value="">-- Choose a state --</option>
          {Object.keys(CRAIGSLIST_LOCATIONS).sort().map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </div>

      {/* City selector */}
      {availableCities.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Cities ({selectedLocations.length}/{maxSelections})
            </label>
            <div className="space-x-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm text-yellow-600 hover:text-yellow-700 font-medium"
                disabled={selectedLocations.length >= maxSelections}
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                disabled={selectedLocations.length === 0}
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
            {availableCities.map((city) => {
              const isSelected = selectedLocations.includes(city);
              const isDisabled = !isSelected && selectedLocations.length >= maxSelections;

              return (
                <label
                  key={city}
                  className={`
                    flex items-center space-x-2 px-3 py-2 rounded cursor-pointer transition-colors
                    ${isSelected
                      ? 'bg-yellow-100 border-2 border-yellow-400'
                      : isDisabled
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white border-2 border-gray-200 hover:border-yellow-300'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={() => {
                      if (isSelected) {
                        handleRemoveCity(city);
                      } else {
                        handleAddCity(city);
                      }
                    }}
                    className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-400"
                  />
                  <span className="text-sm capitalize">{city}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected locations chips */}
      {selectedLocations.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selected Locations ({selectedLocations.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedLocations.map((city) => (
              <div
                key={city}
                className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium border border-yellow-300"
              >
                <span className="capitalize">{city}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCity(city)}
                  className="hover:bg-yellow-200 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${city}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {selectedLocations.length === 0 && (
        <div className="text-center py-6 text-gray-500 text-sm">
          <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          Select a state and choose cities to search
        </div>
      )}
    </div>
  );
}
