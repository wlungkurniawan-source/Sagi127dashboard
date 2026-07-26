import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  PhoneIncoming,
  Clock,
  RefreshCw,
  Calendar,
  X,
  SlidersHorizontal,
  TrendingUp,
  Tag,
  Download,
  Percent,
  Activity,
  Search,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  User,
  Inbox,
  Filter,
  Eye,
  EyeOff,
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
  LabelList,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie
} from 'recharts';
import { InboundSummary, InboundRecord, AhtRecord } from '../types';
import MetricCard from './MetricCard';
import { downloadChartAsPng } from '../utils/chartExport';

interface InboundDashboardProps {
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
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#0d9488', // Teal
  '#3b82f6', // Blue
  '#f43f5e', // Rose
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

// Parse different Indonesian and ISO date formats to local Date objects for filtering
const parseIndonesianDate = (dateStr: any): Date => {
  if (!dateStr) return new Date(0);
  const clean = String(dateStr).trim().toLowerCase();
  
  // 1. Check for YYYY-MM-DD (ISO)
  const isoMatch = clean.match(/^(\d{4})[/\s-](\d{1,2})[/\s-](\d{1,2})/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
  }

  // 2. Check for DD/MM/YYYY or DD-MM-YYYY
  const slashMatch = clean.match(/^(\d{1,2})[/\s-](\d{1,2})[/\s-](\d{4})/);
  if (slashMatch) {
    return new Date(parseInt(slashMatch[3], 10), parseInt(slashMatch[2], 10) - 1, parseInt(slashMatch[1], 10));
  }

  // 3. Check for DD/MM/YY or DD-MM-YY (two digit year)
  const shortYearMatch = clean.match(/^(\d{1,2})[/\s-](\d{1,2})[/\s-](\d{2})$/);
  if (shortYearMatch) {
    const year = parseInt(shortYearMatch[3], 10) + 2000; // Assume 21st century
    return new Date(year, parseInt(shortYearMatch[2], 10) - 1, parseInt(shortYearMatch[1], 10));
  }

  // 4. Parse Indonesian named formats like: "1-Mei", "01-Mei", "1-Mei-2026", "1 Juli", "01 Juli"
  const months: Record<string, number> = {
    jan: 0, januari: 0,
    feb: 1, februari: 1,
    mar: 2, maret: 2,
    apr: 3, april: 3,
    mei: 4,
    jun: 5, juni: 5,
    jul: 6, juli: 6,
    ags: 7, agustus: 7,
    sep: 8, september: 8,
    okt: 9, oktober: 9,
    nov: 10, november: 10,
    des: 11, desember: 11
  };

  const match = clean.match(/^(\d{1,2})[\s\-]([a-z]+)/);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthName = match[2];
    const month = months[monthName] !== undefined ? months[monthName] : 4; // default to May if unknown
    
    const yearMatch = clean.match(/(\d{4})$/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : 2026;
    
    return new Date(year, month, day);
  }

  const parsed = Date.parse(clean);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return new Date(0);
};

// Helper to parse "YYYY-MM-DD" local date string from <input type="date">
const parseInputDate = (inputStr: string): Date | null => {
  if (!inputStr) return null;
  const parts = inputStr.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date(inputStr);
};

export default function InboundDashboard({ refreshTrigger, globalFilters }: InboundDashboardProps) {
  const [data, setData] = useState<InboundSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);

  // Local Filter States
  const [statusFilter, setStatusFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const uniqueAgents = React.useMemo(() => {
    const agents = (data?.records || []).map(r => r.agent).filter(Boolean);
    const ahtAgents = (data?.ahtRecords || []).map(r => r.name).filter(Boolean);
    return Array.from(new Set([...agents, ...ahtAgents])).sort();
  }, [data]);

  const uniqueCategories = React.useMemo(() => {
    return Array.from(new Set((data?.records || []).map(r => r.category).filter(Boolean))).sort();
  }, [data]);

  // Saringan, tabel visibility, dan detail modal states (sesuai menu Non-voice)
  const [isTableVisible, setIsTableVisible] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showDailyDetailModal, setShowDailyDetailModal] = useState(false);

