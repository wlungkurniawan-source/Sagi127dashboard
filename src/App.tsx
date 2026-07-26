import React, { useState, useEffect } from 'react';
import {
  Inbox,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  Database,
  Layers,
  Sparkles,
  Eye,
  EyeOff,
  Star,
  SlidersHorizontal,
  PhoneCall,
  Ticket as LucideTicket,
  Headset,
  PhoneOutgoing,
  UserX,
  BookOpen,
  Network,
  Menu,
  X,
  Home
} from 'lucide-react';
import { Ticket, DashboardSummary } from './types';
import MetricCard from './components/MetricCard';
import FilterPanel from './components/FilterPanel';
import ChartsGrid from './components/ChartsGrid';
import TicketTable from './components/TicketTable';
import InboundDashboard from './components/InboundDashboard';
import OutboundDashboard from './components/OutboundDashboard';
import AgentOfflineDashboard from './components/AgentOfflineDashboard';
import SmeDashboard from './components/SmeDashboard';
import HomeDashboard from './components/HomeDashboard';

const INITIAL_FILTER_STATE = {
  startTanggal: '',
  endTanggal: '',
  month: '',
  status: '',
  source: '',
  category: '',
  agent: '',
  l1: '',
  l2: '',
  l3: '',
  search: '',
};

const INITIAL_SUMMARY: DashboardSummary = {
  totalTickets: 0,
  solvedTickets: 0,
  unresolvedTickets: 0,
  resolutionRate: 0,
  activeAgents: 0,
  topCategory: 'N/A',
  csatValue: 0,
  csatCount: 0,
  filters: {
    agents: [],
    categories: [],
    months: [],
    sources: [],
    statuses: [],
    l1s: [],
    l2s: [],
    l3s: [],
    tanggals: [],
  },
  trends: [],
  categoriesData: [],
  sourcesData: [],
  statusesData: [],
  profilingData: [],
  agentPerformance: [],
};

