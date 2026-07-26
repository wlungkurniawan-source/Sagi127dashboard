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
  HelpCircle,
  MapPin,
  MessageSquare,
  Eye,
  EyeOff,
  Calendar,
  Tag as TagIcon,
  X,
  Maximize2,
  Download
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { SmeSummary, SmeRecord } from '../types';
import MetricCard from './MetricCard';
import { downloadChartAsPng } from '../utils/chartExport';

interface SmeDashboardProps {
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
  '#0d9488', // Teal
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#3b82f6', // Blue
];

const MONTH_SME_MAP: { [key: string]: number } = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, jun: 6, jul: 7, aug: 8, ags: 8, agt: 8, sep: 9, okt: 10, nov: 11, des: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  maret: 3, mei_indo: 5, juni: 6, juli: 7, agustus: 8, oktober: 10, desember: 12
};

const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

// Helpers for date filtering and sorting
function parseSmeDateToNum(dateStr: string): number {
  if (!dateStr) return 0;
  const s = dateStr.trim().toLowerCase();
  const parts = s.split(/[-/\s]+/);
  if (parts.length >= 2) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1];
    let monthVal = 1;
    for (const [k, v] of Object.entries(MONTH_SME_MAP)) {
      if (monthStr.startsWith(k) || k.startsWith(monthStr)) {
        monthVal = v;
        break;
      }
    }
    const year = parts.length >= 3 ? (parseInt(parts[2], 10) || 2026) : 2026;
    const finalYear = year < 100 ? 2000 + year : year;
    if (!isNaN(day) && monthVal) {
      return finalYear * 10000 + monthVal * 100 + day;
    }
  }
  return 0;
}

function htmlDateToNum(dateStr: string): number {
  if (!dateStr) return 0;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return year * 10000 + month * 100 + day;
  }
  return 0;
}

