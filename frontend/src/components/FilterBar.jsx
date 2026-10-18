import React from 'react';
import { Search, MapPin, Users, IndianRupee, RotateCcw } from 'lucide-react';

export default function FilterBar({
  filters,
  onChange,
  onReset,
  cities = ['Bengaluru', 'Hyderabad', 'Mumbai', 'Delhi NCR', 'Chennai'],
}) {
  const handleInputChange = (field, value) => {
    onChange({
      ...filters,
      [field]: value,
    });
  };

  const hasActiveFilters = Boolean(
    filters.q || filters.city || filters.min_capacity || filters.max_price
  );

  return (
    <div className="bg-sand rounded-2xl border border-sand-dark p-4 md:p-6 shadow-sm mb-8 space-y-4">
      {/* Top Row: Search Input */}
      <div className="relative">
        <label htmlFor="venue-search" className="sr-only">
          Search venues by name or keywords
        </label>
        <Search className="w-5 h-5 text-wine absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id="venue-search"
          type="text"
          value={filters.q || ''}
          onChange={(e) => handleInputChange('q', e.target.value)}
          placeholder="Search venues by name, features, or keywords..."
          className="w-full pl-12 pr-4 py-3 bg-sand-dark/30 border border-sand-dark rounded-xl text-ink placeholder-ink/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-wine focus:bg-sand transition-all"
        />
      </div>

      {/* Filter Selectors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 pt-1">
        
        {/* City Filter */}
        <div className="space-y-1.5">
          <label htmlFor="filter-city" className="flex items-center gap-1.5 text-xs font-heading uppercase tracking-wider text-ink/80">
            <MapPin className="w-3.5 h-3.5 text-wine" />
            <span>City</span>
          </label>
          <select
            id="filter-city"
            value={filters.city || ''}
            onChange={(e) => handleInputChange('city', e.target.value)}
            className="w-full px-3.5 py-2.5 bg-sand border border-sand-dark rounded-xl text-xs sm:text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wine"
          >
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Minimum Capacity Filter */}
        <div className="space-y-1.5">
          <label htmlFor="filter-capacity" className="flex items-center gap-1.5 text-xs font-heading uppercase tracking-wider text-ink/80">
            <Users className="w-3.5 h-3.5 text-wine" />
            <span>Min. Capacity</span>
          </label>
          <select
            id="filter-capacity"
            value={filters.min_capacity || ''}
            onChange={(e) => handleInputChange('min_capacity', e.target.value)}
            className="w-full px-3.5 py-2.5 bg-sand border border-sand-dark rounded-xl text-xs sm:text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wine"
          >
            <option value="">Any Capacity</option>
            <option value="100">100+ guests</option>
            <option value="250">250+ guests</option>
            <option value="500">500+ guests</option>
            <option value="1000">1,000+ guests</option>
            <option value="2000">2,000+ guests</option>
          </select>
        </div>

        {/* Max Price Filter */}
        <div className="space-y-1.5">
          <label htmlFor="filter-price" className="flex items-center gap-1.5 text-xs font-heading uppercase tracking-wider text-ink/80">
            <IndianRupee className="w-3.5 h-3.5 text-wine" />
            <span>Max Price / Hour</span>
          </label>
          <select
            id="filter-price"
            value={filters.max_price || ''}
            onChange={(e) => handleInputChange('max_price', e.target.value)}
            className="w-full px-3.5 py-2.5 bg-sand border border-sand-dark rounded-xl text-xs sm:text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wine"
          >
            <option value="">Any Price</option>
            <option value="2000">Up to ₹2,000 / hr</option>
            <option value="4000">Up to ₹4,000 / hr</option>
            <option value="6000">Up to ₹6,000 / hr</option>
            <option value="10000">Up to ₹10,000 / hr</option>
          </select>
        </div>
      </div>

      {/* Active Filter Badges & Reset */}
      {hasActiveFilters && (
        <div className="pt-2 flex items-center justify-between border-t border-sand-dark/60 text-xs">
          <span className="text-ink/70 font-medium">
            Active filters applied
          </span>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-wine hover:text-wine-dark font-semibold transition-colors focus:outline-none underline underline-offset-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      )}
    </div>
  );
}
