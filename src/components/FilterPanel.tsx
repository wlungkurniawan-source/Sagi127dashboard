import React from 'react';
import {
  RotateCcw,
  Calendar,
  CheckCircle,
  Users,
  Compass,
  Tag,
  SlidersHorizontal,
  X
} from 'lucide-react';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    agents: string[];
    categories: string[];
    sources: string[];
    statuses: string[];
    tanggals: string[];
  };
  activeFilters: {
    startTanggal: string;
    endTanggal: string;
    status: string;
    source: string;
    category: string;
    agent: string;
  };
  onChange: (key: string, value: string) => void;
  onReset: () => void;
}

export default function FilterPanel({
  isOpen,
  onClose,
  filters,
  activeFilters,
  onChange,
  onReset,
}: FilterPanelProps) {
  if (!isOpen) return null;

  const hasActiveFilters = Object.entries(activeFilters).some(
    ([key, value]) => value !== ''
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-100 flex items-center justify-center p-4 overflow-y-auto">
      {/* Modal Container */}
      <div 
        id="filter-modal-card"
        className="bg-white border border-slate-200/90 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm font-sans tracking-tight">Saring & Filter Data</h3>
              <p className="text-xs text-slate-500 font-sans">Sempurnakan analisis data pengaduan Anda</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content - High density filters */}
        <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
          
          {/* Row 1: Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Date Picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                Mulai Tanggal
              </label>
              <input
                id="filter-start-tanggal"
                type="date"
                value={activeFilters.startTanggal}
                onChange={(e) => onChange('startTanggal', e.target.value)}
                className="block w-full px-4 py-2.5 border border-slate-200 hover:border-slate-300/80 rounded-xl bg-white text-slate-700 text-sm font-semibold focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all cursor-pointer"
              />
            </div>

            {/* End Date Picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-rose-500" />
                Sampai Tanggal
              </label>
              <input
                id="filter-end-tanggal"
                type="date"
                value={activeFilters.endTanggal}
                onChange={(e) => onChange('endTanggal', e.target.value)}
                className="block w-full px-4 py-2.5 border border-slate-200 hover:border-slate-300/80 rounded-xl bg-white text-slate-700 text-sm font-semibold focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all cursor-pointer"
              />
            </div>
          </div>

          {/* Row 2: Select Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Status Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-indigo-500" />
                Status Tiket
              </label>
              <select
                id="filter-status"
                value={activeFilters.status}
                onChange={(e) => onChange('status', e.target.value)}
                className="block w-full px-4 py-2.5 border border-slate-200 hover:border-slate-300/80 rounded-xl bg-white text-slate-700 text-sm font-semibold focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all cursor-pointer shadow-2xs"
              >
                <option value="">Semua Status</option>
                {filters.statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Source Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-amber-500" />
                Saluran Tiket
              </label>
              <select
                id="filter-source"
                value={activeFilters.source}
                onChange={(e) => onChange('source', e.target.value)}
                className="block w-full px-4 py-2.5 border border-slate-200 hover:border-slate-300/80 rounded-xl bg-white text-slate-700 text-sm font-semibold focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all cursor-pointer shadow-2xs"
              >
                <option value="">Semua Saluran</option>
                {filters.sources.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Select Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Agent Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-blue-500" />
                Petugas / Agen
              </label>
              <select
                id="filter-agent"
                value={activeFilters.agent}
                onChange={(e) => onChange('agent', e.target.value)}
                className="block w-full px-4 py-2.5 border border-slate-200 hover:border-slate-300/80 rounded-xl bg-white text-slate-700 text-sm font-semibold focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all cursor-pointer shadow-2xs"
              >
                <option value="">Semua Agen</option>
                {filters.agents.map((ag) => (
                  <option key={ag} value={ag}>
                    {ag}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-violet-500" />
                Kategori Pengaduan
              </label>
              <select
                id="filter-category"
                value={activeFilters.category}
                onChange={(e) => onChange('category', e.target.value)}
                className="block w-full px-4 py-2.5 border border-slate-200 hover:border-slate-300/80 rounded-xl bg-white text-slate-700 text-sm font-semibold focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all cursor-pointer truncate shadow-2xs"
              >
                <option value="">Semua Kategori</option>
                {filters.categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.length > 35 ? `${cat.substring(0, 32)}...` : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onReset}
            disabled={!hasActiveFilters}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-40 hover:border-slate-300 active:scale-95 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            <RotateCcw className="h-3.5 w-3.5 text-rose-500" />
            <span>Reset Filter</span>
          </button>
          
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
          >
            Terapkan Filter
          </button>
        </div>
      </div>
    </div>
  );
}