export default function SmeDashboard({ onBackToTickets, refreshTrigger, globalFilters }: SmeDashboardProps) {
  const [data, setData] = useState<SmeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<any>(null);

  // Table filtering and pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [divisiFilter, setDivisiFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [profileFilter, setProfileFilter] = useState(''); // Default to empty ("Semua Profile 3") to show 5949 on load
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isTableVisible, setIsTableVisible] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [showAllDivisi, setShowAllDivisi] = useState(false);
  const [showDailyDetailModal, setShowDailyDetailModal] = useState(false);

  const fetchData = async () => {
    try {
      const summaryRes = await fetch('/api/sme/summary');
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setData(summaryData);
      }
      
      const statusRes = await fetch('/api/sme/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData);
      }
    } catch (e) {
      console.error('Error fetching SME data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const records = data?.records || [];

  // Categorize raw status to the three required categories
  const getMappedStatus = (rawStatus: string): string => {
    const s = (rawStatus || '').toLowerCase();
    if (s.includes('solved') || s.includes('selesai') || s.includes('dedicated agent')) {
      return 'Eskalasi Dedicated Agent';
    }
    if (s.includes('progress') || s.includes('proses') || s.includes('uker')) {
      return 'Eskalasi UKER';
    }
    return 'Eskalasi Regular Outbound';
  };

  // Setup unique filter options from FULL records
  const uniqueTags = Array.from(new Set(records.map(r => r.tag).filter(Boolean))).sort();
  const uniqueProfiles = Array.from(new Set(records.map(r => r.profilePelapor).filter(Boolean))).sort();
  const uniqueChannels = Array.from(new Set(records.map(r => r.channel).filter(Boolean))).sort();
  const uniqueDivisis = Array.from(new Set(records.map(r => r.divisiEskalasi).filter(Boolean))).sort();

  // Handle resetting filters (including profileFilter)
  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setChannelFilter('');
    setDivisiFilter('');
    setTagFilter('');
    setProfileFilter('');
    setStartDate('');
    setEndDate('');
  };

  // Filter records
  const filteredRecords = records.filter(record => {
    // 1. Profile 3 (Optional, defaults to empty to show all 5949)
    if (profileFilter !== '' && record.profilePelapor !== profileFilter) return false;

    // 2. Status Aduan (Mapped status matching)
    if (statusFilter !== '' && getMappedStatus(record.statusAduan) !== statusFilter) return false;

    // 3. Channel
    if (channelFilter !== '' && record.channel !== channelFilter) return false;

    // 4. Divisi
    if (divisiFilter !== '' && record.divisiEskalasi !== divisiFilter) return false;

    // 5. Tag
    if (tagFilter !== '' && record.tag !== tagFilter) return false;

    // 6. Date Range Start
    if (startDate !== '') {
      const recDate = parseSmeDateToNum(record.tanggalAduan);
      const selDate = htmlDateToNum(startDate);
      if (recDate > 0 && recDate < selDate) return false;
    }

    // 7. Date Range End
    if (endDate !== '') {
      const recDate = parseSmeDateToNum(record.tanggalAduan);
      const selDate = htmlDateToNum(endDate);
      if (recDate > 0 && recDate > selDate) return false;
    }

    // 8. Search Term
    if (searchTerm !== '') {
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        record.namaPelapor.toLowerCase().includes(q) ||
        record.noTiket.toLowerCase().includes(q) ||
        record.deskripsi.toLowerCase().includes(q) ||
        record.tag.toLowerCase().includes(q) ||
        record.wilayah.toLowerCase().includes(q) ||
        record.idSppg.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    // Apply global filters
    if (globalFilters) {
      if (globalFilters.status) {
        const filterStatus = globalFilters.status.toLowerCase();
        const mappedStatus = getMappedStatus(record.statusAduan).toLowerCase();
        const rawStatus = String(record.statusAduan || '').toLowerCase();
        if (!mappedStatus.includes(filterStatus) && !rawStatus.includes(filterStatus) && !filterStatus.includes(mappedStatus) && !filterStatus.includes(rawStatus)) {
          return false;
        }
      }
      if (globalFilters.source) {
        const filterSource = globalFilters.source.toLowerCase();
        const channel = String(record.channel || '').toLowerCase();
        if (channel !== filterSource) return false;
      }
      if (globalFilters.category) {
        const filterCat = globalFilters.category.toLowerCase();
        const tag = String(record.tag || '').toLowerCase();
        if (tag !== filterCat) return false;
      }
      // Filter by date range
      if (globalFilters.startTanggal) {
        const recDate = parseSmeDateToNum(record.tanggalAduan);
        const selDate = htmlDateToNum(globalFilters.startTanggal);
        if (recDate > 0 && recDate < selDate) return false;
      }
      if (globalFilters.endTanggal) {
        const recDate = parseSmeDateToNum(record.tanggalAduan);
        const selDate = htmlDateToNum(globalFilters.endTanggal);
        if (recDate > 0 && recDate > selDate) return false;
      }
    }

    return true;
  });

  const dailyTrends = React.useMemo(() => {
    const map: Record<string, { total: number; dedicated: number; uker: number; outbound: number }> = {};
    filteredRecords.forEach(r => {
      const d = r.tanggalAduan || 'Unknown';
      if (!map[d]) {
        map[d] = { total: 0, dedicated: 0, uker: 0, outbound: 0 };
      }
      map[d].total++;
      const status = getMappedStatus(r.statusAduan);
      if (status === 'Eskalasi Dedicated Agent') {
        map[d].dedicated++;
      } else if (status === 'Eskalasi UKER') {
        map[d].uker++;
      } else {
        map[d].outbound++;
      }
    });
    return Object.keys(map)
      .sort((a, b) => parseSmeDateToNum(a) - parseSmeDateToNum(b))
      .map(date => ({
        date,
        total: map[date].total,
        dedicated: map[date].dedicated,
        uker: map[date].uker,
        outbound: map[date].outbound
      }));
  }, [filteredRecords]);

  const totalRecords = filteredRecords.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, channelFilter, divisiFilter, tagFilter, profileFilter, startDate, endDate]);

  // Compute stats on filtered list for reactive KPI cards
  const activeDedicatedCount = filteredRecords.filter(r => getMappedStatus(r.statusAduan) === 'Eskalasi Dedicated Agent').length;
  const activeUkerCount = filteredRecords.filter(r => getMappedStatus(r.statusAduan) === 'Eskalasi UKER').length;
  const activeRegOutboundCount = filteredRecords.filter(r => getMappedStatus(r.statusAduan) === 'Eskalasi Regular Outbound').length;

  // 1. Daily Volume Trend Area Chart Data
  const dailyCounts: { [key: string]: number } = {};
  filteredRecords.forEach(r => {
    const d = r.tanggalAduan || 'Unknown';
    dailyCounts[d] = (dailyCounts[d] || 0) + 1;
  });
  const dailyTrendData = Object.keys(dailyCounts)
    .sort((a, b) => parseSmeDateToNum(a) - parseSmeDateToNum(b))
    .map(date => ({
      date,
      count: dailyCounts[date]
    }));

  // 2. Monthly Trend Area Chart Data
  const monthCounts: { [key: string]: number } = {};
  filteredRecords.forEach(r => {
    const m = r.bulan || 'Unknown';
    monthCounts[m] = (monthCounts[m] || 0) + 1;
  });
  const monthlyTrendData = Object.keys(monthCounts)
    .sort((a, b) => {
      const idxA = MONTH_ORDER.indexOf(a);
      const idxB = MONTH_ORDER.indexOf(b);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    })
    .map(month => ({
      month,
      count: monthCounts[month]
    }));

  // 3. Tagging Frequencies for Bar Chart
  const tagCounts: { [key: string]: number } = {};
  filteredRecords.forEach(r => {
    const t = r.tag || 'Unassigned';
    tagCounts[t] = (tagCounts[t] || 0) + 1;
  });
  const sortedTagsData = Object.keys(tagCounts)
    .sort((a, b) => tagCounts[b] - tagCounts[a])
    .map(name => ({
      name,
      count: tagCounts[name]
    }));
  const displayedTagsData = showAllTags ? sortedTagsData : sortedTagsData.slice(0, 10);

  // 4. Divisi Eskalasi Distribution (reactive)
  const divisiCountsFiltered: { [key: string]: number } = {};
  filteredRecords.forEach(r => {
    const dev = r.divisiEskalasi || 'Unknown';
    divisiCountsFiltered[dev] = (divisiCountsFiltered[dev] || 0) + 1;
  });
  const divisiDistributionData = Object.keys(divisiCountsFiltered)
    .sort((a, b) => divisiCountsFiltered[b] - divisiCountsFiltered[a])
    .map(name => ({
      name,
      count: divisiCountsFiltered[name]
    }));

  // 5. Channel Distribution (reactive)
  const channelCountsFiltered: { [key: string]: number } = {};
  filteredRecords.forEach(r => {
    const ch = r.channel || 'Unknown';
    channelCountsFiltered[ch] = (channelCountsFiltered[ch] || 0) + 1;
  });
  const channelDistributionData = Object.keys(channelCountsFiltered)
    .sort((a, b) => channelCountsFiltered[b] - channelCountsFiltered[a])
    .map(name => ({
      name,
      count: channelCountsFiltered[name]
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs font-sans">
          <p className="font-bold mb-1 text-slate-300 font-mono">{label}</p>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.stroke || p.fill || '#0d9488' }} />
              <span className="text-slate-400">{p.name || 'Jumlah'}:</span>
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
        <div className="p-4 bg-teal-50 text-teal-600 rounded-2xl animate-spin">
          <RefreshCw className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-800">Memuat Data SME (Subject Matter Expert)...</h3>
          <p className="text-xs text-slate-400 max-w-sm">Mengekstrak log eskalasi aduan SME.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Title section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 font-bold text-xs uppercase tracking-wider">
            <Users className="h-4 w-4" />
            <span>Dashboard Subject Matter Expert (SME)</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight font-sans mt-1">
            Dashboard Pengaduan SME
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Data real-time penanganan kendala yang membutuhkan eskalasi tingkat lanjut dari unit kerja (UKER) ke Subject Matter Expert Satuan Pelayanan Gizi.
          </p>
        </div>
      </div>

      {/* Connection status warning */}
      {status?.status === 'error' && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row gap-5 items-start">
          <div className="p-3 bg-rose-100 border border-rose-200 text-rose-700 rounded-xl flex-shrink-0">
            <Database className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-3 flex-grow">
            <h3 className="text-base font-bold text-rose-900 font-sans tracking-tight">Koneksi Spreadsheet SME Terkendala</h3>
            <p className="text-sm text-rose-700/90 leading-relaxed max-w-3xl">
              Aplikasi mendeteksi error saat mencoba mengakses log: <strong className="font-mono text-xs bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">{status.error}</strong>
            </p>
          </div>
        </div>
      )}

      {/* KPI Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          id="sme-kpi-total"
          title="Total Tiket SME"
          value={totalRecords.toLocaleString()}
          icon={<Briefcase className="h-5 w-5 text-teal-600" />}
          colorClass="bg-teal-50 text-teal-600 border border-teal-100"
          sparklineData={dailyTrends.map(t => ({ value: t.total }))}
          sparklineColor="#0d9488"
        />
        <MetricCard
          id="sme-kpi-solved"
          title="Eskalasi Dedicated Agent"
          value={activeDedicatedCount.toLocaleString()}
          icon={<ShieldCheck className="h-5 w-5 text-emerald-600" />}
          colorClass="bg-emerald-50 text-emerald-600 border border-emerald-100"
          sparklineData={dailyTrends.map(t => ({ value: t.dedicated }))}
          sparklineColor="#10b981"
        />
        <MetricCard
          id="sme-kpi-progress"
          title="Eskalasi UKER"
          value={activeUkerCount.toLocaleString()}
          icon={<Activity className="h-5 w-5 text-indigo-600" />}
          colorClass="bg-indigo-50 text-indigo-600 border border-indigo-100"
          sparklineData={dailyTrends.map(t => ({ value: t.uker }))}
          sparklineColor="#6366f1"
        />
        <MetricCard
          id="sme-kpi-other"
          title="Eskalasi Reg Outbound"
          value={activeRegOutboundCount.toLocaleString()}
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          colorClass="bg-amber-50 text-amber-600 border border-amber-100"
          sparklineData={dailyTrends.map(t => ({ value: t.outbound }))}
          sparklineColor="#f59e0b"
        />
      </div>

      {/* Interactive, Visually Rich Filter Card removal */}

      {/* Charts Section */}
      <div className="space-y-8">
        
        {/* ROW 1: Daily Trend & Monthly Trend Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
      {/* Daily Trend Line (Area) Chart */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800">Tren Volume Tiket SME (Harian)</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDailyDetailModal(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg text-xs font-bold text-teal-700 transition-all cursor-pointer shadow-3xs active:scale-95"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Detail Tren Harian</span>
                </button>
                <button
                  onClick={() => downloadChartAsPng('sme-daily-trend-chart-container', 'tren-volume-tiket-sme-harian')}
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-3xs"
                  title="Unduh Grafik PNG"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div id="sme-daily-trend-chart-container" className="h-[280px] w-full">
              {dailyTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrendData} margin={{ top: 20, right: 15, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="smeDailyTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 9, fontWeight: 500 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="Jumlah Aduan"
                      stroke="#0d9488"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#smeDailyTrendGrad)"
                      dot={{ r: 3, strokeWidth: 1, stroke: '#ffffff', fill: '#0d9488' }}
                    >
                      <LabelList
                        dataKey="count"
                        position="top"
                        offset={10}
                        style={{ fill: '#0f766e', fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace' }}
                      />
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                  Data harian kosong untuk filter aktif.
                </div>
              )}
            </div>
          </div>

          {/* Monthly Trend Line (Area) Chart */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">Tren Aduan Bulanan SME</h3>
              </div>
              <button
                onClick={() => downloadChartAsPng('sme-monthly-trend-chart-container', 'tren-aduan-bulanan-sme')}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-3xs"
                title="Unduh Grafik PNG"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
            <div id="sme-monthly-trend-chart-container" className="h-[280px] w-full">
              {monthlyTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrendData} margin={{ top: 20, right: 15, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="smeMonthlyTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="Aduan Bulanan"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#smeMonthlyTrendGrad)"
                      dot={{ r: 4, strokeWidth: 1.5, stroke: '#ffffff', fill: '#6366f1' }}
                    >
                      <LabelList
                        dataKey="count"
                        position="top"
                        offset={10}
                        style={{ fill: '#4f46e5', fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace' }}
                      />
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                  Data bulanan kosong untuk filter aktif.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ROW 2: Bar Chart for Top Tagging & Other distributions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Top Tagging Bar Chart (Full Width / Span 2) */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TagIcon className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  Top Tagging Pengaduan ({showAllTags ? 'Semua' : '10 Teratas'})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAllTags(!showAllTags)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-700 transition-all cursor-pointer shadow-3xs active:scale-95"
                >
                  <span>{showAllTags ? 'Tampilkan 10 Teratas' : 'Munculkan Semua Tag'}</span>
                </button>
                <button
                  onClick={() => downloadChartAsPng('sme-tagging-chart-container', 'top-10-tagging-sme')}
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-3xs"
                  title="Unduh Grafik PNG"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div id="sme-tagging-chart-container" className="h-[280px] w-full">
              {displayedTagsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayedTagsData} margin={{ top: 15, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                      angle={-30}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Frekuensi Tag" fill="#10b981" radius={[5, 5, 0, 0]} barSize={25}>
                      {displayedTagsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                      <LabelList
                        dataKey="count"
                        position="top"
                        style={{ fill: '#047857', fontSize: 9, fontWeight: 'bold' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                  Data tag pengaduan kosong.
                </div>
              )}
            </div>
          </div>

          {/* Saluran Aduan (Channel) Pie Donut Chart */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800">Saluran Aduan (Channel)</h3>
              </div>
              <button
                onClick={() => downloadChartAsPng('sme-channel-chart-container', 'saluran-aduan-channel-sme')}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-3xs"
                title="Unduh Grafik PNG"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
            
            <div id="sme-channel-chart-container" className="h-[220px] w-full relative flex items-center justify-center">
              {channelDistributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channelDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="count"
                    >
                      {channelDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                  Data saluran aduan kosong.
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 overflow-y-auto max-h-[120px]">
              {channelDistributionData.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="font-semibold text-slate-600">{item.name}</span>
                  </div>
                  <div className="font-mono font-bold text-slate-800">
                    {item.count.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">({Math.round((item.count / (totalRecords || 1)) * 100)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ROW 3: Distribusi Divisi Bar Chart */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Distribusi Divisi Eskalasi ({showAllDivisi ? 'Semua' : '5 Teratas'})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAllDivisi(!showAllDivisi)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-700 transition-all cursor-pointer shadow-3xs active:scale-95"
            >
              <span>{showAllDivisi ? 'Tampilkan 5 Teratas' : 'Munculkan Semua Divisi'}</span>
            </button>
            <button
              onClick={() => downloadChartAsPng('sme-divisi-chart-container', 'distribusi-divisi-eskalasi-sme')}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-3xs"
              title="Unduh Grafik PNG"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div id="sme-divisi-chart-container" className="h-[280px] w-full">
          {divisiDistributionData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={showAllDivisi ? divisiDistributionData : divisiDistributionData.slice(0, 5)} 
                margin={{ top: 15, right: 10, left: -20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748b', fontWeight: 600 }}
                />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Jumlah Eskalasi" fill="#6366f1" radius={[5, 5, 0, 0]} barSize={40}>
                  {(showAllDivisi ? divisiDistributionData : divisiDistributionData.slice(0, 5)).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="top"
                    style={{ fill: '#4f46e5', fontSize: 10, fontWeight: 'bold' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
              Data divisi eskalasi kosong.
            </div>
          )}
        </div>
      </div>

      {/* Explorer Log SME table Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-4">
        
        {/* Header and Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-teal-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Pencarian Riil Tiket Eskalasi SME</h3>
              <p className="text-[11px] text-slate-400">Navigasi log detail pengaduan dari seluruh Indonesia.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs active:scale-95 whitespace-nowrap ${
                showFilters 
                  ? 'bg-teal-50 border-teal-200 text-teal-700' 
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>{showFilters ? 'Sembunyikan Saringan' : 'Tampilkan Saringan'}</span>
            </button>
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-3xs active:scale-95"
            >
              Reset Saringan
            </button>
            <button
              onClick={() => setIsTableVisible(!isTableVisible)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-3xs active:scale-95 whitespace-nowrap"
            >
              {isTableVisible ? (
                <>
                  <EyeOff className="h-4 w-4 text-slate-500" />
                  <span>Sembunyikan Tabel</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 text-teal-600" />
                  <span>Tampilkan Tabel Eksplorasi ({totalRecords.toLocaleString()} Tiket)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {isTableVisible ? (
          <>
            {showFilters && (
              <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100/80 space-y-4 animate-fade-in">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Search Text */}
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                      <Search className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Cari Pelapor, Tiket, Deskripsi, Wilayah..."
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl text-xs outline-hidden transition-all placeholder:text-slate-400 text-slate-800 font-semibold shadow-3xs"
                    />
                  </div>

                  {/* Date Ranges */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-3xs">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="text-[11px] font-semibold text-slate-700 bg-transparent border-0 outline-hidden focus:ring-0 p-0"
                        title="Tanggal Mulai"
                      />
                    </div>
                    <span className="text-slate-400 text-xs font-bold">s/d</span>
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-3xs">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="text-[11px] font-semibold text-slate-700 bg-transparent border-0 outline-hidden focus:ring-0 p-0"
                        title="Tanggal Akhir"
                      />
                    </div>
                  </div>
                </div>

                {/* Multi-Select Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {/* Status Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Eskalasi</label>
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs text-slate-700 font-semibold outline-hidden shadow-3xs"
                    >
                      <option value="">Semua Status ({records.length})</option>
                      <option value="Eskalasi Dedicated Agent">Eskalasi Dedicated Agent</option>
                      <option value="Eskalasi UKER">Eskalasi UKER</option>
                      <option value="Eskalasi Regular Outbound">Eskalasi Regular Outbound</option>
                    </select>
                  </div>

                  {/* Profile Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Profile Pelapor (Profile 3)</label>
                    <select
                      value={profileFilter}
                      onChange={e => setProfileFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs text-slate-700 font-semibold outline-hidden shadow-3xs"
                    >
                      <option value="">Semua Profil ({uniqueProfiles.length})</option>
                      {uniqueProfiles.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Divisi Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Divisi Eskalasi</label>
                    <select
                      value={divisiFilter}
                      onChange={e => setDivisiFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs text-slate-700 font-semibold outline-hidden shadow-3xs"
                    >
                      <option value="">Semua Divisi ({uniqueDivisis.length})</option>
                      {uniqueDivisis.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tag Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tagging Kasus</label>
                    <select
                      value={tagFilter}
                      onChange={e => setTagFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs text-slate-700 font-semibold outline-hidden shadow-3xs"
                    >
                      <option value="">Semua Tagging ({uniqueTags.length})</option>
                      {uniqueTags.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Channel Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saluran (Channel)</label>
                    <select
                      value={channelFilter}
                      onChange={e => setChannelFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs text-slate-700 font-semibold outline-hidden shadow-3xs"
                    >
                      <option value="">Semua Saluran ({uniqueChannels.length})</option>
                      {uniqueChannels.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
            {/* SME Log Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 text-left">No. Tiket</th>
                    <th className="py-3 px-4 text-left">Bulan & Tanggal</th>
                    <th className="py-3 px-4 text-left">Nama Pelapor</th>
                    <th className="py-3 px-4 text-left">Tag</th>
                    <th className="py-3 px-4 text-center">SPPG / Wilayah</th>
                    <th className="py-3 px-4 text-left">Detail Aduan / Keluhan</th>
                    <th className="py-3 px-4 text-center">Eskalasi Divisi</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {paginatedRecords.length > 0 ? (
                    paginatedRecords.map((record, i) => {
                      const mappedStatus = getMappedStatus(record.statusAduan);
                      const isSolved = mappedStatus === 'Eskalasi Dedicated Agent';
                      const isProgress = mappedStatus === 'Eskalasi UKER';
                      
                      return (
                        <tr key={record.id || i} className="hover:bg-slate-50/40 transition-colors">
                          {/* No. Tiket */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-500 text-[10px]">
                            {record.noTiket}
                          </td>
                          
                          {/* Bulan & Tanggal */}
                          <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                            <div className="font-bold">{record.tanggalAduan}</div>
                            <div className="text-[9px] text-slate-400 font-sans uppercase">Bulan: {record.bulan}</div>
                          </td>
                          
                          {/* Nama Pelapor */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800">{record.namaPelapor}</div>
                            <div className="text-[10px] text-indigo-600 font-mono">{record.noTelepon}</div>
                            {record.profilePelapor && (
                              <div className="text-[9px] text-slate-400 font-sans">{record.profilePelapor}</div>
                            )}
                          </td>

                          {/* Tag Standalone Column */}
                          <td className="py-3.5 px-4 max-w-[150px]">
                            {record.tag ? (
                              <span className="inline-block bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider truncate max-w-full">
                                {record.tag}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">Unassigned</span>
                            )}
                          </td>
                          
                          {/* SPPG / Wilayah */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="font-bold text-slate-800">ID SPPG: {record.idSppg}</div>
                            {record.wilayah && (
                              <div className="text-[10px] text-slate-400 font-sans inline-flex items-center gap-1 mt-0.5 justify-center">
                                <MapPin className="h-3 w-3 text-red-400" />
                                <span>{record.wilayah}</span>
                              </div>
                            )}
                          </td>
                          
                          {/* Detail Aduan */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="font-bold text-indigo-700 font-sans flex items-center gap-1">
                              <span className="bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase">{record.channel}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-sans line-clamp-3 mt-1 leading-relaxed">
                              {record.deskripsi}
                            </div>
                            {record.remarks && (
                              <div className="text-[9px] text-slate-400 font-sans italic mt-1 line-clamp-2">
                                Remarks: {record.remarks}
                              </div>
                            )}
                          </td>
                          
                          {/* Eskalasi Divisi */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/50 font-bold text-[10px] uppercase">
                              {record.divisiEskalasi}
                            </span>
                          </td>
                          
                          {/* Status */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isSolved 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                : isProgress
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              {mappedStatus}
                            </span>
                            {record.statusSppg && (
                              <div className="text-[9px] text-slate-400 font-sans mt-0.5">{record.statusSppg}</div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                        Tidak ada eskalasi SME yang cocok dengan kriteria penyaringan.
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
                  Menampilkan <strong className="text-slate-800">{((currentPage - 1) * pageSize) + 1}</strong> - <strong className="text-slate-800">{Math.min(currentPage * pageSize, totalRecords)}</strong> dari <strong className="text-slate-800">{totalRecords.toLocaleString()}</strong> log SME.
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
                              ? 'bg-teal-600 text-white border-teal-600'
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
          </>
        ) : (
          <div className="p-8 bg-slate-50 border border-slate-200 border-dashed rounded-2xl text-center text-slate-400 text-sm">
            Tabel pencarian riil tiket eskalasi SME sedang disembunyikan. Klik tombol "Tampilkan Tabel Eksplorasi" di atas untuk melihat detail data pengaduan.
          </div>
        )}

      </div>

      {/* Pop-up Daily Trend Detail Modal */}
      {showDailyDetailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 flex flex-col space-y-5 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Detail Tren Volume Tiket SME (Harian)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Seluruh urutan tanggal secara kronologis untuk filter aktif.</p>
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
                  <AreaChart data={dailyTrendData} margin={{ top: 20, right: 30, left: -20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="modalDailyTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
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
                      dataKey="count"
                      name="Jumlah Tiket"
                      stroke="#0d9488"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#modalDailyTrendGrad)"
                      dot={{ r: 4, strokeWidth: 1.5, stroke: '#ffffff', fill: '#0d9488' }}
                    >
                      <LabelList
                        dataKey="count"
                        position="top"
                        offset={10}
                        style={{ fill: '#0f766e', fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace' }}
                      />
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stats summary of the dates */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-xs font-semibold">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Hari Aktif</div>
                <div className="text-lg font-bold font-mono text-slate-800 mt-1">{dailyTrendData.length} hari</div>
              </div>
              <div className="p-3 bg-teal-50 rounded-2xl border border-teal-100">
                <div className="text-[10px] uppercase font-bold text-teal-600">Rata-rata Tiket/Hari</div>
                <div className="text-lg font-bold font-mono text-teal-700 mt-1">
                  {Math.round(totalRecords / (dailyTrendData.length || 1))} tiket
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="text-[10px] uppercase font-bold text-emerald-600">Volume Tertinggi</div>
                <div className="text-lg font-bold font-mono text-emerald-700 mt-1">
                  {dailyTrendData.length > 0 ? Math.max(...dailyTrendData.map(d => d.count)) : 0} tiket
                </div>
              </div>
              <div className="p-3 bg-violet-50 rounded-2xl border border-violet-100">
                <div className="text-[10px] uppercase font-bold text-violet-600">Total Tiket Terfilter</div>
                <div className="text-lg font-bold font-mono text-violet-700 mt-1">{totalRecords.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
