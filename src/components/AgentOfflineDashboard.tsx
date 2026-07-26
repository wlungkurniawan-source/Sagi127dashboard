import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Database,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  ShieldCheck,
  Activity,
  UserX,
  Clock,
  Briefcase,
  Download,
  Calendar,
  Maximize2,
  Info,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  AreaChart,
  Area,
  LabelList,
  Legend
} from 'recharts';
import { AgentOfflineSummary, AgentOfflineRecord } from '../types';
import MetricCard from './MetricCard';
import { downloadChartAsPng } from '../utils/chartExport';

interface AgentOfflineDashboardProps {
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
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#0d9488', // Teal
  '#3b82f6', // Blue
];

const parseOfflineDate = (dateStr: any): Date => {
  if (!dateStr) return new Date(0);
  const clean = String(dateStr).trim().toLowerCase();
  
  // Format: DD-Mon or DD-Month
  const match = clean.match(/^(\d{1,2})[\/\-]([a-z]+)/);
  if (match) {
    const day = parseInt(match[1], 10);
    const monStr = match[2].substring(0, 3);
    const months = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'ags', 'sep', 'okt', 'nov', 'des'];
    const monthIdx = months.indexOf(monStr);
    if (monthIdx !== -1) {
      return new Date(2026, monthIdx, day);
    }
  }
  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    return new Date(clean);
  }
  // Fallback
  const parsed = Date.parse(clean);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }
  return new Date(0);
};

