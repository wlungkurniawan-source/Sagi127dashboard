import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  PhoneOutgoing,
  Clock,
  RefreshCw,
  Search,
  Users,
  BarChart2,
  Database,
  Calendar,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  ShieldCheck,
  PhoneOff,
  PhoneMissed,
  Download,
  Maximize2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  LabelList
} from 'recharts';
import { OutboundSummary, OutboundRecord } from '../types';
import MetricCard from './MetricCard';
import { downloadChartAsPng } from '../utils/chartExport';

interface OutboundDashboardProps {
  onBackToTickets?: () => void;
  refreshTrigger?: number;
  globalFilters?: {
    startTanggal?: string;
    endTanggal?: string;
    status?: string;
    source?: string;
    category?: string;
    agent?: string;
  };
}

const COLORS = [
  '#10b981', // Emerald (ANSWERED)
  '#f59e0b', // Amber (NO ANSWER)
  '#ef4444', // Red (FAILED/BUSY)
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#0d9488', // Teal
  '#3b82f6', // Blue
];

// Helper to format AHT seconds to MM:SS or HH:MM:SS
const formatAHT = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs}j ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
};

// Parse 'DD-Mon' format to Date objects (assuming year 2026)
const parseDateString = (dateStr: any): Date => {
  if (!dateStr) return new Date(0);
  const clean = String(dateStr).trim();
  // Format: DD-Mon
  const match = clean.match(/^(\d{1,2})[\/\-]([A-Za-z]+)$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const monStr = match[2].substring(0, 3).toLowerCase();
    const months = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'ags', 'sep', 'okt', 'nov', 'des'];
    const monthIdx = months.indexOf(monStr);
    if (monthIdx !== -1) {
      return new Date(2026, monthIdx, day);
    }
  }
  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return new Date(clean);
  }
  // Fallback native
  const parsed = Date.parse(clean);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }
  return new Date(0);
};

