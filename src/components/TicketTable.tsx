import React from 'react';
import { Ticket } from '../types';
import { ArrowUpDown, ChevronDown, ChevronUp, RefreshCw, Search } from 'lucide-react';

interface TicketTableProps {
  tickets: Ticket[];
  pagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSortChange: (column: string) => void;
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
}

export default function TicketTable({
  tickets,
  pagination,
  sortBy,
  sortOrder,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  isLoading,
  search,
  onSearchChange,
}: TicketTableProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Helper for Status Badge colors in Fresh White Theme
  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('solve')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    } else if (s.includes('eskalasi')) {
      return 'bg-rose-50 text-rose-700 border-rose-200/80';
    } else if (s.includes('pending')) {
      return 'bg-amber-50 text-amber-700 border-amber-200/80';
    } else {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
    }
  };

  const SortHeader = ({ col, label }: { col: string; label: string }) => {
    const isCurrent = sortBy === col;
    return (
      <th
        className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-50 hover:text-slate-900 transition-colors select-none"
        onClick={() => onSortChange(col)}
      >
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          <ArrowUpDown className={`h-3 w-3 ${isCurrent ? 'text-indigo-600' : 'text-slate-400'}`} />
          {isCurrent && (
            <span className="text-[10px] text-indigo-600 font-mono">
              {sortOrder === 'asc' ? '▲' : '▼'}
            </span>
          )}
        </div>
      </th>
    );
  };

  return (
    <div id="ticket-table-container" className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
      {/* Table Header Controls */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50">
        <div className="space-y-1">
          <h3 className="font-bold text-slate-800 text-sm">Eksplorasi Data Tiket Layanan</h3>
          <p className="text-xs text-slate-500">
            Menampilkan {tickets.length > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0} -{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.totalRecords)} dari{' '}
            {pagination.totalRecords.toLocaleString()} tiket
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Combined Multi-Column Search Input */}
          <div className="relative min-w-[280px] sm:min-w-[340px]">
            <input
              id="table-search-input"
              type="text"
              className="block w-full pl-9 pr-8 py-2 border border-slate-200 hover:border-slate-300 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-xs font-medium shadow-2xs"
              placeholder="Cari Nama Pelanggan, No. Tiket, ID SPPG, atau keluhan..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400" />
            </div>
            {search && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-2 px-1 flex items-center text-slate-400 hover:text-slate-600 text-sm font-bold"
                title="Hapus pencarian"
              >
                ×
              </button>
            )}
          </div>

          {/* Page size select */}
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs text-slate-500">Tampilkan:</span>
            <select
              id="page-size-select"
              value={pagination.pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
            >
              <option value={10}>10 Baris</option>
              <option value={25}>25 Baris</option>
              <option value={50}>50 Baris</option>
              <option value={100}>100 Baris</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="overflow-x-auto flex-1 min-h-[300px] relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-500">Memuat data tiket...</p>
            </div>
          </div>
        )}

        <table className="w-full text-sm text-left text-slate-600">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider w-[50px]">No.</th>
              <SortHeader col="tanggal" label="Tanggal" />
              <SortHeader col="ticketNumber" label="No. Tiket" />
              <SortHeader col="customerName" label="Pelanggan" />
              <SortHeader col="category" label="Kategori" />
              <SortHeader col="statusAkhir" label="Status" />
              <SortHeader col="agent" label="Agen" />
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider w-[80px] text-right">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-400 bg-white">
                  Tidak ada tiket pengaduan yang cocok dengan kriteria filter Anda.
                </td>
              </tr>
            ) : (
              tickets.map((t, index) => {
                const globalIndex = (pagination.page - 1) * pagination.pageSize + index + 1;
                const isExpanded = expandedId === t.id;
                
                return (
                  <React.Fragment key={t.id}>
                    {/* Primary Row */}
                    <tr
                      id={`ticket-row-${t.id}`}
                      onClick={() => toggleExpand(t.id)}
                      className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                        isExpanded ? 'bg-slate-50/40' : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">{globalIndex}</td>
                      <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">
                        {t.tanggal} <span className="text-xs text-slate-400 font-mono">({t.month})</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{t.ticketNumber}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">{t.customerName || 'Pelapor'}</td>
                      <td className="px-6 py-4 max-w-[200px] truncate text-slate-500" title={t.category}>
                        {t.category}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                            t.statusAkhir
                          )}`}
                        >
                          {t.statusAkhir || 'Open'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-medium">{t.agent || 'Unassigned'}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          id={`expand-btn-${t.id}`}
                          className="p-1 rounded-lg hover:bg-slate-100 transition-colors inline-flex text-slate-400 hover:text-slate-600"
                        >
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Details Row */}
                    {isExpanded && (
                      <tr id={`expanded-row-${t.id}`} className="bg-slate-50/30">
                        <td colSpan={8} className="px-8 py-5">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-600">
                            
                            {/* SPPG & Partner ID details */}
                            <div className="space-y-3 bg-white border border-slate-100 p-4 rounded-xl shadow-2xs">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identifikasi Mitra SPPG</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between py-1 border-b border-slate-100">
                                  <span className="text-slate-400">ID SPPG/Mitra:</span>
                                  <span className="font-mono font-bold text-slate-700">{t.idSppg || '-'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-100">
                                  <span className="text-slate-400">Status SPPG:</span>
                                  <span className="font-medium text-slate-700">{t.statusSppg || '-'}</span>
                                </div>
                                <div className="flex justify-between py-1">
                                  <span className="text-slate-400">Saluran (Source):</span>
                                  <span className="font-medium text-slate-700">{t.source || '-'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Ticket Profiling L2, L3 */}
                            <div className="space-y-3 bg-white border border-slate-100 p-4 rounded-xl shadow-2xs col-span-1">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Klasifikasi Layanan</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between py-1 border-b border-slate-100">
                                  <span className="text-slate-400">Profiling L2:</span>
                                  <span className="font-medium text-slate-700">{t.l2 || '-'}</span>
                                </div>
                                <div className="flex justify-between py-1">
                                  <span className="text-slate-400">Profiling L3:</span>
                                  <span className="font-medium text-slate-700">{t.l3 || '-'}</span>
                                </div>
                              </div>
                            </div>

                            {/* The Remarks Quote box */}
                            <div className="space-y-2 col-span-1 md:col-span-3 lg:col-span-1 flex flex-col justify-between">
                              <div className="space-y-1.5">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Isi Laporan / Keluhan (Remarks)</h4>
                                <blockquote className="border-l-4 border-indigo-400 bg-indigo-50/50 p-3 rounded-r-lg italic text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                  {t.remarks || '(Tidak ada remarks tertulis untuk tiket ini)'}
                                </blockquote>
                              </div>
                              <div className="flex justify-between items-center text-xs text-slate-400 mt-2 font-mono">
                                <span>Lenna Category: {t.lennaCategory || '-'}</span>
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            id="prev-page-btn"
            disabled={pagination.page <= 1 || isLoading}
            onClick={() => onPageChange(pagination.page - 1)}
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:hover:bg-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            Sebelumnya
          </button>
          
          <span className="text-xs font-medium text-slate-500">
            Halaman <span className="text-slate-800 font-bold">{pagination.page}</span> dari{' '}
            <span className="text-slate-800 font-bold">{pagination.totalPages}</span>
          </span>

          <button
            id="next-page-btn"
            disabled={pagination.page >= pagination.totalPages || isLoading}
            onClick={() => onPageChange(pagination.page + 1)}
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:hover:bg-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            Berikutnya
          </button>
        </div>
      )}
    </div>
  );
}
