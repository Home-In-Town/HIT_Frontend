import React from 'react';

interface FilterState {
  searchQuery: string;
  status: 'all' | 'published' | 'draft';
  type: string;
  city: string;
  rera: 'all' | 'verified' | 'pending';
  viewMode: 'table' | 'card';
}

interface DashboardFiltersProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: any) => void;
  cities: string[];
  types: string[];
}

export default function DashboardFilters({ 
  filters, 
  onFilterChange,
  cities,
  types
}: DashboardFiltersProps) {
  return (
    <div className="bg-white border-y border-gray-200 px-6 py-3 mb-6 flex flex-col xl:flex-row gap-4 xl:items-center justify-between sticky top-0 z-10 shadow-sm">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search projects..."
          className="block w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-colors"
          value={filters.searchQuery}
          onChange={(e) => onFilterChange('searchQuery', e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          className="block w-32 pl-2 pr-8 py-1.5 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 rounded bg-white text-gray-700"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        <select
          value={filters.type}
          onChange={(e) => onFilterChange('type', e.target.value)}
          className="block w-32 pl-2 pr-8 py-1.5 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 rounded bg-white text-gray-700"
        >
          <option value="all">All Types</option>
          {types.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={filters.city}
          onChange={(e) => onFilterChange('city', e.target.value)}
          className="block w-32 pl-2 pr-8 py-1.5 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 rounded bg-white text-gray-700"
        >
          <option value="all">All Cities</option>
          {cities.map(c => (
             <option key={c} value={c}>{c}</option>
          ))}
        </select>

         <select
          value={filters.rera}
          onChange={(e) => onFilterChange('rera', e.target.value)}
          className="block w-32 pl-2 pr-8 py-1.5 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 rounded bg-white text-gray-700"
        >
          <option value="all">RERA: All</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* View Toggle */}
      <div className="border-l border-gray-200 pl-4 flex items-center gap-1">
        <button
          onClick={() => onFilterChange('viewMode', 'table')}
          className={`p-1.5 rounded ${filters.viewMode === 'table' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
          title="Table View"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>
        <button
          onClick={() => onFilterChange('viewMode', 'card')}
          className={`p-1.5 rounded ${filters.viewMode === 'card' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
          title="Card View"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