  const fetchData = async () => {
    try {
      const summaryRes = await fetch('/api/inbound/summary');
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setData(summaryData);
      }
      
      const statusRes = await fetch('/api/inbound/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData);
      }
    } catch (e) {
      console.error('Error fetching inbound data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  // Apply filters to ticket records (Solved + Eskalasi)
  const filteredTickets = React.useMemo(() => {
    const records = data?.records || [];
    return records.filter(r => {
      // Local Filters
      if (agentFilter && String(r.agent || '').toLowerCase() !== agentFilter.toLowerCase()) {
        return false;
      }
      if (categoryFilter && String(r.category || '').toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
      if (statusFilter && String(r.status || '').toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (startDate || endDate) {
        const dateObj = parseIndonesianDate(r.tanggal);
        if (startDate) {
          const start = parseInputDate(startDate);
          if (start && dateObj < start) return false;
        }
        if (endDate) {
          const end = parseInputDate(endDate);
          if (end && dateObj > end) return false;
        }
      }

      return true;
    });
  }, [data?.records, agentFilter, categoryFilter, statusFilter, startDate, endDate]);

  // Apply filters to AHT Inbound records
  const filteredAhtRecords = React.useMemo(() => {
    const ahtRecords = data?.ahtRecords || [];
    return ahtRecords.filter(r => {
      // Local Filters
      if (agentFilter && String(r.name || '').toLowerCase() !== agentFilter.toLowerCase()) {
        return false;
      }
      if (startDate || endDate) {
        const dateObj = parseIndonesianDate(r.callStart || r.tanggal);
        if (startDate) {
          const start = parseInputDate(startDate);
          if (start && dateObj < start) return false;
        }
        if (endDate) {
          const end = parseInputDate(endDate);
          if (end && dateObj > end) return false;
        }
      }

      return true;
    });
  }, [data?.ahtRecords, agentFilter, startDate, endDate]);

  // Table Exploration State
  const [tableSearch, setTableSearch] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);

  const searchedTickets = React.useMemo(() => {
    if (!tableSearch) return filteredTickets;
    const query = tableSearch.toLowerCase();
    return filteredTickets.filter(r => {
      return (
        String(r.id || '').toLowerCase().includes(query) ||
        String(r.customerName || '').toLowerCase().includes(query) ||
        String(r.category || '').toLowerCase().includes(query) ||
        String(r.agent || '').toLowerCase().includes(query) ||
        String(r.remarks || '').toLowerCase().includes(query) ||
        String(r.tanggal || '').toLowerCase().includes(query)
      );
    });
  }, [filteredTickets, tableSearch]);

  const totalTableRecords = searchedTickets.length;
  const totalTablePages = Math.ceil(totalTableRecords / tablePageSize) || 1;
  const paginatedTableRecords = React.useMemo(() => {
    return searchedTickets.slice(
      (tablePage - 1) * tablePageSize,
      tablePage * tablePageSize
    );
  }, [searchedTickets, tablePage, tablePageSize]);

  // Deteksi kolom dinamis asli dari spreadsheet (Solved / Eskalasi)
  const dynamicHeaders = React.useMemo(() => {
    if (!filteredTickets || filteredTickets.length === 0) return [];
    const sampleRecord = filteredTickets.find(r => r.raw && Object.keys(r.raw).length > 0);
    if (!sampleRecord || !sampleRecord.raw) return [];
    return Object.keys(sampleRecord.raw).filter(k => k.trim() !== "");
  }, [filteredTickets]);

  // Reset page when filters or search change
  useEffect(() => {
    setTablePage(1);
  }, [tableSearch, statusFilter, agentFilter, categoryFilter, startDate, endDate]);

  // Dynamic KPI Metrics calculations
  const solvedCount = filteredTickets.filter(r => r.status === 'Solved').length;
  const escalatedCount = filteredTickets.filter(r => r.status === 'Eskalasi').length;

  // Answered Rate from filtered AHT Inbound
  const answeredRate = React.useMemo(() => {
    const totalCalls = filteredAhtRecords.length;
    if (totalCalls === 0) return 0;
    const answeredCalls = filteredAhtRecords.filter(r => r.event === 'Answered').length;
    return Math.round((answeredCalls / totalCalls) * 100);
  }, [filteredAhtRecords]);

  // Average AHT from filtered AHT Inbound
  const averageAhtSec = React.useMemo(() => {
    let totalSec = 0;
    let count = 0;
    filteredAhtRecords.forEach(r => {
      if (r.aht > 0) {
        totalSec += r.aht;
        count++;
      }
    });
    return count > 0 ? Math.round(totalSec / count) : 0;
  }, [filteredAhtRecords]);

  // Hourly Traffic from filtered AHT Inbound
  const trafficPerHourData = React.useMemo(() => {
    const hourCounts: Record<string, number> = {};
    filteredAhtRecords.forEach(r => {
      if (r.timeStart) {
        const hour = String(r.timeStart).trim().split(':')[0];
        if (hour) {
          const formattedHour = `${hour.padStart(2, '0')}:00`;
          hourCounts[formattedHour] = (hourCounts[formattedHour] || 0) + 1;
        }
      }
    });
    return Object.keys(hourCounts)
      .sort()
      .map(hour => ({ hour, count: hourCounts[hour] }));
  }, [filteredAhtRecords]);

  // Topics/Category distribution from filtered tickets
  const categoryData = React.useMemo(() => {
    const catMap: Record<string, number> = {};
    filteredTickets.forEach(r => {
      const cat = r.category || 'Lain-lain';
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    return Object.keys(catMap)
      .map(name => ({ name, count: catMap[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filteredTickets]);

  // Daily Trend of tickets (Solved vs Eskalasi)
  const dailyTrendData = React.useMemo(() => {
    const trendMap: Record<string, { date: string; total: number; solved: number; escalated: number }> = {};
    filteredTickets.forEach(r => {
      const dateStr = r.tanggal || 'Unknown';
      if (dateStr === 'Unknown') return;
      if (!trendMap[dateStr]) {
        trendMap[dateStr] = { date: dateStr, total: 0, solved: 0, escalated: 0 };
      }
      trendMap[dateStr].total++;
      if (r.status === 'Solved') {
        trendMap[dateStr].solved++;
      } else {
        trendMap[dateStr].escalated++;
      }
    });

    return Object.values(trendMap).sort((a, b) => {
      return parseIndonesianDate(a.date).getTime() - parseIndonesianDate(b.date).getTime();
    });
  }, [filteredTickets]);

  // Call status Abandon vs ASR for Pie Chart
  const callStatusPieData = React.useMemo(() => {
    let asr = 0;
    let abandon = 0;
    filteredAhtRecords.forEach(r => {
      if (r.event === 'Answered') {
        asr++;
      } else if (r.event === 'Abandon' || r.event === 'No Answer') {
        abandon++;
      }
    });
    return [
      { name: 'ASR (Answered)', value: asr },
      { name: 'Abandon', value: abandon }
    ];
  }, [filteredAhtRecords]);

  // Daily AHT and Answered Rate trends for sparklines
  const dailyAhtTrend = React.useMemo(() => {
    const map: Record<string, { total: number; answered: number; totalAht: number; ahtCount: number }> = {};
    filteredAhtRecords.forEach(r => {
      const dateStr = r.tanggal || 'Unknown';
      if (dateStr === 'Unknown') return;
      if (!map[dateStr]) {
        map[dateStr] = { total: 0, answered: 0, totalAht: 0, ahtCount: 0 };
      }
      map[dateStr].total++;
      if (r.event === 'Answered') {
        map[dateStr].answered++;
      }
      if (r.aht > 0) {
        map[dateStr].totalAht += r.aht;
        map[dateStr].ahtCount++;
      }
    });
    return Object.keys(map)
      .sort((a, b) => parseIndonesianDate(a).getTime() - parseIndonesianDate(b).getTime())
      .map(date => {
        const item = map[date];
        const asr = item.total > 0 ? Math.round((item.answered / item.total) * 100) : 0;
        const avgAht = item.ahtCount > 0 ? Math.round(item.totalAht / item.ahtCount) : 0;
        return { date, asr, avgAht };
      });
  }, [filteredAhtRecords]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs font-sans">
          <p className="font-bold mb-1 text-slate-300 font-mono">{label}</p>
          {payload.map((p: any, i: number) => {
            const val = p.value !== undefined && p.value !== null ? Number(p.value) : 0;
            return (
              <div key={i} className="flex items-center gap-2 py-0.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.stroke || p.fill || '#6366f1' }} />
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

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-3xs flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <h3 className="text-slate-800 font-bold text-base">Memuat Menu Analitik Inbound...</h3>
        <p className="text-slate-400 text-xs mt-1 max-w-sm">Membaca dan memilah data dari Google Sheet Inbound (Solved, Eskalasi, AHT Inbound)</p>
      </div>
    );
  }

  return (
    <div id="inbound-dashboard-view" className="space-y-8 animate-in fade-in duration-200">
      
      {/* Sub-Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight font-sans">Kinerja & Layanan Inbound</h2>
          <p className="text-xs text-slate-500 font-sans">
            Analisis panggilan masuk, penanganan durasi (AHT), dan kinerja pelayanan pelanggan
          </p>
        </div>
      </div>

      {/* KPI Cards Row with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          id="inbound-kpi-total-tickets"
          title="Total Tiket Pengaduan"
          value={filteredTickets.length.toLocaleString()}
          icon={<PhoneIncoming className="h-5 w-5 text-indigo-600" />}
          colorClass="bg-indigo-50 text-indigo-600 border border-indigo-100"
          sparklineData={dailyTrendData.map(d => ({ value: d.total }))}
          sparklineColor="#6366f1"
        />
        <MetricCard
          id="inbound-kpi-solved"
          title="Status Solved"
          value={solvedCount.toLocaleString()}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          colorClass="bg-emerald-50 text-emerald-600 border border-emerald-100"
          sparklineData={dailyTrendData.map(d => ({ value: d.solved }))}
          sparklineColor="#10b981"
        />
        <MetricCard
          id="inbound-kpi-escalated"
          title="Status Eskalasi"
          value={escalatedCount.toLocaleString()}
          icon={<AlertCircle className="h-5 w-5 text-rose-600" />}
          colorClass="bg-rose-50 text-rose-600 border border-rose-100"
          sparklineData={dailyTrendData.map(d => ({ value: d.escalated }))}
          sparklineColor="#f43f5e"
        />
        <MetricCard
          id="inbound-kpi-answered-rate"
          title="Answered Rate (ASR)"
          value={`${answeredRate}%`}
          icon={<Percent className="h-5 w-5 text-teal-600" />}
          colorClass="bg-teal-50 text-teal-600 border border-teal-100"
          sparklineData={dailyAhtTrend.map(d => ({ value: d.asr }))}
          sparklineColor="#0d9488"
        />
        <MetricCard
          id="inbound-kpi-aht"
          title="Rata-rata Penanganan (AHT)"
          value={formatAHT(averageAhtSec)}
          icon={<Clock className="h-5 w-5 text-amber-500 fill-amber-500/20" />}
          colorClass="bg-amber-50 text-amber-600 border border-amber-100"
          sparklineData={dailyAhtTrend.map(d => ({ value: d.avgAht }))}
          sparklineColor="#f59e0b"
        />
      </div>

      {/* Charts Layout Container */}
      <div className="space-y-6">
        
        {/* Row 1: Daily Ticket Volume Trend & Call Status Pie */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Tren Volume Tiket Harian (Area Chart) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col h-[380px] hover:border-slate-300 transition-all duration-300 shadow-2xs relative lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Tren Volume Tiket Harian</h3>
                  <p className="text-xs text-slate-500">Perkembangan total aduan masuk berdasarkan tanggal aduan</p>
                </div>
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
                  onClick={() => downloadChartAsPng('inbound-daily-trend-chart-container', 'tren-volume-tiket-harian')}
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-3xs"
                  title="Unduh Grafik PNG"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div id="inbound-daily-trend-chart-container" className="flex-1 min-h-0">
              {dailyTrendData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs italic">
                  Data tren harian tidak ditemukan atau kosong.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrendData} margin={{ top: 20, right: 15, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="inboundDailyTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
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
                      dataKey="total" 
                      name="Total Tiket" 
                      stroke="#6366f1" 
                      strokeWidth={3} 
                      fillOpacity={1}
                      fill="url(#inboundDailyTrendGrad)"
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
              )}
            </div>
          </div>

          {/* Status Call Abandon vs ASR (Pie/Donut Chart) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col h-[380px] hover:border-slate-300 transition-all duration-300 shadow-2xs relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Status Call (Abandon vs ASR)</h3>
                  <p className="text-xs text-slate-500">Perbandingan Answered (ASR) vs Abandon</p>
                </div>
              </div>
              <button
                onClick={() => downloadChartAsPng('inbound-call-status-chart-container', 'status-panggilan-abandon-vs-asr')}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-3xs"
                title="Unduh Grafik PNG"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>

            <div id="inbound-call-status-chart-container" className="flex-1 min-h-0 flex flex-col justify-center items-center">
              {filteredAhtRecords.length === 0 ? (
                <div className="text-slate-400 text-xs italic">
                  Data status panggilan kosong.
                </div>
              ) : (
                <div className="w-full h-full flex flex-col sm:flex-row items-center justify-center gap-4">
                  <div className="w-1/2 h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={callStatusPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell key="cell-0" fill="#10b981" /> {/* ASR Emerald */}
                          <Cell key="cell-1" fill="#ef4444" /> {/* Abandon Rose */}
                        </Pie>
                        <Tooltip formatter={(value: any) => [`${value} Panggilan`, 'Jumlah']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-3 font-sans text-xs">
                    {callStatusPieData.map((entry, index) => {
                      const total = filteredAhtRecords.length;
                      const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                      return (
                        <div key={index} className="flex items-start gap-2">
                          <span className="w-3 h-3 rounded-full mt-0.5" style={{ backgroundColor: index === 0 ? '#10b981' : '#ef4444' }} />
                          <div>
                            <p className="font-bold text-slate-700">{entry.name}</p>
                            <p className="text-slate-500 text-[11px]">{entry.value.toLocaleString()} Call ({pct}%)</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Row 2: Hourly Traffic & Topic Classification */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Traffic Panggilan Per Jam (Time Start) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col h-[380px] hover:border-slate-300 transition-all duration-300 shadow-2xs relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Traffic Panggilan Per Jam (Time Start)</h3>
                  <p className="text-xs text-slate-500">Volume panggilan masuk per jam kerja di AHT Inbound</p>
                </div>
              </div>
              <button
                onClick={() => downloadChartAsPng('inbound-hourly-traffic-chart-container', 'traffic-panggilan-per-jam')}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-3xs"
                title="Unduh Grafik PNG"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>

            <div id="inbound-hourly-traffic-chart-container" className="flex-1 min-h-0">
              {trafficPerHourData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs italic">
                  Data jam masuk tidak ditemukan atau kosong.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trafficPerHourData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="hour" 
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
                      name="Volume Panggilan" 
                      stroke="#6366f1" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#colorTraffic)" 
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
              )}
            </div>
          </div>

          {/* Klasifikasi Topik Pengaduan Inbound */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col h-[380px] hover:border-slate-300 transition-all duration-300 shadow-2xs relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                  <Tag className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Klasifikasi Topik Pengaduan Inbound</h3>
                  <p className="text-xs text-slate-500">Kategori topik masalah yang sering diadukan via telepon</p>
                </div>
              </div>
              <button
                onClick={() => downloadChartAsPng('inbound-topic-chart-container', 'klasifikasi-topik-pengaduan-inbound')}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-3xs"
                title="Unduh Grafik PNG"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>

            <div id="inbound-topic-chart-container" className="flex-1 min-h-0">
              {categoryData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs italic">
                  Data topik pengaduan kosong atau terfilter seluruhnya.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis 
                      type="number" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} 
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: '#334155', fontSize: 10, fontWeight: 600 }} 
                      width={110} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Jumlah" radius={[0, 6, 6, 0]}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                      <LabelList
                        dataKey="count"
                        position="right"
                        offset={8}
                        style={{ fill: '#475569', fontSize: 10, fontWeight: 'bold', fontFamily: 'monospace' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Section 3: Eksplorasi Ril Data Tiket Inbound */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4 hover:border-slate-300 transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <Inbox className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Eksplorasi Ril Data Tiket Inbound</h3>
              <p className="text-xs text-slate-500">Daftar lengkap log tiket pengaduan Inbound (Solved & Eskalasi)</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Table Search (only shown if table is visible) */}
            {isTableVisible && (
              <div className="relative max-w-sm w-full sm:w-72">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  value={tableSearch}
                  onChange={e => setTableSearch(e.target.value)}
                  placeholder="Cari data aduan..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs outline-hidden text-slate-700 font-medium transition-all"
                />
              </div>
            )}

            {/* Toggle Filter Button */}
            {isTableVisible && (
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

            {/* Toggle Table Button */}
            <button
              onClick={() => setIsTableVisible(!isTableVisible)}
              className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-3xs active:scale-95 whitespace-nowrap"
            >
              {isTableVisible ? (
                <>
                  <EyeOff className="h-4 w-4 text-slate-500" />
                  <span>Sembunyikan Tabel</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 text-indigo-600" />
                  <span>Tampilkan Tabel Eksplorasi ({searchedTickets.length.toLocaleString()} Tiket)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Real Inbound Tickets Table (Collapsible) */}
        {isTableVisible && (
          <>
            {showFilters && (
              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3 text-xs mb-4 animate-fade-in">
                <div className="flex flex-col lg:flex-row gap-3">
                  {/* Status Filter */}
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status Tiket</label>
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-700 font-semibold outline-hidden shadow-3xs"
                    >
                      <option value="">Semua Status (Solved & Eskalasi)</option>
                      <option value="Solved">Solved</option>
                      <option value="Eskalasi">Eskalasi</option>
                    </select>
                  </div>

                  {/* Agent Filter */}
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Agen Handled</label>
                    <select
                      value={agentFilter}
                      onChange={e => setAgentFilter(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-700 font-semibold outline-hidden shadow-3xs"
                    >
                      <option value="">Semua Agen ({uniqueAgents.length})</option>
                      {uniqueAgents.map(ag => (
                        <option key={ag} value={ag}>{ag}</option>
                      ))}
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kategori Pengaduan</label>
                    <select
                      value={categoryFilter}
                      onChange={e => setCategoryFilter(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-700 font-semibold outline-hidden shadow-3xs"
                    >
                      <option value="">Semua Kategori ({uniqueCategories.length})</option>
                      {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Rentang Tanggal */}
                  <div className="flex-1 min-w-[240px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rentang Tanggal</label>
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

                  {/* Reset button */}
                  <div className="flex items-end">
                    <button
                      onClick={() => { setStatusFilter(''); setAgentFilter(''); setCategoryFilter(''); setStartDate(''); setEndDate(''); setTableSearch(''); }}
                      className="w-full lg:w-auto px-4 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-3xs"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    {dynamicHeaders.length > 0 ? (
                      <>
                        {dynamicHeaders.map((header) => (
                          <th key={header} className="py-3 px-4 text-left whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                        <th className="py-3 px-4 text-center whitespace-nowrap">Status (Sistem)</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3 px-4 text-left">ID Tiket</th>
                        <th className="py-3 px-4 text-left">Tanggal & Jam</th>
                        <th className="py-3 px-4 text-left">Pelanggan</th>
                        <th className="py-3 px-4 text-left">Kategori Pengaduan</th>
                        <th className="py-3 px-4 text-center">Durasi (AHT)</th>
                        <th className="py-3 px-4 text-left">Agen Handled</th>
                        <th className="py-3 px-4 text-left">Keterangan / Remarks</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {paginatedTableRecords.length > 0 ? (
                    paginatedTableRecords.map((record, i) => {
                      const isSolved = record.status === 'Solved';
                      
                      return (
                        <tr key={record.id || i} className="hover:bg-slate-50/40 transition-colors">
                          {dynamicHeaders.length > 0 ? (
                            <>
                              {dynamicHeaders.map((header) => {
                                const cellValue = record.raw ? record.raw[header] : '';
                                return (
                                  <td key={header} className="py-3 px-4 text-slate-700 font-sans text-xs whitespace-nowrap">
                                    {cellValue !== undefined && cellValue !== null && String(cellValue).trim() !== "" ? (
                                      String(cellValue)
                                    ) : (
                                      <span className="text-slate-300 italic">-</span>
                                    )}
                                  </td>
                                );
                              })}
                              {/* Status Badge */}
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                {isSolved ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Solved
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    Eskalasi
                                  </span>
                                )}
                              </td>
                            </>
                          ) : (
                            <>
                              {/* ID Tiket */}
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-500 text-[10px] whitespace-nowrap">
                                {record.id}
                              </td>
                              
                              {/* Tanggal & Jam */}
                              <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                                <div className="font-bold">{record.tanggal}</div>
                                <div className="text-[9px] text-slate-400 font-sans">{record.timeStart || '-'}</div>
                              </td>
                              
                              {/* Pelanggan */}
                              <td className="py-3.5 px-4 font-bold text-slate-800">
                                {record.customerName || <span className="text-slate-400 italic font-normal text-[10px]">Anonim</span>}
                              </td>

                              {/* Kategori */}
                              <td className="py-3.5 px-4">
                                <span className="inline-block bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider max-w-[180px] truncate">
                                  {record.category || 'Umum'}
                                </span>
                              </td>
                              
                              {/* AHT */}
                              <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-600 whitespace-nowrap">
                                {record.ahtRaw || formatAHT(record.aht)}
                              </td>
                              
                              {/* Agen */}
                              <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-800">
                                {record.agent || <span className="text-slate-400 italic font-normal text-[10px]">Unassigned</span>}
                              </td>
                              
                              {/* Remarks */}
                              <td className="py-3.5 px-4 max-w-xs">
                                <p className="text-[10px] text-slate-500 font-sans line-clamp-2 leading-relaxed">
                                  {record.remarks || <span className="text-slate-300 italic font-normal">-</span>}
                                </p>
                              </td>
                              
                              {/* Status */}
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                {isSolved ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Solved
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    Eskalasi
                                  </span>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={dynamicHeaders.length > 0 ? dynamicHeaders.length + 1 : 8} className="py-8 text-center text-slate-400 italic">
                        Tidak ada log tiket pengaduan yang cocok dengan filter / pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Pagination */}
            {totalTablePages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
                <span className="text-slate-500 font-semibold">
                  Menampilkan <span className="font-bold text-slate-800">{paginatedTableRecords.length}</span> dari <span className="font-bold text-slate-800">{totalTableRecords}</span> tiket
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTablePage(p => Math.max(1, p - 1))}
                    disabled={tablePage === 1}
                    className="p-1.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500 cursor-pointer disabled:cursor-not-allowed shadow-3xs"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="font-semibold text-slate-600">
                    Halaman {tablePage} dari {totalTablePages}
                  </span>
                  <button
                    onClick={() => setTablePage(p => Math.min(totalTablePages, p + 1))}
                    disabled={tablePage === totalTablePages}
                    className="p-1.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500 cursor-pointer disabled:cursor-not-allowed shadow-3xs"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pop-up Daily Trend Detail Modal (sesuai menu Non-voice) */}
      {showDailyDetailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 flex flex-col space-y-5 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Detail Tren Volume Tiket Inbound (Harian)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Seluruh urutan tanggal secara kronologis untuk saringan aktif.</p>
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
                      <linearGradient id="modalDailyTrendGradInbound" x1="0" y1="0" x2="0" y2="1">
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
                      name="Jumlah Tiket"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#modalDailyTrendGradInbound)"
                      dot={{ r: 4, strokeWidth: 1.5, stroke: '#ffffff', fill: '#6366f1' }}
                    >
                      <LabelList
                        dataKey="total"
                        position="top"
                        offset={10}
                        style={{ fill: '#4338ca', fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace' }}
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
              <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="text-[10px] uppercase font-bold text-indigo-600">Rata-rata Tiket/Hari</div>
                <div className="text-lg font-bold font-mono text-indigo-800 mt-1">
                  {dailyTrendData.length > 0 ? Math.round(dailyTrendData.reduce((acc, curr) => acc + curr.total, 0) / dailyTrendData.length) : 0} tiket
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="text-[10px] uppercase font-bold text-emerald-600">Volume Tertinggi</div>
                <div className="text-lg font-bold font-mono text-emerald-800 mt-1">
                  {dailyTrendData.length > 0 ? Math.max(...dailyTrendData.map(d => d.total)) : 0} tiket
                </div>
              </div>
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                <div className="text-[10px] uppercase font-bold text-rose-600">Volume Terendah</div>
                <div className="text-lg font-bold font-mono text-rose-800 mt-1">
                  {dailyTrendData.length > 0 ? Math.min(...dailyTrendData.map(d => d.total)) : 0} tiket
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
