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
    <div className="bg-white border-y border-[#E7E5E4] px-6 py-4 mb-8 flex flex-col xl:flex-row gap-4 xl:items-center justify-between sticky top-0 z-10 shadow-sm shadow-[#B45309]/5">
      {/* Search */}
      <div className="relative flex-1 max-w-md group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-[#A8A29E] group-focus-within:text-[#B45309] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search projects by name, location..."
          className="block w-full pl-11 pr-4 py-2 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl text-sm text-[#2A2A2A] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#B45309]/10 focus:border-[#B45309] transition-all"
          value={filters.searchQuery}
          onChange={(e) => onFilterChange('searchQuery', e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          className="block w-40 pl-3 pr-10 py-2 text-sm border border-[#E7E5E4] focus:outline-none focus:ring-2 focus:ring-[#B45309]/10 focus:border-[#B45309] rounded-xl bg-[#FAF7F2] text-[#2A2A2A] font-medium cursor-pointer transition-all"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        <select
          value={filters.type}
          onChange={(e) => onFilterChange('type', e.target.value)}
          className="block w-40 pl-3 pr-10 py-2 text-sm border border-[#E7E5E4] focus:outline-none focus:ring-2 focus:ring-[#B45309]/10 focus:border-[#B45309] rounded-xl bg-[#FAF7F2] text-[#2A2A2A] font-medium cursor-pointer transition-all"
        >
          <option value="all">All Types</option>
          {types.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={filters.city}
          onChange={(e) => onFilterChange('city', e.target.value)}
          className="block w-40 pl-3 pr-10 py-2 text-sm border border-[#E7E5E4] focus:outline-none focus:ring-2 focus:ring-[#B45309]/10 focus:border-[#B45309] rounded-xl bg-[#FAF7F2] text-[#2A2A2A] font-medium cursor-pointer transition-all"
        >
          <option value="all">All Cities</option>
          {cities.map(c => (
             <option key={c} value={c}>{c}</option>
          ))}
        </select>

         <select
          value={filters.rera}
          onChange={(e) => onFilterChange('rera', e.target.value)}
          className="block w-40 pl-3 pr-10 py-2 text-sm border border-[#E7E5E4] focus:outline-none focus:ring-2 focus:ring-[#B45309]/10 focus:border-[#B45309] rounded-xl bg-[#FAF7F2] text-[#2A2A2A] font-medium cursor-pointer transition-all"
        >
          <option value="all">RERA: All</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* View Toggle */}
      <div className="border-l border-[#E7E5E4] pl-4 flex items-center gap-2">
        <button
          onClick={() => onFilterChange('viewMode', 'table')}
          className={`p-2 rounded-xl transition-all ${filters.viewMode === 'table' ? 'bg-[#B45309] text-white shadow-md shadow-[#B45309]/20' : 'text-[#A8A29E] hover:text-[#B45309] hover:bg-[#B45309]/5'}`}
          title="Table View"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>
        <button
          onClick={() => onFilterChange('viewMode', 'card')}
          className={`p-2 rounded-xl transition-all ${filters.viewMode === 'card' ? 'bg-[#B45309] text-white shadow-md shadow-[#B45309]/20' : 'text-[#A8A29E] hover:text-[#B45309] hover:bg-[#B45309]/5'}`}
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
