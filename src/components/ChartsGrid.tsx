import React, { useState } from 'react';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  LabelList,
  AreaChart,
  Area,
} from 'recharts';
import { Tag, Award, Mail, MessageSquare, Compass, Eye, EyeOff, Download, Maximize2, X, TrendingUp } from 'lucide-react';
import { downloadChartAsPng } from '../utils/chartExport';

interface ChartsGridProps {
  summary: {
    trends: { date: string; tickets: number; solved: number; unresolved: number; emailTickets: number; chatTickets: number }[];
    categoriesData: { name: string; count: number }[];
    sourcesData: { name: string; count: number }[];
    statusesData: { name: string; count: number }[];
    profilingData?: { name: string; value: number }[];
    agentPerformance: { name: string; total: number; solved: number }[];
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
  '#14b8a6', // Teal light
  '#64748b', // Slate
];

// Custom Tooltip component for a very clean, professional look
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-xs">
        <p className="font-bold mb-1.5 text-slate-300 font-mono">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.stroke || p.fill || '#6366f1' }} />
            <span className="text-slate-400">{p.name}:</span>
            <span className="font-mono font-bold text-white ml-auto">{p.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ChartsGrid({ summary }: ChartsGridProps) {
  const [showAllAgents, setShowAllAgents] = useState(false);
  const [showAllDates, setShowAllDates] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllProfiling, setShowAllProfiling] = useState(false);
  
  // Modals for Email and Chat daily trend details
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  // Ensure we have fallback arrays to prevent chart crashes
  const trends = summary.trends || [];
  const categoriesData = summary.categoriesData || [];
  const sourcesData = summary.sourcesData || [];
  const agentPerformance = summary.agentPerformance || [];
  const profilingData = summary.profilingData || [];

  // Slice based on toggle states
  const displayedTrends = showAllDates ? trends : trends.slice(-30);
  const displayedCategories = showAllCategories ? categoriesData : categoriesData.slice(0, 10);
  const displayedAgents = showAllAgents ? agentPerformance : agentPerformance.slice(0, 10);
  const displayedProfiling = showAllProfiling ? profilingData.slice().sort((a, b) => b.value - a.value) : profilingData.slice().sort((a, b) => b.value - a.value).slice(0, 10);

  // Dynamic helper to compute spacing interval for XAxis ticks based on length to prevent overlap
  const getTickInterval = (dataLength: number) => {
    if (dataLength <= 8) return 0;
    if (dataLength <= 15) return 1;
    if (dataLength <= 31) return 2; // For ~30 days, show every 3rd day
    return Math.max(1, Math.ceil(dataLength / 12)); // Otherwise display ~12 ticks across the axis
  };

  return (
    <div id="charts-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* 1. Email Ticket Trend (Line Chart) - Interactive & Gorgeous */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col h-[400px] hover:border-slate-300 transition-all duration-300 shadow-2xs relative group">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Tren Volume Tiket Email Harian</h3>
              <p className="text-xs text-slate-500">Jumlah pengaduan masuk melalui saluran Email</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              onClick={() => setShowEmailModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-3xs active:scale-95"
              title="Tampilkan semua tanggal dalam pop-up lebar"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Detail Tren</span>
            </button>
            <button
              onClick={() => downloadChartAsPng('email-trend-chart-container', 'tren-volume-tiket-email-harian')}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-3xs"
              title="Unduh Grafik PNG"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div id="email-trend-chart-container" className="flex-1 w-full min-h-0">
          {displayedTrends.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Tidak ada data tren email untuk filter ini
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayedTrends} margin={{ top: 20, right: 15, left: -20, bottom: 20 }}>
                <defs>
                  <filter id="glow-email" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <linearGradient id="emailTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 9, fontWeight: 500 }}
                  interval={getTickInterval(displayedTrends.length)}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Area
                  type="monotone"
                  dataKey="emailTickets"
                  name="Tiket Email"
                  stroke="#f59e0b"
                  strokeWidth={3.5}
                  filter="url(#glow-email)"
                  fillOpacity={1}
                  fill="url(#emailTrendGrad)"
                  dot={{ r: 4, strokeWidth: 1.5, stroke: '#ffffff', fill: '#f59e0b' }}
                  activeDot={{ r: 7, strokeWidth: 2, stroke: '#ffffff', fill: '#f59e0b' }}
                >
                  {displayedTrends.length <= 31 && (
                    <LabelList
                      dataKey="emailTickets"
                      position="top"
                      offset={10}
                      style={{ fill: '#d97706', fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace' }}
                    />
                  )}
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 2. Chat Ticket Trend (Line Chart) - Interactive & Gorgeous */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col h-[400px] hover:border-slate-300 transition-all duration-300 shadow-2xs relative group">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Tren Volume Tiket Chat Harian</h3>
              <p className="text-xs text-slate-500">Jumlah pengaduan masuk melalui saluran Live Chat</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              onClick={() => setShowChatModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-3xs active:scale-95"
              title="Tampilkan semua tanggal dalam pop-up lebar"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Detail Tren</span>
            </button>
            <button
              onClick={() => downloadChartAsPng('chat-trend-chart-container', 'tren-volume-tiket-chat-harian')}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-3xs"
              title="Unduh Grafik PNG"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div id="chat-trend-chart-container" className="flex-1 w-full min-h-0">
          {displayedTrends.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Tidak ada data tren chat untuk filter ini
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayedTrends} margin={{ top: 20, right: 15, left: -20, bottom: 20 }}>
                <defs>
                  <filter id="glow-chat" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <linearGradient id="chatTrendGrad" x1="0" y1="0" x2="0" y2="1">
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
                  interval={getTickInterval(displayedTrends.length)}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Area
                  type="monotone"
                  dataKey="chatTickets"
                  name="Tiket Chat"
                  stroke="#6366f1"
                  strokeWidth={3.5}
                  filter="url(#glow-chat)"
                  fillOpacity={1}
                  fill="url(#chatTrendGrad)"
                  dot={{ r: 4, strokeWidth: 1.5, stroke: '#ffffff', fill: '#6366f1' }}
                  activeDot={{ r: 7, strokeWidth: 2, stroke: '#ffffff', fill: '#6366f1' }}
                >
                  {displayedTrends.length <= 31 && (
                    <LabelList
                      dataKey="chatTickets"
                      position="top"
                      offset={10}
                      style={{ fill: '#4f46e5', fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace' }}
                    />
                  )}
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 3. Top Ticket Categories (Horizontal Bar Chart) */}
      <div 
        className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col h-[400px] hover:border-slate-300 transition-all duration-300 shadow-2xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg border border-teal-100">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Kategori / Tagging Masalah</h3>
              <p className="text-xs text-slate-500">Distribusi keluhan terbanyak</p>
            </div>
          </div>

          <button
            onClick={() => setShowAllCategories(!showAllCategories)}
            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-600 rounded-xl text-xs font-semibold transition-all cursor-pointer self-start sm:self-auto"
          >
            {showAllCategories ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                <span>Batas Top 10</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                <span>Semua ({categoriesData.length})</span>
              </>
            )}
          </button>
        </div>

        <div className="flex-1 w-full min-h-0">
          {displayedCategories.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Tidak ada data kategori untuk filter ini
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={displayedCategories}
                layout="vertical"
                margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={110}
                  tickFormatter={(val) => (val.length > 15 ? `${val.substring(0, 13)}...` : val)}
                  tick={{ fill: '#475569', fontSize: 10, fontWeight: 500 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Jumlah Tiket" fill="#6366f1" radius={[0, 4, 4, 0]}>
                  {displayedCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    style={{ fill: '#475569', fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 4. Profiling L1 (Horizontal Bar Chart) */}
      <div 
        className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col h-[400px] hover:border-slate-300 transition-all duration-300 shadow-2xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg border border-violet-100">
              <Compass className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">L1 Profiling</h3>
              <p className="text-xs text-slate-500">Distribusi tiket berdasarkan Profiling L1</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setShowAllProfiling(!showAllProfiling)}
              className="flex items-center gap-1.5 px-3 py-1 bg-violet-50 hover:bg-violet-100 border border-violet-100 text-violet-600 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              {showAllProfiling ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>Batas Top 10</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  <span>Semua ({profilingData.length})</span>
                </>
              )}
            </button>
            <button
              onClick={() => downloadChartAsPng('profiling-l1-chart-container', 'profiling-l1-distribution')}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-3xs"
              title="Unduh Grafik PNG"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div id="profiling-l1-chart-container" className="flex-1 w-full min-h-0">
          {displayedProfiling.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
              Tidak ada data Profiling L1 untuk filter ini
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={displayedProfiling}
                layout="vertical"
                margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={110}
                  tickFormatter={(val) => (val.length > 15 ? `${val.substring(0, 13)}...` : val)}
                  tick={{ fill: '#475569', fontSize: 10, fontWeight: 500 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Jumlah Tiket" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                  {displayedProfiling.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    style={{ fill: '#475569', fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 4. Donut Pie Chart for Ticket Source (Email vs Chat) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col h-[400px] hover:border-slate-300 transition-all duration-300 shadow-2xs">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Distribusi Saluran Layanan (Source)</h3>
            <p className="text-xs text-slate-500">Perbandingan tiket masuk melalui Email vs. Live Chat</p>
          </div>
        </div>
        <div className="flex-1 w-full min-h-0 flex items-center justify-between gap-2">
          {sourcesData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
              Tidak ada data saluran untuk filter ini
            </div>
          ) : (
            <>
              <div className="w-[50%] h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourcesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      label={({ name, count }) => `${name}: ${count}`}
                    >
                      {sourcesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Custom detailed Legend column */}
              <div className="w-[50%] flex flex-col gap-2.5 overflow-y-auto max-h-[250px] pr-2">
                {sourcesData.map((item, index) => {
                  const total = sourcesData.reduce((acc, curr) => acc + curr.count, 0);
                  const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0';
                  return (
                    <div key={item.name} className="flex items-start gap-2.5 text-xs" id={`source-legend-${index}`}>
                      <span
                        className="w-3.5 h-3.5 rounded-full mt-0.5 flex-shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-700 truncate capitalize">{item.name}</p>
                        <p className="text-slate-500 font-mono text-[11px]">
                          {item.count.toLocaleString()} tiket ({percentage}%)
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 5. Agent Productivity Chart (With "Lihat Semua" and single bar for total cases) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col h-[400px] hover:border-slate-300 transition-all duration-300 shadow-2xs col-span-1 lg:col-span-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Produktivitas Agen {showAllAgents ? '(Semua Agen)' : '(Top 10)'}</h3>
              <p className="text-xs text-slate-500">Jumlah kasus yang ditangani oleh masing-masing agen</p>
            </div>
          </div>
          
          {/* Toggle Button for See All */}
          <button
            id="toggle-show-all-agents"
            onClick={() => setShowAllAgents(!showAllAgents)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-600 rounded-xl text-xs font-semibold transition-all cursor-pointer self-start sm:self-auto"
          >
            {showAllAgents ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                <span>Tampilkan Top 10</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                <span>Tampilkan Semua Agen ({agentPerformance.length})</span>
              </>
            )}
          </button>
        </div>

        <div className="flex-1 w-full min-h-0">
          {displayedAgents.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Tidak ada data agen untuk filter ini
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayedAgents} margin={{ top: 15, right: 10, left: -20, bottom: showAllAgents ? 25 : 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => (val.length > 12 ? `${val.substring(0, 10)}..` : val)}
                  tick={{ fill: '#475569', fontSize: showAllAgents ? 9 : 10, fontWeight: 500 }}
                  interval={showAllAgents ? Math.max(0, Math.floor(displayedAgents.length / 25)) : 0}
                  angle={showAllAgents ? -35 : 0}
                  textAnchor={showAllAgents ? 'end' : 'middle'}
                  height={showAllAgents ? 50 : 30}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" name="Jumlah Kasus Ditangani" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {displayedAgents.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                  <LabelList
                    dataKey="total"
                    position="top"
                    style={{ fill: '#475569', fontSize: 10, fontWeight: 'bold', fontFamily: 'monospace' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 6. Email Daily Trend Detail Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 flex flex-col space-y-5 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Detail Tren Volume Tiket Email (Harian)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Menampilkan seluruh urutan tanggal secara lengkap dan berurutan.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadChartAsPng('modal-email-trend-chart-container', 'detail-tren-volume-tiket-email-harian')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-3xs"
                  title="Unduh Grafik PNG"
                >
                  <Download className="h-4 w-4" />
                  <span>Unduh PNG</span>
                </button>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable Chart Area */}
            <div id="modal-email-trend-chart-container" className="overflow-x-auto border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
              <div className="min-w-[1500px] h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 20, right: 30, left: -20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="modalEmailTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
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
                      dataKey="emailTickets"
                      name="Tiket Email"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#modalEmailTrendGrad)"
                      dot={{ r: 4, strokeWidth: 1.5, stroke: '#ffffff', fill: '#f59e0b' }}
                    >
                      <LabelList
                        dataKey="emailTickets"
                        position="top"
                        offset={10}
                        style={{ fill: '#b45309', fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace' }}
                      />
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stats summary of the dates */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center text-xs font-semibold">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Hari Aktif</div>
                <div className="text-lg font-bold font-mono text-slate-800 mt-1">{trends.length} hari</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                <div className="text-[10px] uppercase font-bold text-amber-600">Total Tiket Email</div>
                <div className="text-lg font-bold font-mono text-amber-700 mt-1">
                  {trends.reduce((sum, d) => sum + (d.emailTickets || 0), 0).toLocaleString()} tiket
                </div>
              </div>
              <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="text-[10px] uppercase font-bold text-indigo-600">Volume Tertinggi</div>
                <div className="text-lg font-bold font-mono text-indigo-700 mt-1">
                  {trends.length > 0 ? Math.max(...trends.map(d => d.emailTickets || 0)) : 0} tiket
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Chat Daily Trend Detail Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 flex flex-col space-y-5 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Detail Tren Volume Tiket Chat (Harian)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Menampilkan seluruh urutan tanggal secara lengkap dan berurutan.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadChartAsPng('modal-chat-trend-chart-container', 'detail-tren-volume-tiket-chat-harian')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-3xs"
                  title="Unduh Grafik PNG"
                >
                  <Download className="h-4 w-4" />
                  <span>Unduh PNG</span>
                </button>
                <button
                  onClick={() => setShowChatModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable Chart Area */}
            <div id="modal-chat-trend-chart-container" className="overflow-x-auto border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
              <div className="min-w-[1500px] h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 20, right: 30, left: -20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="modalChatTrendGrad" x1="0" y1="0" x2="0" y2="1">
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
                      dataKey="chatTickets"
                      name="Tiket Chat"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#modalChatTrendGrad)"
                      dot={{ r: 4, strokeWidth: 1.5, stroke: '#ffffff', fill: '#6366f1' }}
                    >
                      <LabelList
                        dataKey="chatTickets"
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center text-xs font-semibold">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Hari Aktif</div>
                <div className="text-lg font-bold font-mono text-slate-800 mt-1">{trends.length} hari</div>
              </div>
              <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="text-[10px] uppercase font-bold text-indigo-600">Total Tiket Chat</div>
                <div className="text-lg font-bold font-mono text-indigo-700 mt-1">
                  {trends.reduce((sum, d) => sum + (d.chatTickets || 0), 0).toLocaleString()} tiket
                </div>
              </div>
              <div className="p-3 bg-violet-50 rounded-2xl border border-violet-100">
                <div className="text-[10px] uppercase font-bold text-violet-600">Volume Tertinggi</div>
                <div className="text-lg font-bold font-mono text-violet-700 mt-1">
                  {trends.length > 0 ? Math.max(...trends.map(d => d.chatTickets || 0)) : 0} tiket
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