export default function AgentOfflineDashboard({ onBackToTickets, refreshTrigger, globalFilters }: AgentOfflineDashboardProps) {
  const [data, setData] = useState<AgentOfflineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<any>(null);

  // Table filtering and pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [jenisFilter, setJenisFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [ukerFilter, setUkerFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showLogTable, setShowLogTable] = useState(false); // Hidden by default (hide langsung saja)
  const [showTrendModal, setShowTrendModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchData = async () => {
    try {
      const summaryRes = await fetch('/api/agent-offline/summary');
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setData(summaryData);
      }
      
      const statusRes = await fetch('/api/agent-offline/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData);
      }
    } catch (e) {
      console.error('Error fetching agent-offline data:', e);
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
      const res = await fetch('/api/agent-offline/refresh', { method: 'POST' });
      const resData = await res.json();
      if (resData.success) {
        await fetchData();
      } else {
        alert('Gagal sinkronisasi data Agent Offline.');
      }
    } catch (e) {
      console.error('Error syncing Agent Offline:', e);
      alert('Koneksi terputus saat menyinkronkan data.');
    } finally {
      setRefreshing(false);
    }
  };

  const records = data?.records || [];

  const uniqueAgents = React.useMemo(() => {
    return Array.from(new Set(records.map(r => r.agentOffline).filter(Boolean))).sort();
  }, [records]);

  const uniqueCategories = React.useMemo(() => {
    return Array.from(new Set(records.map(r => r.tagCategory).filter(Boolean))).sort();
  }, [records]);

  const uniqueUkers = React.useMemo(() => {
    return Array.from(new Set(records.map(r => r.uker).filter(Boolean))).sort();
  }, [records]);

  const uniqueStatuses = React.useMemo(() => {
    return Array.from(new Set(records.map(r => r.statusAduan).filter(Boolean))).sort();
  }, [records]);

  const uniqueJenis = React.useMemo(() => {
    return Array.from(new Set(records.map(r => r.jenisAduan).filter(Boolean))).sort();
  }, [records]);

  const filteredRecords = records.filter(record => {
    // 1. Search filter
    if (searchTerm !== '') {
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        record.agentOffline.toLowerCase().includes(q) ||
        record.nomorTiket.toLowerCase().includes(q) ||
        record.namaPelapor.toLowerCase().includes(q) ||
        record.casePelapor.toLowerCase().includes(q) ||
        record.tagCategory.toLowerCase().includes(q) ||
        record.uker.toLowerCase().includes(q) ||
        record.picSme.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    // 2. Status filter
    if (statusFilter && record.statusAduan !== statusFilter) return false;

    // 3. Jenis filter
    if (jenisFilter && record.jenisAduan !== jenisFilter) return false;

    // 4. Agent filter
    if (agentFilter && record.agentOffline !== agentFilter) return false;

    // 5. Uker filter
    if (ukerFilter && record.uker !== ukerFilter) return false;

    // 6. Category filter
    if (categoryFilter && record.tagCategory !== categoryFilter) return false;

    // 7. Date range filter
    if (startDate || endDate) {
      const dateObj = parseOfflineDate(record.dateTiket);
      if (startDate) {
        const start = new Date(startDate);
        if (dateObj < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (dateObj > end) return false;
      }
    }

    // Apply global filters if present
    if (globalFilters) {
      if (globalFilters.status && record.statusAduan !== globalFilters.status) return false;
      if (globalFilters.agent && record.agentOffline !== globalFilters.agent) return false;
      if (globalFilters.category && record.tagCategory !== globalFilters.category) return false;
    }

    return true;
  });

  // Daily Agent Offline trend for sparklines and the trend area chart
  const dailyAgentOfflineTrend = React.useMemo(() => {
    const map: Record<string, { total: number; informasi: number; pengaduan: number; agents: Set<string> }> = {};
    filteredRecords.forEach(r => {
      const dateStr = r.dateTiket || 'Unknown';
      if (!map[dateStr]) {
        map[dateStr] = { total: 0, informasi: 0, pengaduan: 0, agents: new Set() };
      }
      map[dateStr].total++;
      if (r.agentOffline) {
        map[dateStr].agents.add(r.agentOffline);
      }
      const jaLower = (r.jenisAduan || '').toLowerCase();
      if (jaLower.includes('informasi')) {
        map[dateStr].informasi++;
      } else if (jaLower.includes('pengaduan')) {
        map[dateStr].pengaduan++;
      }
    });
    return Object.keys(map)
      .sort((a, b) => parseOfflineDate(a).getTime() - parseOfflineDate(b).getTime())
      .map(date => ({
        date,
        total: map[date].total,
        informasi: map[date].informasi,
        pengaduan: map[date].pengaduan,
        agentsCount: map[date].agents.size,
      }));
  }, [filteredRecords]);

  // Top category mapping for the new top categories chart
  const categoryDistributionData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const cat = r.tagCategory || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.keys(counts)
      .map(name => ({
        name,
        count: counts[name],
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  const totalRecords = filteredRecords.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, jenisFilter, agentFilter, ukerFilter, categoryFilter, startDate, endDate]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs font-sans">
          <p className="font-bold mb-1 text-slate-300 font-mono">{label}</p>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.stroke || p.fill || '#6366f1' }} />
              <span className="text-slate-400">{p.name}:</span>
              <span className="font-mono font-bold text-white ml-auto">{p.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-3xs flex flex-col items-center justify-center gap-4 min-h-[400px]">
        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl animate-spin">
          <RefreshCw className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-800">Memuat Data Agent Offline...</h3>
          <p className="text-xs text-slate-400 max-w-sm">Mengekstrak log eskalasi penanganan offline.</p>
        </div>
      </div>
    );
  }

  // Compute metric numbers based on filtered records
  const totalOfflineCount = filteredRecords.length;
  const informasiCount = filteredRecords.filter(r => (r.jenisAduan || '').toLowerCase().includes('informasi')).length;
  const pengaduanCount = filteredRecords.filter(r => (r.jenisAduan || '').toLowerCase().includes('pengaduan')).length;
  const uniqueAgentsCount = new Set(filteredRecords.map(r => r.agentOffline).filter(Boolean)).size;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
            <UserX className="h-4 w-4" />
            <span>Kinerja Agent Offline</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight font-sans mt-1">
            Dashboard Penanganan Agent Offline
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Data riil penanganan tiket aduan offline (melalui callout dan koordinasi tim optimalisasi uker). Terhubung langsung secara real-time ke spreadsheet tim Agent Offline.
          </p>
        </div>
      </div>

      {/* Connection warning */}
      {status?.status === 'error' && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row gap-5 items-start">
          <div className="p-3 bg-rose-100 border border-rose-200 text-rose-700 rounded-xl flex-shrink-0">
            <Database className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-3 flex-grow">
            <h3 className="text-base font-bold text-rose-900 font-sans tracking-tight">Koneksi Spreadsheet Agent Offline Terkendala</h3>
            <p className="text-sm text-rose-700/90 leading-relaxed max-w-3xl">
              Aplikasi mendeteksi error saat mencoba mengakses log: <strong className="font-mono text-xs bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">{status.error}</strong>
            </p>
            <div className="bg-white/80 border border-rose-100 rounded-xl p-4 text-xs text-rose-950 space-y-2 max-w-2xl shadow-3xs">
              <p className="font-bold text-rose-900 mb-1">📋 Cara Mengatasi (Langkah Cepat):</p>
              <ol className="list-decimal list-inside space-y-1.5 font-sans leading-relaxed text-rose-800">
                <li>Buka Google Spreadsheet Agent Offline Anda.</li>
                <li>Klik tombol <strong className="font-semibold text-rose-900">"Bagikan" (Share)</strong> di sudut kuning atas.</li>
                <li>Ubah Akses Umum dari <strong className="font-semibold text-rose-900">"Dibatasi" (Restricted)</strong> menjadi <strong className="font-semibold text-rose-900">"Siapa saja yang memiliki link dapat melihat" (Anyone with the link can view)</strong>.</li>
                <li>Setelah itu, klik tombol <strong className="font-semibold text-rose-900">"Sinkronkan Data Agent Offline"</strong> di atas.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          id="off-kpi-total"
          title="Total Tiket Offline"
          value={totalOfflineCount.toLocaleString()}
          icon={<Briefcase className="h-5 w-5 text-indigo-600" />}
          colorClass="bg-indigo-50 text-indigo-600 border border-indigo-100"
          sparklineData={dailyAgentOfflineTrend.map(d => ({ value: d.total }))}
          sparklineColor="#6366f1"
        />
        <MetricCard
          id="off-kpi-informasi"
          title="Informasi"
          value={informasiCount.toLocaleString()}
          icon={<Info className="h-5 w-5 text-teal-600" />}
          colorClass="bg-teal-50 text-teal-600 border border-teal-100"
          sparklineData={dailyAgentOfflineTrend.map(d => ({ value: d.informasi }))}
          sparklineColor="#0d9488"
        />
        <MetricCard
          id="off-kpi-pengaduan"
          title="Pengaduan"
          value={pengaduanCount.toLocaleString()}
          icon={<Activity className="h-5 w-5 text-rose-600" />}
          colorClass="bg-rose-50 text-rose-600 border border-rose-100"
          sparklineData={dailyAgentOfflineTrend.map(d => ({ value: d.pengaduan }))}
          sparklineColor="#f43f5e"
        />
        <MetricCard
          id="off-kpi-agent-offline"
          title="Agent offline"
          value={uniqueAgentsCount.toLocaleString()}
          icon={<Users className="h-5 w-5 text-amber-500" />}
          colorClass="bg-amber-50 text-amber-600 border border-amber-100"
          sparklineData={dailyAgentOfflineTrend.map(d => ({ value: d.agentsCount }))}
          sparklineColor="#f59e0b"
        />
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Tren Volume Tiket Harian */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-800">Tren Volume Tiket Harian</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTrendModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-700 transition-all cursor-pointer shadow-3xs active:scale-95"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Detail Tren Harian</span>
              </button>
              <button
                onClick={() => downloadChartAsPng('agent-offline-daily-trend-chart-container', 'tren-volume-tiket-agent-offline-harian')}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-3xs"
                title="Unduh Grafik PNG"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div id="agent-offline-daily-trend-chart-container" className="h-[280px] w-full">
            {dailyAgentOfflineTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyAgentOfflineTrend} margin={{ top: 20, right: 15, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="offlineDailyTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="informasiDailyTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="pengaduanDailyTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
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
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    name="Total Tiket" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#offlineDailyTrendGrad)" 
                    dot={{ r: 3, strokeWidth: 1, stroke: '#ffffff', fill: '#6366f1' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="informasi" 
                    name="Informasi" 
                    stroke="#0d9488" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#informasiDailyTrendGrad)" 
                    dot={{ r: 2, strokeWidth: 1, stroke: '#ffffff', fill: '#0d9488' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pengaduan" 
                    name="Pengaduan" 
                    stroke="#f43f5e" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#pengaduanDailyTrendGrad)" 
                    dot={{ r: 2, strokeWidth: 1, stroke: '#ffffff', fill: '#f43f5e' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Data tren volume harian kosong.
              </div>
            )}
          </div>
        </div>

        {/* UKER Distribution */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">Distribusi Unit Kerja (UKER)</h3>
            </div>
            <button
              onClick={() => downloadChartAsPng('agent-offline-uker-chart-container', 'distribusi-unit-kerja-agent-offline')}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-3xs"
              title="Unduh Grafik PNG"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
          <div id="agent-offline-uker-chart-container" className="h-[280px] w-full">
            {data && data.ukerDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.ukerDistribution.slice(0, 8)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} barSize={25}>
                    {data.ukerDistribution.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Data unit kerja kosong.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Row 2: Top category */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">Top category</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-700 transition-all cursor-pointer shadow-3xs active:scale-95"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Lihat Semua Kategori</span>
            </button>
            <button
              onClick={() => downloadChartAsPng('agent-offline-category-chart-container', 'top-categories-agent-offline')}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-3xs"
              title="Unduh Grafik PNG"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div id="agent-offline-category-chart-container" className="h-[300px] w-full">
          {categoryDistributionData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryDistributionData.slice(0, 15)} margin={{ top: 15, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={8} 
                  tickLine={false} 
                  axisLine={false} 
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={35}>
                  {categoryDistributionData.slice(0, 15).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
              Data kategori kosong.
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard/Agent Table */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-indigo-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">Tabel Kontribusi Pengerjaan Agen</h3>
            <p className="text-[11px] text-slate-400">Total pengerjaan tiket oleh masing-masing agen offline.</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 text-left">Nama Agent Offline</th>
                <th className="py-3 px-4 text-center">Total Tiket</th>
                <th className="py-3 px-4 text-center">Solved (Selesai)</th>
                <th className="py-3 px-4 text-center">Eskalasi</th>
                <th className="py-3 px-4 text-center">Pending / Lainnya</th>
                <th className="py-3 px-4 text-center">Rasio Solved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {data && data.agentPerformance.length > 0 ? (
                data.agentPerformance.map((agent, i) => {
                  const solveRate = agent.total > 0 ? Math.round((agent.solved / agent.total) * 100) : 0;
                  return (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center font-extrabold text-[10px] text-slate-500">
                          {i + 1}
                        </span>
                        <span>{agent.name}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-extrabold text-slate-800">{agent.total.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-600 font-bold">{agent.solved.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center font-mono text-rose-600 font-bold">{agent.escalated.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center font-mono text-amber-500 font-bold">{agent.pending.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-mono font-extrabold text-slate-800">{solveRate}%</span>
                          <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block border border-slate-200/50">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${solveRate}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">Tidak ada performa agen terdeteksi.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Explorer Log */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Log Riil Antrean Agent Offline</h3>
              <p className="text-[11px] text-slate-400">Pencarian baris log pengaduan.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showLogTable && (
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
              onClick={() => setShowLogTable(!showLogTable)}
              className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-3xs active:scale-95"
            >
              {showLogTable ? 'Sembunyikan Log' : 'Tampilkan Log'}
            </button>
          </div>
        </div>

        {showLogTable && (
          <div className="space-y-4 pt-2 border-t border-slate-100 animate-fade-in">
            {showFilters && (
              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3 text-xs mb-4 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {/* Status Filter */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-700 font-semibold outline-hidden shadow-3xs"
                    >
                      <option value="">Semua Status ({uniqueStatuses.length})</option>
                      {uniqueStatuses.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  {/* Jenis Aduan Filter */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jenis Aduan</label>
                    <select
                      value={jenisFilter}
                      onChange={e => setJenisFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-700 font-semibold outline-hidden shadow-3xs"
                    >
                      <option value="">Semua Jenis ({uniqueJenis.length})</option>
                      {uniqueJenis.map(j => (
                        <option key={j} value={j}>{j}</option>
                      ))}
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

                  {/* UKER Filter */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">UKER / SME</label>
                    <select
                      value={ukerFilter}
                      onChange={e => setUkerFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-700 font-semibold outline-hidden shadow-3xs"
                    >
                      <option value="">Semua Uker ({uniqueUkers.length})</option>
                      {uniqueUkers.map(uk => (
                        <option key={uk} value={uk}>{uk}</option>
                      ))}
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kategori</label>
                    <select
                      value={categoryFilter}
                      onChange={e => setCategoryFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-700 font-semibold outline-hidden shadow-3xs"
                    >
                      <option value="">Semua Kategori ({uniqueCategories.length})</option>
                      {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  {/* Rentang Tanggal */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rentang Tanggal:</span>
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-3xs">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="text-[11px] font-semibold text-slate-700 bg-transparent border-0 outline-hidden focus:ring-0 p-0"
                      />
                    </div>
                    <span className="text-slate-400 font-bold">s/d</span>
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-3xs">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="text-[11px] font-semibold text-slate-700 bg-transparent border-0 outline-hidden focus:ring-0 p-0"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setStatusFilter('');
                      setJenisFilter('');
                      setAgentFilter('');
                      setUkerFilter('');
                      setCategoryFilter('');
                      setStartDate('');
                      setEndDate('');
                      setSearchTerm('');
                    }}
                    className="px-4 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-3xs active:scale-95"
                  >
                    Reset Filter
                  </button>
                </div>
              </div>
            )}

            {/* Search Input Only */}
            <div className="max-w-md space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pencarian Cepat</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Cari Agen, No Tiket, Pelapor, Kasus..."
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs outline-hidden transition-all placeholder:text-slate-400 text-slate-800 font-semibold shadow-3xs"
                />
              </div>
            </div>

            {/* Log Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 text-left">No. Tiket</th>
                    <th className="py-3 px-4 text-left">Tanggal</th>
                    <th className="py-3 px-4 text-left">Nama Pelapor</th>
                    <th className="py-3 px-4 text-left">Agen & UKER</th>
                    <th className="py-3 px-4 text-left">Kasus / Detail</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-left">Callout / PIC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {paginatedRecords.length > 0 ? (
                    paginatedRecords.map((record, i) => {
                      const isSolved = record.statusAduan.toLowerCase().includes('solve');
                      return (
                        <tr key={record.id || i} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-500 text-[10px]">
                            {record.nomorTiket}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                            {record.dateTiket}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{record.namaPelapor}</div>
                            <div className="text-[10px] text-slate-400 font-sans">{record.statusPelapor}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-indigo-700">{record.agentOffline}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Uker: {record.uker}</div>
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-bold text-slate-800 line-clamp-1">{record.tagCategory}</div>
                            <div className="text-[10px] text-slate-500 font-sans line-clamp-2 mt-0.5 leading-relaxed">
                              {record.casePelapor}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isSolved 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              {record.statusAduan}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-bold text-slate-700">{record.picSme || '-'}</div>
                            <div className="text-[10px] text-slate-500 font-sans line-clamp-2 mt-0.5 leading-relaxed italic">
                              {record.keteranganCallout}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                        Tidak ada tiket offline yang cocok dengan kriteria pencarian.
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
                  Menampilkan <strong className="text-slate-800">{((currentPage - 1) * pageSize) + 1}</strong> - <strong className="text-slate-800">{Math.min(currentPage * pageSize, totalRecords)}</strong> dari <strong className="text-slate-800">{totalRecords.toLocaleString()}</strong> log offline.
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

      {/* Detail Tren Harian Modal */}
      {showTrendModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col p-6 shadow-2xl border border-slate-100 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Detail Tren Volume Tiket Agent Offline</h3>
                <p className="text-xs text-slate-400">Rincian harian volume penanganan tiket</p>
              </div>
              <button
                onClick={() => setShowTrendModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-4 rounded-xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100 text-xs text-left">
                <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4 text-center">Total Tiket</th>
                    <th className="py-3 px-4 text-center">Informasi</th>
                    <th className="py-3 px-4 text-center">Pengaduan</th>
                    <th className="py-3 px-4 text-center">Jumlah Agen Aktif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700 font-mono text-[11px]">
                  {dailyAgentOfflineTrend.map((d, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-sans font-bold text-slate-800">{d.date}</td>
                      <td className="py-3 px-4 text-center font-extrabold text-indigo-600">{d.total.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center text-teal-600">{d.informasi.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center text-rose-600">{d.pengaduan.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center text-slate-700">{d.agentsCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowTrendModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lihat Semua Kategori Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col p-6 shadow-2xl border border-slate-100 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Daftar Lengkap Kategori Tiket</h3>
                <p className="text-xs text-slate-400">Total {categoryDistributionData.length} kategori tagging ditemukan</p>
              </div>
              <button
                onClick={() => { setShowCategoryModal(false); setCategorySearchTerm(''); }}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-4">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  value={categorySearchTerm}
                  onChange={e => setCategorySearchTerm(e.target.value)}
                  placeholder="Cari kategori..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs outline-hidden transition-all placeholder:text-slate-400 text-slate-800 font-semibold shadow-3xs"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 rounded-xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100 text-xs text-left">
                <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Nama Kategori</th>
                    <th className="py-3 px-4 text-center w-24">Jumlah Tiket</th>
                    <th className="py-3 px-4 text-center w-24">Persentase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {categoryDistributionData
                    .filter(c => c.name.toLowerCase().includes(categorySearchTerm.toLowerCase()))
                    .map((c, i) => {
                      const pct = totalOfflineCount > 0 ? ((c.count / totalOfflineCount) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-800">{c.name}</td>
                          <td className="py-3 px-4 text-center font-mono font-extrabold text-indigo-600">{c.count.toLocaleString()}</td>
                          <td className="py-3 px-4 text-center font-mono text-slate-500">{pct}%</td>
                        </tr>
                      );
                    })}
                  {categoryDistributionData.filter(c => c.name.toLowerCase().includes(categorySearchTerm.toLowerCase())).length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-400 italic">Kategori tidak ditemukan</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => { setShowCategoryModal(false); setCategorySearchTerm(''); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
