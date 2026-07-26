import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Ticket as LucideTicket, 
  Headset, 
  PhoneOutgoing, 
  UserX, 
  BookOpen, 
  Network, 
  Sparkles, 
  ArrowRight, 
  RefreshCw, 
  Database, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Activity,
  Sliders,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface HomeDashboardProps {
  setCurrentTab: (tab: 'tickets' | 'inbound' | 'outbound' | 'agent_offline' | 'sme' | 'smee') => void;
  refreshTrigger?: number;
  onRefreshAll?: () => void;
}

// Highly polished, cute 3D-styled SVG Sagi Mascot
const SagiMascot = ({ className = "h-44 w-44" }: { className?: string }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <div className="w-full h-full animate-pulse duration-3000">
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_10px_15px_rgba(244,63,94,0.15)]">
          {/* Shadow */}
          <ellipse cx="100" cy="180" rx="45" ry="8" fill="#cbd5e1" opacity="0.6" />
          
          {/* Legs */}
          <line x1="85" y1="140" x2="85" y2="173" stroke="#f97316" strokeWidth="5.5" strokeLinecap="round" />
          <line x1="115" y1="140" x2="115" y2="173" stroke="#f97316" strokeWidth="5.5" strokeLinecap="round" />
          {/* Feet */}
          <path d="M 73 173 C 80 178, 88 178, 88 173" stroke="#f97316" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M 112 173 C 120 178, 127 178, 127 173" stroke="#f97316" strokeWidth="5" strokeLinecap="round" fill="none" />

          {/* Body */}
          <path d="M 68 108 C 68 152, 132 152, 132 108 Z" fill="#38bdf8" />
          {/* Collar */}
          <path d="M 68 108 Q 100 120 132 108 Q 100 96 68 108" fill="#0284c7" />
          {/* Gold Text "127" on chest */}
          <text x="100" y="137" fill="#facc15" fontSize="17" fontWeight="900" textAnchor="middle" fontFamily="system-ui, sans-serif" letterSpacing="0.5">127</text>

          {/* Head */}
          <circle cx="100" cy="82" r="46" fill="#f43f5e" />
          
          {/* Tomato Stem Leaf on top */}
          <path d="M 100 37 C 95 31, 90 28, 100 20 C 110 28, 105 31, 100 37" fill="#22c55e" />
          <path d="M 100 37 C 90 39, 78 41, 84 31 C 90 34, 95 36, 100 37" fill="#15803d" />
          <path d="M 100 37 C 110 39, 122 41, 116 31 C 110 34, 105 36, 100 37" fill="#15803d" />

          {/* Eyes */}
          <circle cx="83" cy="80" r="7.5" fill="#0f172a" />
          <circle cx="81" cy="78" r="2.8" fill="#ffffff" />
          <circle cx="85" cy="82" r="1" fill="#ffffff" />

          <circle cx="117" cy="80" r="7.5" fill="#0f172a" />
          <circle cx="115" cy="78" r="2.8" fill="#ffffff" />
          <circle cx="119" cy="82" r="1" fill="#ffffff" />

          {/* Blushing cheeks */}
          <ellipse cx="75" cy="89" rx="4.5" ry="3" fill="#fda4af" opacity="0.8" />
          <ellipse cx="125" cy="89" rx="4.5" ry="3" fill="#fda4af" opacity="0.8" />

          {/* Smile */}
          <path d="M 94 88 Q 100 94 106 88" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" fill="none" />

          {/* Headphones */}
          <path d="M 50 82 A 50 50 0 0 1 150 82" stroke="#0284c7" strokeWidth="6.5" fill="none" strokeLinecap="round" />
          {/* Left ear cup */}
          <rect x="44" y="69" width="13" height="26" rx="6.5" fill="#0284c7" />
          <rect x="41" y="73" width="3" height="18" rx="1.5" fill="#38bdf8" />
          {/* Right ear cup */}
          <rect x="143" y="69" width="13" height="26" rx="6.5" fill="#0284c7" />
          <rect x="156" y="73" width="3" height="18" rx="1.5" fill="#38bdf8" />

          {/* Microphone */}
          <path d="M 51 88 Q 58 103 74 103" stroke="#0f172a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="74" cy="103" r="4.5" fill="#0284c7" />

          {/* Name tag "SAGI" */}
          <rect x="62" y="112" width="22" height="11" rx="2" fill="#0f172a" />
          <text x="73" y="120" fill="#ffffff" fontSize="7" fontWeight="900" textAnchor="middle" fontFamily="monospace">SAGI</text>
        </svg>
      </div>
    </div>
  );
};