export default function OutboundDashboard({ onBackToTickets, refreshTrigger, globalFilters }: OutboundDashboardProps) {
  const [data, setData] = useState<OutboundSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<any>(null);

  // Modal and display states
  const [showDailyDetailModal, setShowDailyDetailModal] = useState(false);
  const [showAllAgents, setShowAllAgents] = useState(false);
  const [showLogExplorer, setShowLogExplorer] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Table filtering and pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchData = async () => {
    try {
      const summaryRes = await fetch('/api/outbound/summary');
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setData(summaryData);
      }
      
      const statusRes = await fetch('/api/outbound/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData);
      }
    } catch (e) {
      console.error('Error fetching outbound data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/outbound/refresh', { method: 'POST' });
      const resData = await res.json();
      if (resData.success) {
        await fetchData();
      } else {
        alert('Gagal sinkronisasi data outbound.');
      }
    } catch (e) {
      console.error('Error syncing outbound:', e);
      alert('Koneksi terputus saat menyinkronkan data outbound.');
    } finally {
      setRefreshing(false);
    }
  };

  // Filter and paginate records
  const records = data?.records || [];

  const uniqueAgents = React.useMemo(() => {
    return Array.from(new Set(records.map(r => r.agentName).filter(Boolean))).sort();
  }, [records]);

  const filteredRecords = React.useMemo(() => {
    return records.filter(r => {
      // 1. Search term (Agent, Call To, Call ID)
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const agentMatch = String(r.agentName || '').toLowerCase().includes(s);
        const callToMatch = String(r.callTo || '').toLowerCase().includes(s);
        const callIdMatch = String(r.callId || '').toLowerCase().includes(s);
        if (!agentMatch && !callToMatch && !callIdMatch) return false;
      }
      // 2. Status filter
      if (statusFilter) {
        const ev = String(r.event || '').toUpperCase();
        if (statusFilter === 'ANSWERED') {
          if (ev.includes('NO ANSWER') || (!ev.includes('ANSWERED') && !ev.includes('ANSWER'))) return false;
        } else if (statusFilter === 'NO ANSWER') {
          if (!ev.includes('NO ANSWER')) return false;
        } else if (statusFilter === 'BUSY') {
          if (!ev.includes('BUSY')) return false;
        } else if (statusFilter === 'FAILED') {
          if (ev.includes('ANSWERED') || ev.includes('ANSWER') || ev.includes('NO ANSWER') || ev.includes('BUSY')) return false;
        }
      }
      // 3. Agent filter
      if (agentFilter) {
        if (String(r.agentName || '') !== agentFilter) return false;
      }
      // 4. Date range filter
      if (startDate || endDate) {
        const dateObj = parseDateString(r.tanggal);
        if (dateObj.getTime() > 0) {
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          const dateStrFormatted = `${year}-${month}-${day}`;
          
          if (startDate && dateStrFormatted < startDate) return false;
          if (endDate && dateStrFormatted > endDate) return false;
        } else {
          return false;
        }
      }
      return true;
    });
  }, [records, searchTerm, statusFilter, agentFilter, startDate, endDate]);

  const totalRecords = filteredRecords.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, agentFilter, startDate, endDate]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs font-sans">
          <p className="font-bold mb-1 text-slate-300 font-mono">{label}</p>
          {payload.map((p: any, i: number) => {
            const val = p.value !== undefined && p.value !== null ? Number(p.value) : 0;
            return (
              <div key={i} className="flex items-center gap-2 py-0.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.stroke || p.fill || '#10b981' }} />
                <span className="text-slate-400">{p.name}:</span>
                <span className="font-mono font-bold text-white ml-auto">{val.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Dynamic stats calculation from filtered records
  const dynamicStats = React.useMemo(() => {
    let totalCalls = filteredRecords.length;
    let answered = 0;
    let noAnswer = 0;
    let busy = 0;
    let failed = 0;
    let totalDuration = 0;
    
    filteredRecords.forEach(r => {
      const ev = String(r.event || '').toUpperCase();
      if (ev.includes('NO ANSWER')) {
        noAnswer++;
      } else if (ev.includes('ANSWERED') || ev.includes('ANSWER')) {
        answered++;
      } else if (ev.includes('BUSY')) {
        busy++;
      } else {
        failed++;
      }
      totalDuration += Number(r.handlingTime || r.duration || 0);
    });
    
    const averageHandlingTime = answered > 0 ? Math.round(totalDuration / answered) : 0;
    
    return {
      totalCalls,
      answeredCount: answered,
      noAnswerCount: noAnswer,
      busyCount: busy,
      failedCount: failed,
      totalDuration,
      averageHandlingTime,
    };
  }, [filteredRecords]);

  // Daily Outbound trend for sparklines
  const dailyOutboundTrend = React.useMemo(() => {
    const map: Record<string, { total: number; answered: number; unanswered: number; busy: number; noanswer: number; totalHandling: number; answeredCountForAht: number }> = {};
    filteredRecords.forEach(r => {
      const dateStr = r.tanggal || 'Unknown';
      if (!map[dateStr]) {
        map[dateStr] = { total: 0, answered: 0, unanswered: 0, busy: 0, noanswer: 0, totalHandling: 0, answeredCountForAht: 0 };
      }
      map[dateStr].total++;
      const ev = String(r.event || '').toUpperCase();
      if (ev.includes('NO ANSWER')) {
        map[dateStr].noanswer++;
        map[dateStr].unanswered++;
      } else if (ev.includes('ANSWERED') || ev.includes('ANSWER')) {
        map[dateStr].answered++;
        map[dateStr].totalHandling += Number(r.handlingTime || r.duration || 0);
        map[dateStr].answeredCountForAht++;
      } else if (ev.includes('BUSY')) {
        map[dateStr].busy++;
        map[dateStr].unanswered++;
      } else {
        map[dateStr].unanswered++;
      }
    });
    return Object.keys(map)
      .sort((a, b) => parseDateString(a).getTime() - parseDateString(b).getTime())
      .map(date => {
        const item = map[date];
        const avgAht = item.answeredCountForAht > 0 ? Math.round(item.totalHandling / item.answeredCountForAht) : 0;
        const rate = item.total > 0 ? Math.round((item.answered / item.total) * 100) : 0;
        return {
          date,
          total: item.total,
          answered: item.answered,
          unanswered: item.unanswered,
          busy: item.busy,
          noanswer: item.noanswer,
          answeredRate: rate,
          avgAht
        };
      });
  }, [filteredRecords]);

  // Build Call Status distribution chart data
  const statusDistributionData = [
    { name: 'ANSWERED', count: dynamicStats.answeredCount, color: '#10b981' },
    { name: 'NO ANSWER', count: dynamicStats.noAnswerCount, color: '#f59e0b' },
    { name: 'BUSY', count: dynamicStats.busyCount, color: '#ec4899' },
    { name: 'FAILED/OTHER', count: dynamicStats.failedCount, color: '#ef4444' },
  ].filter(item => item.count > 0);

  // Dynamic hour counts from filtered records
  const trafficData = React.useMemo(() => {
    const hourCounts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      if (r.callStart) {
        const timePart = String(r.callStart).includes(' ') ? String(r.callStart).split(' ')[1] : String(r.callStart);
        const hour = timePart.split(':')[0];
        if (hour) {
          const formattedHour = `${hour.padStart(2, '0')}:00`;
          hourCounts[formattedHour] = (hourCounts[formattedHour] || 0) + 1;
        }
      }
    });
    return Object.keys(hourCounts)
      .sort()
      .map(hour => ({ hour, count: hourCounts[hour] }));
  }, [filteredRecords]);

  // Dynamic agent performance from filtered records
  const agentPerformance = React.useMemo(() => {
    const agMap: Record<string, { name: string; ext: string; totalCalls: number; answeredCalls: number; totalDuration: number }> = {};
    filteredRecords.forEach(r => {
      const ag = r.agentName || 'Unassigned';
      if (!agMap[ag]) {
        agMap[ag] = { name: ag, ext: r.ext || '-', totalCalls: 0, answeredCalls: 0, totalDuration: 0 };
      }
      agMap[ag].totalCalls++;
      const ev = String(r.event || '').toUpperCase();
      if (!ev.includes('NO ANSWER') && (ev.includes('ANSWERED') || ev.includes('ANSWER'))) {
        agMap[ag].answeredCalls++;
      }
      agMap[ag].totalDuration += Number(r.handlingTime || r.duration || 0);
    });
    return Object.keys(agMap).map(name => {
      const stats = agMap[name];
      const answerRate = stats.totalCalls > 0 ? Math.round((stats.answeredCalls / stats.totalCalls) * 100) : 0;
      const averageHandlingTime = stats.answeredCalls > 0 ? Math.round(stats.totalDuration / stats.answeredCalls) : 0;
      return {
        ...stats,
        answerRate,
        averageHandlingTime,
      };
    }).sort((a, b) => b.totalCalls - a.totalCalls);
  }, [filteredRecords]);

  const formatPercent = (count: number, total: number) => {
    if (!total) return '0%';
    return `${Math.round((count / total) * 100)}%`;
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-3xs flex flex-col items-center justify-center gap-4 min-h-[400px]">
        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl animate-spin">
          <RefreshCw className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-800">Memuat Analitik Outbound...</h3>
          <p className="text-xs text-slate-400 max-w-sm">Mengekstrak log panggilan telepon keluar riil secara real-time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Tab Title Block */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
            <PhoneOutgoing className="h-4 w-4" />
            <span>Kinerja Outbound (Panggilan Keluar)</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight font-sans mt-1">
            Dashboard Performa Telepon Keluar
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Data riil panggilan outbound terintegrasi langsung dari Google Spreadsheet Outbound untuk menganalisis durasi bicara, rasio jawaban, dan produktivitas agen Satuan Pelayanan Program Gizi.
          </p>
        </div>
      </div>

      {/* Local Filter Toggle Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Saringan Aktif Outbound:</span>
          {searchTerm || statusFilter || agentFilter || startDate || endDate ? (
            <>
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 font-semibold text-[10px] rounded-lg border border-indigo-100">
                  Cari: {searchTerm}
                  <X className="h-3 w-3 cursor-pointer text-slate-400 hover:text-slate-600" onClick={() => setSearchTerm('')} />
                </span>
              )}
              {statusFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 font-semibold text-[10px] rounded-lg border border-indigo-100">
                  Status: {statusFilter}
                  <X className="h-3 w-3 cursor-pointer text-slate-400 hover:text-slate-600" onClick={() => setStatusFilter('')} />
                </span>
              )}
              {agentFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 font-semibold text-[10px] rounded-lg border border-indigo-100">
                  Agen: {agentFilter}
                  <X className="h-3 w-3 cursor-pointer text-slate-400 hover:text-slate-600" onClick={() => setAgentFilter('')} />
                </span>
              )}
              {startDate && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 font-semibold text-[10px] rounded-lg border border-indigo-100">
                  Mulai: {startDate}
                  <X className="h-3 w-3 cursor-pointer text-slate-400 hover:text-slate-600" onClick={() => setStartDate('')} />
                </span>
              )}
              {endDate && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 font-semibold text-[10px] rounded-lg border border-indigo-100">
                  Selesai: {endDate}
                  <X className="h-3 w-3 cursor-pointer text-slate-400 hover:text-slate-600" onClick={() => setEndDate('')} />
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setAgentFilter('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-[10px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                Reset Semua
              </button>
            </>
          ) : (
            <span className="text-xs text-slate-400 italic">Tidak ada saringan aktif</span>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 transition-all cursor-pointer shadow-2xs active:scale-95"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-600" />
          <span>{showFilters ? 'Sembunyikan Saringan' : 'Saring Data Outbound'}</span>
        </button>
      </div>

      {/* Expandable Filter Panel */}
      {showFilters && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs space-y-4 animate-scale-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {/* Search input */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pencarian</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari Agen, No Tujuan, Call ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-xs outline-hidden transition-all placeholder:text-slate-400 text-slate-800 font-semibold shadow-3xs"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Panggilan</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-xs outline-hidden transition-all text-slate-800 font-semibold shadow-3xs animate-fade-in"
              >
                <option value="">Semua Status</option>
                <option value="ANSWERED">ANSWERED</option>
                <option value="NO ANSWER">NO ANSWER</option>
                <option value="BUSY">BUSY</option>
                <option value="FAILED">FAILED/OTHER</option>
              </select>
            </div>

            {/* Agent Filter */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Agen</label>
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-xs outline-hidden transition-all text-slate-800 font-semibold shadow-3xs animate-fade-in"
              >
                <option value="">Semua Agen</option>
                {Array.from(new Set(records.map((r) => r.agentName).filter(Boolean)))
                  .sort()
                  .map((agent) => (
                    <option key={agent} value={agent}>
                      {agent}
                    </option>
                  ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal Mulai</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-xs outline-hidden transition-all text-slate-800 font-semibold shadow-3xs"
                />
              </div>
            </div>

            {/* End Date */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal Selesai</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-xs outline-hidden transition-all text-slate-800 font-semibold shadow-3xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connection / Synchronization Error Notification */}
      {status?.status === 'error' && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row gap-5 items-start">
          <div className="p-3 bg-rose-100 border border-rose-200 text-rose-700 rounded-xl flex-shrink-0">
            <Database className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-3 flex-grow">
            <h3 className="text-base font-bold text-rose-900 font-sans tracking-tight">Koneksi Spreadsheet Outbound Terkendala</h3>
            <p className="text-sm text-rose-700/90 leading-relaxed max-w-3xl">
              Aplikasi mendeteksi error saat mencoba mengakses log outbound: <strong className="font-mono text-xs bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">{status.error}</strong>
            </p>
            <div className="bg-white/80 border border-rose-100 rounded-xl p-4 text-xs text-rose-950 space-y-2 max-w-2xl shadow-3xs">
              <p className="font-bold text-rose-900 mb-1">📋 Cara Mengatasi (Langkah Cepat):</p>
              <ol className="list-decimal list-inside space-y-1.5 font-sans leading-relaxed text-rose-800">
                <li>Buka Google Spreadsheet log outbound Anda.</li>
                <li>Klik tombol <strong className="font-semibold text-rose-900">"Bagikan" (Share)</strong> di sudut kanan atas Google Sheets.</li>
                <li>Ubah Akses Umum dari <strong className="font-semibold text-rose-900">"Dibatasi" (Restricted)</strong> menjadi <strong className="font-semibold text-rose-900">"Siapa saja yang memiliki link dapat melihat" (Anyone with the link can view)</strong>.</li>
                <li>Setelah itu, klik tombol <strong className="font-semibold text-rose-900">"Sinkronkan Data Outbound"</strong> di atas untuk memuat ulang data secara real-time.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          id="out-kpi-total"
          title="Total Panggilan Keluar"
          value={dynamicStats.totalCalls.toLocaleString()}
          icon={<PhoneCall className="h-5 w-5 text-indigo-600" />}
          colorClass="bg-indigo-50 text-indigo-600 border border-indigo-100"
          sparklineData={dailyOutboundTrend.map(d => ({ value: d.total }))}
          sparklineColor="#6366f1"
        />
        <MetricCard
          id="out-kpi-answered"
          title="Answered Calls"
          value={dynamicStats.answeredCount.toLocaleString()}
          icon={<ShieldCheck className="h-5 w-5 text-emerald-600" />}
          colorClass="bg-emerald-50 text-emerald-600 border border-emerald-100"
          sparklineData={dailyOutboundTrend.map(d => ({ value: d.answered }))}
          sparklineColor="#10b981"
        />
        <MetricCard
          id="out-kpi-busy"
          title="Busy"
          value={dynamicStats.busyCount.toLocaleString()}
          icon={<PhoneOff className="h-5 w-5 text-rose-600" />}
          colorClass="bg-rose-50 text-rose-600 border border-rose-100"
          sparklineData={dailyOutboundTrend.map(d => ({ value: d.busy }))}
          sparklineColor="#ef4444"
        />
        <MetricCard
          id="out-kpi-no-answer"
          title="No Answer"
          value={dynamicStats.noAnswerCount.toLocaleString()}
          icon={<PhoneMissed className="h-5 w-5 text-amber-500" />}
          colorClass="bg-amber-50 text-amber-600 border border-amber-100"
          sparklineData={dailyOutboundTrend.map(d => ({ value: d.noanswer }))}
          sparklineColor="#f59e0b"
        />
        <MetricCard
          id="out-kpi-answered-rate"
          title="Answered Rate"
          value={(dynamicStats.totalCalls > 0 ? ((dynamicStats.answeredCount / dynamicStats.totalCalls) * 100).toFixed(1) : '0') + '%'}
          icon={<TrendingUp className="h-5 w-5 text-teal-600" />}
          colorClass="bg-teal-50 text-teal-600 border border-teal-100"
          sparklineData={dailyOutboundTrend.map(d => ({ value: d.answeredRate }))}
          sparklineColor="#0d9488"
        />
      </div>

      {/* Charts Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Daily Call Volume Trend Chart */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-800">Tren Volume Panggilan Harian</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDailyDetailModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-700 transition-all cursor-pointer shadow-3xs active:scale-95"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Detail Tren Harian</span>
              </button>
              <button
                onClick={() => downloadChartAsPng('outbound-daily-trend-chart-container', 'tren-volume-panggilan-outbound-harian')}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-3xs"
                title="Unduh Grafik PNG"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div id="outbound-daily-trend-chart-container" className="h-[280px] w-full">
            {dailyOutboundTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyOutboundTrend} margin={{ top: 20, right: 15, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="outboundDailyTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    name="Total Panggilan" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#outboundDailyTrendGrad)" 
                    dot={{ r: 3, strokeWidth: 1, stroke: '#ffffff', fill: '#6366f1' }}
                  >
                    <LabelList
                      dataKey="total"
                      position="top"
                      offset={10}
                      style={{ fill: '#4f46e5', fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace' }}
                    />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Tidak ada data tren harian yang tersedia.
              </div>
            )}
          </div>
        </div>

        {/* Call Event / Status Distribution */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">Status Panggilan Outbound</h3>
            </div>
            <button
              onClick={() => downloadChartAsPng('outbound-status-chart-container', 'status-panggilan-outbound')}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-3xs"
              title="Unduh Grafik PNG"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>

          <div id="outbound-status-chart-container" className="h-[280px] w-full flex flex-col justify-between">
            <div className="h-[180px] w-full">
              {statusDistributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusDistributionData} layout="vertical" margin={{ top: 5, right: 10, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={9} width={80} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Jumlah Panggilan" radius={[0, 6, 6, 0]} barSize={14}>
                      {statusDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                  Data status panggilan kosong.
                </div>
              )}
            </div>

            {/* Micro Percentages breakdown */}
            <div className="space-y-2.5 pt-4 border-t border-slate-100">
              {statusDistributionData.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-slate-600">{item.name}</span>
                  </div>
                  <div className="font-mono font-bold text-slate-800">
                    {item.count.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">({formatPercent(item.count, data?.totalCalls || 0)})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Leaderboard Agent Outbound */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5">
          <Award className="h-5 w-5 text-indigo-600 animate-pulse" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">Tabel Kinerja Panggilan Agen (Outbound)</h3>
            <p className="text-[11px] text-slate-400">Peringkat produktivitas panggilan keluar agen SPPG Badan Gizi Nasional.</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 text-left">Nama Agen</th>
                <th className="py-3 px-4 text-center">Ext</th>
                <th className="py-3 px-4 text-center">Total Dial</th>
                <th className="py-3 px-4 text-center">Terjawab (ANSWERED)</th>
                <th className="py-3 px-4 text-center">Rasio Terjawab</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {agentPerformance.length > 0 ? (
                (showAllAgents ? agentPerformance : agentPerformance.slice(0, 10)).map((agent, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 font-extrabold text-[10px] text-indigo-600">
                        {i + 1}
                      </div>
                      <span>{agent.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-500">{agent.ext}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-extrabold text-slate-800">{agent.totalCalls.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-emerald-600 font-bold">{agent.answeredCalls.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-mono font-extrabold text-slate-800">{agent.answerRate}%</span>
                        <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block border border-slate-200/50">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${agent.answerRate}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">Tidak ada performa agen terdeteksi.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {agentPerformance.length > 10 && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => setShowAllAgents(!showAllAgents)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-3xs active:scale-95"
            >
              {showAllAgents ? 'Tampilkan 10 Agen Saja' : `Tampilkan Semua Agen (${agentPerformance.length})`}
            </button>
          </div>
        )}
      </div>

      {/* Explorer Log Outbound Call */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Eksplorasi Riil Log Outbound</h3>
              <p className="text-[11px] text-slate-400 font-sans">Pembacaan mentah baris log panggilan telepon keluar.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {showLogExplorer && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs active:scale-95 whitespace-nowrap ${
                  showFilters 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>{showFilters ? 'Sembunyikan Saringan' : 'Tampilkan Saringan'}</span>
              </button>
            )}

            <button
              onClick={() => setShowLogExplorer(!showLogExplorer)}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-3xs active:scale-95"
            >
              {showLogExplorer ? 'Sembunyikan Log Panggilan' : 'Tampilkan Log Panggilan'}
            </button>
          </div>
        </div>

        {showLogExplorer && (
          <div className="space-y-4">
            {showFilters && (
              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3 text-xs animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Status Filter */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Panggilan</label>
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-700 font-semibold outline-hidden shadow-3xs"
                    >
                      <option value="">Semua Status</option>
                      <option value="ANSWERED">ANSWERED / TERJAWAB</option>
                      <option value="NO ANSWER">NO ANSWER / TIDAK TERJAWAB</option>
                      <option value="BUSY">BUSY / SIBUK</option>
                      <option value="FAILED">FAILED / GAGAL</option>
                    </select>
                  </div>

                  {/* Agen Filter */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Agen Handled</label>
                    <select
                      value={agentFilter}
                      onChange={e => setAgentFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-700 font-semibold outline-hidden shadow-3xs"
                    >
                      <option value="">Semua Agen ({uniqueAgents.length})</option>
                      {uniqueAgents.map(ag => (
                        <option key={ag} value={ag}>{ag}</option>
                      ))}
                    </select>
                  </div>

                  {/* Rentang Tanggal */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rentang Tanggal</label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-3xs w-full">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="date"
                          value={startDate}
                          onChange={e => setStartDate(e.target.value)}
                          className="text-[11px] font-semibold text-slate-700 bg-transparent border-0 outline-hidden focus:ring-0 p-0 w-full"
                        />
                      </div>
                      <span className="text-slate-400 font-bold">s/d</span>
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-3xs w-full">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="date"
                          value={endDate}
                          onChange={e => setEndDate(e.target.value)}
                          className="text-[11px] font-semibold text-slate-700 bg-transparent border-0 outline-hidden focus:ring-0 p-0 w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100 gap-3">
                  {/* Search Input inside Filter block for better layout cohesion */}
                  <div className="relative max-w-sm w-full">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                      <Search className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Cari Call ID, Agen, Nomor Tujuan..."
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs outline-hidden text-slate-700 font-semibold shadow-3xs transition-all"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setStatusFilter('');
                      setAgentFilter('');
                      setStartDate('');
                      setEndDate('');
                      setSearchTerm('');
                    }}
                    className="px-4 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-3xs active:scale-95 whitespace-nowrap"
                  >
                    Reset Filter
                  </button>
                </div>
              </div>
            )}
            {/* Log Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 text-left">Call ID</th>
                    <th className="py-3 px-4 text-left">Waktu Panggilan</th>
                    <th className="py-3 px-4 text-left">Agen (Nama & Ext)</th>
                    <th className="py-3 px-4 text-center">Nomor Tujuan</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Handling Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {paginatedRecords.length > 0 ? (
                    paginatedRecords.map((record, i) => {
                      const ev = record.event.toUpperCase();
                      const isAnswered = !ev.includes('NO ANSWER') && (ev.includes('ANSWERED') || ev.includes('ANSWER'));
                      return (
                        <tr key={record.id || i} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-500 text-[10px]">
                            {record.callId}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {record.callStart || record.callEnd}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{record.agentName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Ext: {record.ext}</div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-extrabold text-slate-700">
                            {record.callTo}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isAnswered 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              {record.event}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                            {record.handlingTimeRaw || '0:00'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                        Belum ada log panggilan keluar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 text-xs">
                <span className="text-slate-500 font-medium">
                  Menampilkan <strong className="text-slate-800">{((currentPage - 1) * pageSize) + 1}</strong> - <strong className="text-slate-800">{Math.min(currentPage * pageSize, totalRecords)}</strong> dari <strong className="text-slate-800">{totalRecords.toLocaleString()}</strong> log outbound.
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 rounded-lg text-slate-600 cursor-pointer shadow-3xs transition-all active:scale-90"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                      let pageNum = currentPage;
                      if (currentPage <= 3) pageNum = idx + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + idx;
                      else pageNum = currentPage - 2 + idx;
                      
                      if (pageNum < 1 || pageNum > totalPages) return null;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-3xs border ${
                            currentPage === pageNum
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 rounded-lg text-slate-600 cursor-pointer shadow-3xs transition-all active:scale-90"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Daily Call Trend Detail Modal */}
      {showDailyDetailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 flex flex-col space-y-5 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Detail Tren Volume Panggilan Outbound (Harian)</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-sans">Seluruh urutan tanggal secara kronologis untuk panggilan keluar.</p>
              </div>
              <button
                onClick={() => setShowDailyDetailModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable Chart Area */}
            <div className="overflow-x-auto border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
              <div className="min-w-[1500px] h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyOutboundTrend} margin={{ top: 20, right: 30, left: -20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="modalDailyTrendGradOutbound" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      tickLine={true}
                      axisLine={true}
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tickLine={true}
                      axisLine={true}
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Total Panggilan"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#modalDailyTrendGradOutbound)"
                      dot={{ r: 4, strokeWidth: 1, stroke: '#ffffff', fill: '#6366f1' }}
                    >
                      <LabelList
                        dataKey="total"
                        position="top"
                        offset={10}
                        style={{ fill: '#4f46e5', fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace' }}
                      />
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowDailyDetailModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-3xs"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