export default function App() {
  // Loading & Sync States
  const [dbStatus, setDbStatus] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    error: string | null;
    lastUpdated: string | null;
    totalRecords: number;
  }>({
    status: 'idle',
    error: null,
    lastUpdated: null,
    totalRecords: 0,
  });

  // Dashboard Filtering & Pagination State
  const [filters, setFilters] = useState(INITIAL_FILTER_STATE);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('tanggal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Aggregated data & List data loaded from API
  const [summary, setSummary] = useState<DashboardSummary>(INITIAL_SUMMARY);
  const [ticketsList, setTicketsList] = useState<Ticket[]>([]);
  const [listPagination, setListPagination] = useState({
    page: 1,
    pageSize: 25,
    totalRecords: 0,
    totalPages: 0,
  });

  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTableVisible, setIsTableVisible] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<'home' | 'tickets' | 'inbound' | 'outbound' | 'agent_offline' | 'sme'>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoIndex, setLogoIndex] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const logoCandidates = [
    'https://i.ibb.co/q3yNWSWg/logosagi127.png',
    'https://i.ibb.co/VcjgQ1QC/logosagi127.png',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Logo_Badan_Gizi_Nasional.png/120px-Logo_Badan_Gizi_Nasional.png',
    'https://upload.wikimedia.org/wikipedia/commons/c/cf/Logo_Badan_Gizi_Nasional.png'
  ];
  const logoUrl = logoCandidates[logoIndex] || logoCandidates[0];

  // Poll status endpoint to check if initial sheet ingestion is done
  const checkStatus = async () => {
    try {
      const res = await fetch('/api/tickets/status');
      const data = await res.json();
      setDbStatus(data);
      return data.status;
    } catch (err: any) {
      console.error('Error checking database loading status:', err);
      setDbStatus(prev => ({
        ...prev,
        status: 'error',
        error: 'Gagal terhubung dengan server pengolah data.',
      }));
      return 'error';
    }
  };

  useEffect(() => {
    checkStatus();
    // Poll every 3 seconds if it's still loading
    const interval = setInterval(async () => {
      const status = await checkStatus();
      if (status !== 'loading' && status !== 'idle') {
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch summary analytics from backend
  const fetchSummary = async () => {
    setIsSummaryLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value as string);
      });

      const res = await fetch(`/api/tickets/summary?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch dashboard summary');
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error('Error loading dashboard summary:', err);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  // Fetch paginated ticket rows from backend
  const fetchTicketsList = async () => {
    setIsListLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
      });

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value as string);
      });

      const res = await fetch(`/api/tickets/list?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch tickets list');
      const data = await res.json();
      setTicketsList(data.tickets);
      setListPagination(data.pagination);
    } catch (err) {
      console.error('Error loading tickets list:', err);
    } finally {
      setIsListLoading(false);
    }
  };

  // Trigger loading when filters or status change
  useEffect(() => {
    if (dbStatus.status === 'success') {
      fetchSummary();
    }
  }, [filters, dbStatus.status]);

  // Trigger list fetch when filters, pagination, or sorting change
  useEffect(() => {
    if (dbStatus.status === 'success') {
      fetchTicketsList();
    }
  }, [filters, page, pageSize, sortBy, sortOrder, dbStatus.status]);

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset page on filter change
  };

  // Reset all filters
  const handleResetFilters = () => {
    setFilters(INITIAL_FILTER_STATE);
    setPage(1);
  };

  // Trigger hard refresh of the spreadsheet on the backend
  const handleHardRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/refresh-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        checkStatus();
        fetchSummary();
        fetchTicketsList();
        setRefreshTrigger(prev => prev + 1);
      } else {
        alert(`Gagal menyinkronkan data: ${data.error}`);
      }
    } catch (err: any) {
      console.error('Error refreshing data:', err);
      alert('Koneksi terputus saat menyinkronkan data spreadsheet.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Sort change callback
  const handleSortChange = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const formattedDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-600 antialiased selection:bg-indigo-500/10 selection:text-indigo-600">
      
      {/* Desktop Sidebar (Left side) */}
      <aside className="hidden md:flex flex-col w-[68px] bg-white border-r border-slate-200/80 sticky top-0 h-screen z-50 flex-shrink-0 items-center py-5 justify-between shadow-2xs">
        {/* Top Part: Logo and Menu */}
        <div className="w-full flex flex-col items-center gap-5">
          {/* Logo Brand */}
          <div className="flex flex-col items-center gap-0.5 px-0.5">
            <div className="w-12 h-12 rounded-full bg-white border border-slate-200/80 shadow-xs flex items-center justify-center overflow-hidden">
              <img 
                src={logoUrl} 
                alt="Logo BGN" 
                className="w-full h-full object-cover scale-105"
                referrerPolicy="no-referrer"
                onError={() => {
                  if (logoIndex < logoCandidates.length - 1) {
                    setLogoIndex(logoIndex + 1);
                  }
                }}
              />
            </div>
            <span className="text-[8px] font-extrabold text-slate-400 tracking-wider text-center mt-1 uppercase max-w-[58px] truncate">
              SAGI 127
            </span>
          </div>

          {/* Menu Items */}
          <nav className="w-full flex flex-col items-center gap-0.5">
            {/* Beranda / Home */}
            <button
              id="sidebar-tab-home"
              onClick={() => setCurrentTab('home')}
              className={`w-full flex flex-col items-center justify-center py-2.5 px-0.5 border-l-4 transition-all duration-200 cursor-pointer ${
                currentTab === 'home'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50/50'
              }`}
            >
              <Home className="h-4.5 w-4.5" />
              <span className="text-[8px] mt-1 font-semibold tracking-tight text-center leading-tight">Home</span>
            </button>

            {/* Non-voice */}
            <button
              id="sidebar-tab-tickets"
              onClick={() => setCurrentTab('tickets')}
              className={`w-full flex flex-col items-center justify-center py-2.5 px-0.5 border-l-4 transition-all duration-200 cursor-pointer ${
                currentTab === 'tickets'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50/50'
              }`}
            >
              <LucideTicket className="h-4.5 w-4.5" />
              <span className="text-[8px] mt-1 font-semibold tracking-tight text-center leading-tight">Non-voice</span>
            </button>

            {/* Inbound */}
            <button
              id="sidebar-tab-inbound"
              onClick={() => setCurrentTab('inbound')}
              className={`w-full flex flex-col items-center justify-center py-2.5 px-0.5 border-l-4 transition-all duration-200 cursor-pointer relative ${
                currentTab === 'inbound'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50/50'
              }`}
            >
              <Headset className="h-4.5 w-4.5" />
              <span className="text-[8px] mt-1 font-semibold tracking-tight text-center leading-tight">Inbound</span>
              <span className="absolute top-2 right-1 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
              </span>
            </button>

            {/* Outbound */}
            <button
              id="sidebar-tab-outbound"
              onClick={() => setCurrentTab('outbound')}
              className={`w-full flex flex-col items-center justify-center py-2.5 px-0.5 border-l-4 transition-all duration-200 cursor-pointer relative ${
                currentTab === 'outbound'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50/50'
              }`}
            >
              <PhoneOutgoing className="h-4.5 w-4.5" />
              <span className="text-[8px] mt-1 font-semibold tracking-tight text-center leading-tight">Outbound</span>
              <span className="absolute top-2 right-1 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
            </button>

            {/* Agent Offline */}
            <button
              id="sidebar-tab-agent-offline"
              onClick={() => setCurrentTab('agent_offline')}
              className={`w-full flex flex-col items-center justify-center py-2.5 px-0.5 border-l-4 transition-all duration-200 cursor-pointer relative ${
                currentTab === 'agent_offline'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50/50'
              }`}
            >
              <UserX className="h-4.5 w-4.5" />
              <span className="text-[8px] mt-1 font-semibold tracking-tight text-center leading-tight max-w-[58px] break-words">Agent Offline</span>
              <span className="absolute top-2 right-1 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
              </span>
            </button>

            {/* SME */}
            <button
              id="sidebar-tab-sme"
              onClick={() => setCurrentTab('sme')}
              className={`w-full flex flex-col items-center justify-center py-2.5 px-0.5 border-l-4 transition-all duration-200 cursor-pointer relative ${
                currentTab === 'sme'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50/50'
              }`}
            >
              <BookOpen className="h-4.5 w-4.5" />
              <span className="text-[8px] mt-1 font-semibold tracking-tight text-center leading-tight">SME</span>
              <span className="absolute top-2 right-1 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500"></span>
              </span>
            </button>

          </nav>
        </div>

        {/* Bottom Part of Sidebar (Settings/Details) */}
        <div className="flex flex-col items-center gap-1.5 text-slate-300">
          <span className="text-[8px] font-mono text-slate-400 font-bold">v1.1.0</span>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-45 transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <aside className={`md:hidden fixed top-0 bottom-0 left-0 w-64 bg-white z-50 shadow-2xl border-r border-slate-200 transform transition-transform duration-300 flex flex-col justify-between ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 space-y-6">
          {/* Brand */}
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
              <img 
                src={logoUrl} 
                alt="Logo BGN" 
                className="w-full h-full object-cover scale-105"
                referrerPolicy="no-referrer"
                onError={() => {
                  if (logoIndex < logoCandidates.length - 1) {
                    setLogoIndex(logoIndex + 1);
                  }
                }}
              />
            </div>
            <div>
              <span className="block text-[10px] font-extrabold text-indigo-600 tracking-wider uppercase">Badan Gizi Nasional</span>
              <span className="block text-sm font-bold text-slate-800">SPPG RI Dashboard</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1.5">
            {[
              { id: 'tickets', label: 'Non-voice', icon: LucideTicket, badgeColor: 'bg-indigo-500' },
              { id: 'inbound', label: 'Inbound', icon: Headset, badgeColor: 'bg-indigo-500' },
              { id: 'outbound', label: 'Outbound', icon: PhoneOutgoing, badgeColor: 'bg-emerald-500' },
              { id: 'agent_offline', label: 'Agent Offline', icon: UserX, badgeColor: 'bg-rose-500' },
              { id: 'sme', label: 'SME', icon: BookOpen, badgeColor: 'bg-teal-500' },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id as any);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {['inbound', 'outbound', 'agent_offline', 'sme'].includes(item.id) && (
                    <span className="flex h-1.5 w-1.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-slate-400"></span>
                      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${item.badgeColor}`}></span>
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-6 border-t border-slate-100 bg-slate-50">
          <p className="text-[10px] text-slate-400 font-medium">© 2026 Badan Gizi Nasional RI</p>
          <p className="text-[9px] text-slate-400 font-mono mt-0.5">v1.1.0 • Gemini AI Enhanced</p>
        </div>
      </aside>

      {/* Main Content Wrapper (Right side) */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Unified Top Dashboard Header */}
        <header className="bg-white border-b border-slate-200/80 text-slate-800 shadow-xs sticky top-0 z-40">
          <div className="mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Left side: Mobile menu toggle button + Active Tab name */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {/* Mobile hamburger menu toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 rounded-lg"
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>

              {/* Small round logo for mobile only */}
              <div className="md:hidden w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img 
                  src={logoUrl} 
                  alt="Logo BGN" 
                  className="w-full h-full object-cover scale-105"
                  referrerPolicy="no-referrer"
                  onError={() => {
                    if (logoIndex < logoCandidates.length - 1) {
                      setLogoIndex(logoIndex + 1);
                    }
                  }}
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="bg-indigo-50 text-indigo-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-indigo-100">
                    SAGI 127
                  </span>
                  <span className="bg-amber-50 text-amber-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-amber-100 uppercase">
                    {currentTab === 'home' ? 'Beranda' : currentTab === 'tickets' ? 'Non-voice' : currentTab === 'agent_offline' ? 'Agent Offline' : currentTab}
                  </span>
                </div>
                <h1 className="text-base font-bold tracking-tight font-sans text-slate-800 leading-tight">
                  {currentTab === 'home' && 'Beranda & Ringkasan Kinerja Layanan'}
                  {currentTab === 'tickets' && 'Dashboard Pengaduan & Tiket Layanan (Non-voice)'}
                  {currentTab === 'inbound' && 'Dashboard Kinerja Inbound (Telepon)'}
                  {currentTab === 'outbound' && 'Dashboard Kinerja Outbound (Telepon)'}
                  {currentTab === 'agent_offline' && 'Dashboard Monitoring Agent Offline'}
                  {currentTab === 'sme' && 'Dashboard Subject Matter Expert (SME)'}
                </h1>
              </div>
            </div>

            {/* Right side: Sync stats & button */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto justify-end">
              {dbStatus.status === 'success' && (
                <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 bg-slate-50 border border-slate-200/60 px-3 py-1 rounded-lg text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                    <span>
                      Terkoneksi: <strong className="text-slate-800 font-extrabold">{dbStatus.totalRecords.toLocaleString()} Tiket</strong>
                    </span>
                  </div>
                  <span className="hidden sm:inline text-slate-300">|</span>
                  <div className="flex items-center gap-1 font-mono text-slate-500">
                    <span>Pembaruan:</span>
                    <strong className="text-slate-800 font-bold">{formattedDate(dbStatus.lastUpdated)}</strong>
                  </div>
                </div>
              )}

              <button
                id="sync-btn"
                onClick={handleHardRefresh}
                disabled={isRefreshing || dbStatus.status === 'loading'}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 cursor-pointer shadow-sm active:scale-95"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Sinkronkan Sheet</span>
              </button>
            </div>
          </div>
        </header>

      {/* Main Container Area */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Loading Indicator for Initial Ingestion */}
        {dbStatus.status === 'loading' && (
          <div id="loading-banner" className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                <Database className="h-6 w-6 animate-spin" />
              </div>
              <div className="space-y-1 text-center md:text-left">
                <h3 className="font-bold text-indigo-900 text-sm">Menghubungkan & Membaca Google Spreadsheet...</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Harap tunggu, server sedang mengekstrak dan memilah lebih dari 17,700 baris tiket pengaduan agar siap dianalisis.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs bg-indigo-100 text-indigo-700 px-3.5 py-1.5 rounded-full font-bold">
              <span>SEDANG MEMROSES DATA LAYANAN</span>
            </div>
          </div>
        )}

        {/* Database Load Error Notification */}
        {dbStatus.status === 'error' && (
          <div id="error-banner" className="bg-rose-50 border border-rose-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-rose-900 text-sm">Gagal Mengimpor Data Google Sheet</h3>
                <p className="text-xs text-slate-500">{dbStatus.error || 'Periksa konektivitas atau ketersediaan tautan spreadsheet.'}</p>
              </div>
            </div>
            <button
              onClick={handleHardRefresh}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-500 transition-all cursor-pointer shadow-xs"
            >
              Coba Hubungkan Ulang
            </button>
          </div>
        )}

        {/* Dashboard Layout */}
        {dbStatus.status === 'success' && (
          currentTab === 'home' ? (
            <HomeDashboard setCurrentTab={setCurrentTab} refreshTrigger={refreshTrigger} onRefreshAll={handleHardRefresh} />
          ) : currentTab === 'inbound' ? (
            <InboundDashboard refreshTrigger={refreshTrigger} />
          ) : currentTab === 'outbound' ? (
            <OutboundDashboard refreshTrigger={refreshTrigger} />
          ) : currentTab === 'agent_offline' ? (
            <AgentOfflineDashboard refreshTrigger={refreshTrigger} />
          ) : currentTab === 'sme' ? (
            <SmeDashboard refreshTrigger={refreshTrigger} />
          ) : (
            <>
              {/* Local Filter Row for Non-Voice */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs">
                {/* Active Filter Chips Preview */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Saringan Aktif Non-Voice:</span>
                  {Object.entries(filters).some(([key, value]) => value !== '' && key !== 'search') ? (
                    <>
                      {Object.entries(filters).map(([key, value]) => {
                        if (value === '' || key === 'search') return null;
                        let displayKey = key;
                        if (key === 'startTanggal') displayKey = 'Mulai';
                        if (key === 'endTanggal') displayKey = 'Sampai';
                        if (key === 'status') displayKey = 'Status';
                        if (key === 'source') displayKey = 'Saluran';
                        if (key === 'agent') displayKey = 'Agen';
                        if (key === 'category') displayKey = 'Kategori';
                        
                        return (
                          <span
                            key={key}
                            onClick={() => handleFilterChange(key, '')}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 hover:bg-rose-50 border border-indigo-100 hover:border-rose-200 rounded-full text-[11px] font-semibold text-indigo-600 hover:text-rose-600 transition-all cursor-pointer shadow-3xs group"
                            title="Klik untuk menghapus filter ini"
                          >
                            <span>{displayKey}: {value}</span>
                            <span className="font-extrabold text-indigo-400 group-hover:text-rose-500">×</span>
                          </span>
                        );
                      })}
                      <button
                        onClick={handleResetFilters}
                        className="text-[10px] text-rose-500 hover:text-rose-600 font-extrabold underline decoration-dotted ml-1 transition-colors cursor-pointer"
                      >
                        Reset Semua
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">Semua data ditampilkan (tidak ada filter aktif)</span>
                  )}
                </div>

                {/* Filter Button Icon with count badge */}
                <button
                  id="open-filters-modal"
                  onClick={() => setIsFilterModalOpen(true)}
                  className="flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 transition-all cursor-pointer shadow-2xs active:scale-95 self-start sm:self-auto"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Saring Data Non-Voice</span>
                  {Object.entries(filters).filter(([key, value]) => value !== '' && key !== 'search').length > 0 && (
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-[10px] font-extrabold text-white">
                      {Object.entries(filters).filter(([key, value]) => value !== '' && key !== 'search').length}
                    </span>
                  )}
                </button>
              </div>

              {/* KPI Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  id="kpi-total-tickets"
                  title="Total Kasus Layanan"
                  value={isSummaryLoading ? '...' : summary.totalTickets.toLocaleString()}
                  icon={<Inbox className="h-5 w-5 text-indigo-600" />}
                  colorClass="bg-indigo-50 text-indigo-600 border border-indigo-100"
                  sparklineData={isSummaryLoading ? [] : summary.trends.map(t => ({ value: t.tickets }))}
                  sparklineColor="#4f46e5"
                />
                <MetricCard
                  id="kpi-resolution-rate"
                  title="Status Solved"
                  value={isSummaryLoading ? '...' : summary.solvedTickets.toLocaleString()}
                  icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  colorClass="bg-emerald-50 text-emerald-600 border border-emerald-100"
                  sparklineData={isSummaryLoading ? [] : summary.trends.map(t => ({ value: t.solved }))}
                  sparklineColor="#10b981"
                />
                <MetricCard
                  id="kpi-unresolved-tickets"
                  title="Status Eskalasi"
                  value={isSummaryLoading ? '...' : summary.unresolvedTickets.toLocaleString()}
                  icon={<AlertTriangle className="h-5 w-5 text-rose-600" />}
                  colorClass="bg-rose-50 text-rose-600 border border-rose-100"
                  sparklineData={isSummaryLoading ? [] : summary.trends.map(t => ({ value: t.unresolved }))}
                  sparklineColor="#f43f5e"
                />
                <MetricCard
                  id="kpi-csat-rating"
                  title="Kepuasan Layanan (CSAT)"
                  value={isSummaryLoading ? '...' : (summary.csatValue ? `${summary.csatValue.toFixed(2)} / 5.0` : '0.00 / 5.0')}
                  icon={<Star className="h-5 w-5 text-amber-500 fill-amber-500" />}
                  colorClass="bg-amber-50 text-amber-600 border border-amber-100"
                  sparklineData={isSummaryLoading ? [] : summary.trends.map(t => ({ value: t.csat || 5.0 }))}
                  sparklineColor="#f59e0b"
                />
              </div>

              {/* Filter Section (Rendered as Modal Popup) */}
              <FilterPanel
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                filters={summary.filters}
                activeFilters={{
                  startTanggal: filters.startTanggal,
                  endTanggal: filters.endTanggal,
                  status: filters.status,
                  source: filters.source,
                  category: filters.category,
                  agent: filters.agent,
                }}
                onChange={handleFilterChange}
                onReset={handleResetFilters}
              />

              {/* Full Width Spacious Charts Section */}
              <div className="space-y-6">
                <ChartsGrid summary={summary} />
              </div>

              {/* Ticket Database Explorer Table */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-indigo-600" />
                    <h2 className="text-lg font-bold text-slate-800">Eksplorasi Riil Data Tiket</h2>
                  </div>
                  
                  {/* Collapsible Action Button */}
                  <button
                    id="toggle-table-visibility"
                    onClick={() => setIsTableVisible(!isTableVisible)}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    {isTableVisible ? (
                      <>
                        <EyeOff className="h-4 w-4 text-slate-500" />
                        <span>Sembunyikan Tabel</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 text-indigo-600" />
                        <span>Tampilkan Tabel Eksplorasi ({listPagination.totalRecords.toLocaleString()} Tiket)</span>
                      </>
                    )}
                  </button>
                </div>

                {isTableVisible ? (
                  <TicketTable
                    tickets={ticketsList}
                    pagination={listPagination}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    onSortChange={handleSortChange}
                    isLoading={isListLoading}
                    search={filters.search}
                    onSearchChange={(val) => handleFilterChange('search', val)}
                  />
                ) : (
                  <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-slate-400 text-sm shadow-2xs">
                    Tabel eksplorasi tiket sedang disembunyikan. Klik tombol "Tampilkan Tabel Eksplorasi" di atas untuk melihat detail data pengaduan.
                  </div>
                )}
              </div>
            </>
          )
        )}

      </main>

      {/* Modern, Simple Footer */}
      <footer className="bg-[#f8fafc] border-t border-slate-200 mt-12 py-6 text-slate-400">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 Sentra Aduan Gizi Indonesia (SAGI 127) • Badan Gizi Nasional (BGN). All Rights Reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-indigo-500" />
              <span>Didukung oleh Gemini AI</span>
            </span>
            <span className="text-slate-200">|</span>
            <span className="font-mono">v1.1.0</span>
          </div>
        </div>
      </footer>

      </div> {/* End flex-1 wrapper */}

    </div>
  );
}