export default function HomeDashboard({ setCurrentTab, refreshTrigger, onRefreshAll }: HomeDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // States for all summaries
  const [ticketSummary, setTicketSummary] = useState<any>(null);
  const [inboundSummary, setInboundSummary] = useState<any>(null);
  const [outboundSummary, setOutboundSummary] = useState<any>(null);
  const [agentOfflineSummary, setAgentOfflineSummary] = useState<any>(null);
  const [smeSummary, setSmeSummary] = useState<any>(null);

  // SLA simulator interactive states
  const [targetSla, setTargetSla] = useState(85);
  const [targetAht, setTargetAht] = useState(180);

  // Sagi quotes indexes
  const [sagiQuoteIdx, setSagiQuoteIdx] = useState(0);

  const sagiQuotes = [
    "Halo! Ketuk saya untuk saran lain ya! 🍅",
    "Tomat merah penambah semangat! Hari ini mari kita selesaikan seluruh tiket pending dengan senyuman! 😊",
    "SLA kita sudah sangat bagus hari ini. Pertahankan terus keramahan dalam melayani rakyat ya! 🌟",
    "Psst... Jangan lupa minum air putih di sela-sela melayani panggilan ya, suara Anda adalah aset penting! 💧",
    "Ada tiket offline baru yang masuk? Tenang, Sagi siap bantu pantau perkembangannya! 🚀",
    "Tahukah Anda? Rata-rata AHT terbaik berada di bawah 3 menit. Mari bantu agen mengoptimalkan penanganan! ⏱️",
    "BGN Jaya! Bersama kita wujudkan layanan gizi terbaik untuk generasi bangsa! 🇮🇩",
  ];

  const fetchAllData = async () => {
    try {
      const [tickets, inbound, outbound, offline, sme] = await Promise.all([
        fetch('/api/tickets/summary').then(res => res.ok ? res.json() : null),
        fetch('/api/inbound/summary').then(res => res.ok ? res.json() : null),
        fetch('/api/outbound/summary').then(res => res.ok ? res.json() : null),
        fetch('/api/agent-offline/summary').then(res => res.ok ? res.json() : null),
        fetch('/api/sme/summary').then(res => res.ok ? res.json() : null),
      ]);

      setTicketSummary(tickets);
      setInboundSummary(inbound);
      setOutboundSummary(outbound);
      setAgentOfflineSummary(offline);
      setSmeSummary(sme);
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (onRefreshAll) {
      onRefreshAll();
    } else {
      fetch('/api/refresh-all', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            fetchAllData();
          } else {
            alert(`Gagal menyinkronkan data: ${data.error}`);
            setRefreshing(false);
          }
        })
        .catch(err => {
          console.error('Error refreshing:', err);
          setRefreshing(false);
        });
    }
  };

  // Compute overall statistics
  const totalTickets = ticketSummary?.totalTickets || 0;
  const totalInbound = inboundSummary?.totalInbound || 0;
  const totalOutbound = outboundSummary?.totalCalls || 0;
  const totalOfflineRecords = agentOfflineSummary?.records?.length || 0;
  const totalSmeRecords = smeSummary?.records?.length || 0;

  // Compute active / open matters
  const openOffline = agentOfflineSummary?.records?.filter((r: any) => {
    const status = (r.statusAduan || '').toLowerCase();
    return status === 'open' || status === 'pending' || status === 'eskalasi';
  }).length || 0;

  const openSme = smeSummary?.records?.filter((r: any) => {
    const status = (r.statusTicket || '').toLowerCase();
    return status === 'open' || status === 'pending';
  }).length || 0;

  // Real data pending lists for home feed
  const urgentTickets = React.useMemo(() => {
    const list: any[] = [];
    if (agentOfflineSummary?.records) {
      agentOfflineSummary.records.forEach((r: any) => {
        const status = (r.statusAduan || '').toLowerCase();
        if (status === 'open' || status === 'pending' || status === 'eskalasi') {
          list.push({
            id: r.id || r.nomorTiket,
            no: r.nomorTiket,
            source: 'Agent Offline',
            category: r.tagCategory || 'Agent Offline',
            date: r.dateTiket || '-',
            detail: r.casePelapor || r.jenisAduan || '-',
            tab: 'agent_offline',
            status: r.statusAduan
          });
        }
      });
    }
    if (smeSummary?.records) {
      smeSummary.records.forEach((r: any) => {
        const status = (r.statusTicket || '').toLowerCase();
        if (status === 'open' || status === 'pending') {
          list.push({
            id: r.id || r.nomorTiket,
            no: r.nomorTiket,
            source: 'SME Referral',
            category: r.kategoriSme || 'SME',
            date: r.tanggal || '-',
            detail: r.detailAduan || r.jenisAduan || '-',
            tab: 'sme',
            status: r.statusTicket
          });
        }
      });
    }
    return list.slice(0, 3);
  }, [agentOfflineSummary, smeSummary]);

  // SLA simulator calculations
  const simulatedScore = React.useMemo(() => {
    const baseSlaScore = targetSla;
    const baseAhtScore = Math.max(20, 100 - Math.max(0, (targetAht - 120) * 0.25)); 
    return Math.min(100, Math.round((baseSlaScore * 0.75) + (baseAhtScore * 0.25)));
  }, [targetSla, targetAht]);

  // Interactive Smart Tips from Sagi based on live metrics
  const getSagiAdvice = () => {
    const advices = [];
    
    if (openOffline > 0) {
      advices.push({
        type: 'warning',
        text: `Ada ${openOffline} laporan Agent Offline yang perlu ditangani. Yuk, segera cek dan follow up!`
      });
    }
    
    if (openSme > 0) {
      advices.push({
        type: 'info',
        text: `Terdapat ${openSme} rujukan kasus aktif di menu SME yang sedang menunggu penyelesaian.`
      });
    }

    if (ticketSummary?.resolutionRate && ticketSummary.resolutionRate > 80) {
      advices.push({
        type: 'success',
        text: `Keren! Tingkat penyelesaian tiket Non-Voice hari ini mencapai ${ticketSummary.resolutionRate}%!`
      });
    }

    if (inboundSummary?.averageAht && inboundSummary.averageAht > 180) {
      advices.push({
        type: 'warning',
        text: `Rata-rata waktu penanganan (AHT) Inbound berada di ${Math.round(inboundSummary.averageAht)} detik. Perlu dioptimalkan!`
      });
    }

    if (advices.length === 0) {
      advices.push({
        type: 'success',
        text: 'Semua sistem berjalan normal! Saya siap membantu memantau kinerja harian Anda.'
      });
    }

    return advices;
  };

  const adviceList = getSagiAdvice();

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Hero Welcoming Banner with Mascot Sagi */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: 'spring', bounce: 0.2 }}
        className="relative overflow-visible bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl"
      >
        {/* Ambient glow effects */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex-1 text-center md:text-left z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-full text-xs font-bold mb-4">
            <Sparkles className="h-3 w-3 text-indigo-400 animate-spin" style={{ animationDuration: '3s' }} />
            <span>Asisten Cerdas SAGI 127</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Halo! Saya <span className="bg-gradient-to-r from-red-400 via-amber-400 to-indigo-400 bg-clip-text text-transparent">SAGI 127</span> 🍅
          </h1>
          <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed font-medium">
            Selamat datang di Portal Dashboard Terintegrasi Layanan Pengaduan Badan Gizi Nasional. Pantau kinerja Non-voice, Telepon, Agent Offline, hingga kasus rujukan SME secara real-time.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-3">
            <motion.button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg hover:shadow-indigo-500/20 transition-all duration-200 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Sinkronisasi...' : 'Sinkronkan Data Sheet'}</span>
            </motion.button>
            <span className="text-xs text-slate-400 font-medium">
              Update Terakhir: {loading ? 'Loading...' : 'Hari ini'}
            </span>
          </div>
        </div>

        {/* Interactive Sagi Mascot with Speech Bubble */}
        <div className="flex-shrink-0 z-10 relative flex flex-col items-center mt-6 md:mt-0">
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            key={sagiQuoteIdx}
            className="absolute -top-16 bg-white border-2 border-indigo-100 text-slate-800 font-bold text-xs p-3 rounded-2xl shadow-xl max-w-[190px] text-center after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-[6px] after:border-transparent after:border-t-white before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-[8px] before:border-transparent before:border-t-indigo-100 before:-z-10 cursor-pointer"
            onClick={() => setSagiQuoteIdx((prev) => (prev + 1) % sagiQuotes.length)}
          >
            {sagiQuotes[sagiQuoteIdx]}
          </motion.div>
          <div 
            className="cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300"
            onClick={() => setSagiQuoteIdx((prev) => (prev + 1) % sagiQuotes.length)}
          >
            <SagiMascot className="h-40 w-40 sm:h-48 sm:w-48" />
          </div>
        </div>
      </motion.div>

      {/* 2. Interactive Insights from Sagi */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-all duration-300"
      >
        <div className="flex items-center gap-2 mb-3.5">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
            <Sparkles className="h-4 w-4 animate-bounce" />
          </div>
          <h2 className="font-bold text-slate-800 text-sm sm:text-base">Insight & Catatan Penting SAGI</h2>
        </div>
        
        {loading ? (
          <div className="h-12 flex items-center justify-center text-slate-400 text-xs italic">
            Menganalisis data...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {adviceList.map((advice, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ scale: 1.015, translateY: -2 }}
                className={`p-3.5 rounded-xl border flex items-start gap-2.5 transition-all duration-300 hover:shadow-2xs ${
                  advice.type === 'warning' 
                    ? 'bg-rose-50/50 border-rose-100 text-rose-800' 
                    : advice.type === 'success' 
                    ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800'
                    : 'bg-indigo-50/50 border-indigo-100 text-indigo-800'
                }`}
              >
                {advice.type === 'warning' && <AlertCircle className="h-4 w-4 mt-0.5 text-rose-500 flex-shrink-0" />}
                {advice.type === 'success' && <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />}
                {advice.type === 'info' && <Database className="h-4 w-4 mt-0.5 text-indigo-500 flex-shrink-0" />}
                <p className="text-xs sm:text-[13px] font-semibold leading-relaxed">{advice.text}</p>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* 3. Grid of Interactive Tools: SLA Simulator & Urgent Referrals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Interactive Tool A: SLA Simulator (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">Simulasi Target Kinerja</h3>
                <p className="text-[10px] text-slate-400">Atur parameter di bawah untuk memprediksi skor kepatuhan harian.</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Slider 1: SLA Target */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500">Target Solved Rate (SLA)</span>
                  <span className="text-indigo-600 font-mono">{targetSla}%</span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="100" 
                  value={targetSla} 
                  onChange={(e) => setTargetSla(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* Slider 2: Average Handling Time */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500">Target Average Handling Time (AHT)</span>
                  <span className="text-indigo-600 font-mono">{targetAht} detik</span>
                </div>
                <input 
                  type="range" 
                  min="60" 
                  max="300" 
                  value={targetAht} 
                  onChange={(e) => setTargetAht(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider block">Prediksi Kepatuhan</span>
              <span className={`text-3xl font-black font-mono leading-none ${
                simulatedScore >= 80 ? 'text-emerald-600' : simulatedScore >= 60 ? 'text-amber-500' : 'text-rose-500'
              }`}>
                {simulatedScore} <span className="text-xs font-semibold text-slate-400">/ 100</span>
              </span>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
              simulatedScore >= 80 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                : simulatedScore >= 60 
                ? 'bg-amber-50 text-amber-700 border-amber-100' 
                : 'bg-rose-50 text-rose-700 border-rose-100'
            }`}>
              {simulatedScore >= 80 ? 'Sangat Baik' : simulatedScore >= 60 ? 'Cukup' : 'Butuh Perbaikan'}
            </span>
          </div>
        </div>

        {/* Interactive Tool B: Urgent Referrals Feed (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-all duration-300 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
                  <Activity className="h-4 w-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Eskalasi Mendesak & Terbuka ({urgentTickets.length})</h3>
                  <p className="text-[10px] text-slate-400">Rujukan kasus aktif yang memerlukan tindakan cepat.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400 italic">Memuat eskalasi...</div>
              ) : urgentTickets.length > 0 ? (
                urgentTickets.map((t) => (
                  <div 
                    key={t.id}
                    onClick={() => setCurrentTab(t.tab)}
                    className="p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-indigo-100 rounded-xl transition-all duration-200 flex items-center justify-between cursor-pointer group"
                  >
                    <div className="space-y-0.5 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[10px] text-slate-500">{t.no}</span>
                        <span className="text-[9px] bg-indigo-50 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded-full">
                          {t.source}
                        </span>
                      </div>
                      <div className="font-bold text-xs text-slate-700 truncate">{t.category}</div>
                      <div className="text-[10px] text-slate-400 truncate leading-normal">{t.detail}</div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[9px] font-extrabold rounded-full uppercase border border-rose-100">
                        {t.status || 'OPEN'}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  Selamat! Tidak ada rujukan kasus yang pending/menunggu tindakan. ✨
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button 
              onClick={() => setCurrentTab('agent_offline')}
              className="text-indigo-600 text-[11px] font-bold inline-flex items-center gap-1 group"
            >
              <span>Lihat Semua Antrean</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. High-Level Summary Card Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ticket Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          whileHover={{ y: -4, scale: 1.02 }}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all duration-300 cursor-pointer"
          onClick={() => setCurrentTab('tickets')}
        >
          <span className="text-xs text-slate-500 font-semibold">Total Tiket Non-Voice</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-800 font-mono">
              {loading ? '...' : totalTickets.toLocaleString()}
            </span>
            <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-full">
              {ticketSummary?.resolutionRate ? `${ticketSummary.resolutionRate}% Selesai` : 'Non-voice'}
            </span>
          </div>
          <div className="mt-3 text-[10px] text-slate-400 font-semibold flex items-center gap-1">
            <LucideTicket className="h-3 w-3 text-indigo-500" />
            <span>Kanal Email & Live Chat</span>
          </div>
        </motion.div>

        {/* Inbound Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          whileHover={{ y: -4, scale: 1.02 }}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all duration-300 cursor-pointer"
          onClick={() => setCurrentTab('inbound')}
        >
          <span className="text-xs text-slate-500 font-semibold">Inbound Calls</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-800 font-mono">
              {loading ? '...' : totalInbound.toLocaleString()}
            </span>
            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded-full">
              {inboundSummary?.solvedCount ? `${Math.round((inboundSummary.solvedCount / (totalInbound || 1)) * 100)}% Solved` : 'Inbound'}
            </span>
          </div>
          <div className="mt-3 text-[10px] text-slate-400 font-semibold flex items-center gap-1">
            <Headset className="h-3 w-3 text-blue-500" />
            <span>Kanal Sambungan Telepon</span>
          </div>
        </motion.div>

        {/* Outbound Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          whileHover={{ y: -4, scale: 1.02 }}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all duration-300 cursor-pointer"
          onClick={() => setCurrentTab('outbound')}
        >
          <span className="text-xs text-slate-500 font-semibold">Outbound Calls</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-800 font-mono">
              {loading ? '...' : totalOutbound.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-full">
              {outboundSummary?.answeredCount ? `${Math.round((outboundSummary.answeredCount / (totalOutbound || 1)) * 100)}% Terjawab` : 'Outbound'}
            </span>
          </div>
          <div className="mt-3 text-[10px] text-slate-400 font-semibold flex items-center gap-1">
            <PhoneOutgoing className="h-3 w-3 text-emerald-500" />
            <span>Panggilan Keluar Layanan</span>
          </div>
        </motion.div>

        {/* Active Escalations */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          whileHover={{ y: -4, scale: 1.02 }}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all duration-300 cursor-pointer"
          onClick={() => setCurrentTab('agent_offline')}
        >
          <span className="text-xs text-slate-500 font-semibold">Kasus Rujukan Aktif</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-800 font-mono">
              {loading ? '...' : (openOffline + openSme).toLocaleString()}
            </span>
            <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded-full">
              Perlu Tindakan
            </span>
          </div>
          <div className="mt-3 text-[10px] text-slate-400 font-semibold flex items-center gap-1">
            <UserX className="h-3 w-3 text-rose-500" />
            <span>Agent Offline & Referrals</span>
          </div>
        </motion.div>
      </div>

      {/* 4. Menu Navigation Hub - Gorgeous Interactive Portal */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Eksplorasi Portal Dashboard</h2>
          <span className="text-xs text-slate-500 font-semibold">Pilih menu untuk melihat detail laporan</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Menu Card 1: Non-Voice */}
          <motion.div 
            onClick={() => setCurrentTab('tickets')}
            whileHover={{ y: -8, scale: 1.02, boxShadow: "0 15px 30px -5px rgba(99,102,241,0.08)" }}
            whileTap={{ scale: 0.98 }}
            className="group relative bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-indigo-200 transition-all duration-300 cursor-pointer flex flex-col justify-between h-52 overflow-hidden shadow-xs"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full group-hover:bg-indigo-100/80 transition-all duration-300 -z-0" />
            <div className="z-10">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 w-fit">
                <LucideTicket className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-800 mt-4 text-sm sm:text-base group-hover:text-indigo-600 transition-all">Non-voice (Tickets)</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Kelola dan pantau tiket pengaduan masuk melalui saluran Email dan Live Chat.</p>
            </div>
            
            <div className="flex items-center justify-between mt-4 border-t border-slate-100 pt-3 z-10">
              <span className="text-[11px] text-indigo-600 font-bold font-mono">
                {loading ? '...' : `${totalTickets.toLocaleString()} Tiket`}
              </span>
              <div className="flex items-center gap-1 text-xs text-indigo-600 font-extrabold group-hover:translate-x-1 transition-all">
                <span>Buka Menu</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </motion.div>

          {/* Menu Card 2: Inbound */}
          <motion.div 
            onClick={() => setCurrentTab('inbound')}
            whileHover={{ y: -8, scale: 1.02, boxShadow: "0 15px 30px -5px rgba(59,130,246,0.08)" }}
            whileTap={{ scale: 0.98 }}
            className="group relative bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-blue-200 transition-all duration-300 cursor-pointer flex flex-col justify-between h-52 overflow-hidden shadow-xs"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full group-hover:bg-blue-100/80 transition-all duration-300 -z-0" />
            <div className="z-10">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 w-fit">
                <Headset className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-800 mt-4 text-sm sm:text-base group-hover:text-blue-600 transition-all">Inbound Calls</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Laporan penanganan panggilan masuk, durasi telepon (AHT), dan tingkat eskalasi.</p>
            </div>
            
            <div className="flex items-center justify-between mt-4 border-t border-slate-100 pt-3 z-10">
              <span className="text-[11px] text-blue-600 font-bold font-mono">
                {loading ? '...' : `${totalInbound.toLocaleString()} Panggilan`}
              </span>
              <div className="flex items-center gap-1 text-xs text-blue-600 font-extrabold group-hover:translate-x-1 transition-all">
                <span>Buka Menu</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </motion.div>

          {/* Menu Card 3: Outbound */}
          <motion.div 
            onClick={() => setCurrentTab('outbound')}
            whileHover={{ y: -8, scale: 1.02, boxShadow: "0 15px 30px -5px rgba(16,185,129,0.08)" }}
            whileTap={{ scale: 0.98 }}
            className="group relative bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-emerald-200 transition-all duration-300 cursor-pointer flex flex-col justify-between h-52 overflow-hidden shadow-xs"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full group-hover:bg-emerald-100/80 transition-all duration-300 -z-0" />
            <div className="z-10">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 w-fit">
                <PhoneOutgoing className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-800 mt-4 text-sm sm:text-base group-hover:text-emerald-600 transition-all">Outbound Calls</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Monitoring panggilan keluar, persentase berhasil dihubungi, dan kinerja agent outbound.</p>
            </div>
            
            <div className="flex items-center justify-between mt-4 border-t border-slate-100 pt-3 z-10">
              <span className="text-[11px] text-emerald-600 font-bold font-mono">
                {loading ? '...' : `${totalOutbound.toLocaleString()} Panggilan`}
              </span>
              <div className="flex items-center gap-1 text-xs text-emerald-600 font-extrabold group-hover:translate-x-1 transition-all">
                <span>Buka Menu</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </motion.div>

          {/* Menu Card 4: Agent Offline */}
          <motion.div 
            onClick={() => setCurrentTab('agent_offline')}
            whileHover={{ y: -8, scale: 1.02, boxShadow: "0 15px 30px -5px rgba(244,63,94,0.08)" }}
            whileTap={{ scale: 0.98 }}
            className="group relative bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-rose-200 transition-all duration-300 cursor-pointer flex flex-col justify-between h-52 overflow-hidden shadow-xs"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full group-hover:bg-rose-100/80 transition-all duration-300 -z-0" />
            <div className="z-10">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 w-fit">
                <UserX className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-800 mt-4 text-sm sm:text-base group-hover:text-rose-600 transition-all">Agent Offline</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Pemantauan log pelaporan masalah dan status kehadiran atau tindak lanjut tim agen.</p>
            </div>
            
            <div className="flex items-center justify-between mt-4 border-t border-slate-100 pt-3 z-10">
              <span className="text-[11px] text-rose-600 font-bold font-mono">
                {loading ? '...' : `${openOffline} Tertunda`}
              </span>
              <div className="flex items-center gap-1 text-xs text-rose-600 font-extrabold group-hover:translate-x-1 transition-all">
                <span>Buka Menu</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </motion.div>

          {/* Menu Card 5: SME */}
          <motion.div 
            onClick={() => setCurrentTab('sme')}
            whileHover={{ y: -8, scale: 1.02, boxShadow: "0 15px 30px -5px rgba(20,184,166,0.08)" }}
            whileTap={{ scale: 0.98 }}
            className="group relative bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-teal-200 transition-all duration-300 cursor-pointer flex flex-col justify-between h-52 overflow-hidden shadow-xs"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-bl-full group-hover:bg-teal-100/80 transition-all duration-300 -z-0" />
            <div className="z-10">
              <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl border border-teal-100 w-fit">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-800 mt-4 text-sm sm:text-base group-hover:text-teal-600 transition-all">Subject Matter Expert</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Rujukan kendala rumit secara internal kepada tenaga ahli atau PIC fungsional terkait.</p>
            </div>
            
            <div className="flex items-center justify-between mt-4 border-t border-slate-100 pt-3 z-10">
              <span className="text-[11px] text-teal-600 font-bold font-mono">
                {loading ? '...' : `${totalSmeRecords.toLocaleString()} Kasus`}
              </span>
              <div className="flex items-center gap-1 text-xs text-teal-600 font-extrabold group-hover:translate-x-1 transition-all">
                <span>Buka Menu</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
