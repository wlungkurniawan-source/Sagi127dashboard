export interface Ticket {
  id: string; // generated or Ticket Number
  tanggal: string;
  month: string;
  ticketNumber: string;
  customerName: string;
  source: string;
  statusAwal: string;
  statusAkhir: string;
  idSppg: string;
  statusSppg: string;
  category: string;
  lennaCategory: string;
  l1: string;
  l2: string;
  l3: string;
  agent: string;
  remarks: string;
}

export interface DashboardSummary {
  totalTickets: number;
  solvedTickets: number;
  unresolvedTickets: number;
  resolutionRate: number;
  activeAgents: number;
  topCategory: string;
  csatValue: number;
  csatCount: number;
  
  // Filter values
  filters: {
    agents: string[];
    categories: string[];
    months: string[];
    sources: string[];
    statuses: string[];
    l1s: string[];
    l2s: string[];
    l3s: string[];
    tanggals: string[];
  };

  // Chart data
  trends: { date: string; tickets: number; solved: number; unresolved: number; emailTickets: number; chatTickets: number; csat?: number }[];
  categoriesData: { name: string; count: number }[];
  sourcesData: { name: string; count: number }[];
  statusesData: { name: string; count: number }[];
  profilingData: { name: string; value: number }[];
  agentPerformance: { name: string; total: number; solved: number }[];
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface InboundRecord {
  id: string;
  tanggal: string;
  timeStart: string;
  agent: string;
  status: 'Solved' | 'Eskalasi' | string;
  aht: number; // in seconds
  ahtRaw: string;
  category: string;
  customerName: string;
  remarks: string;
  raw: Record<string, string>;
}

export interface AhtRecord {
  id: string;
  tanggal: string;
  callStart: string;
  timeStart: string;
  callFrom: string;
  name: string;
  event: string;
  ahtRaw: string;
  aht: number;
}

export interface InboundSummary {
  totalInbound: number;
  solvedCount: number;
  escalatedCount: number;
  averageAht: number; // average in seconds
  trafficPerHour: { hour: string; count: number }[];
  agentPerformance: { name: string; solved: number; escalated: number; avgAht: number; total: number }[];
  categoryDistribution: { name: string; count: number }[];
  records: InboundRecord[];
  ahtRecords?: AhtRecord[];
}

export interface OutboundRecord {
  id: string;
  tanggal: string; // From "Call Start" normalized date or similar
  callStart: string; // Raw or normalized start time/date
  callAnswer: string;
  callEnd: string;
  callId: string;
  callFrom: string;
  ext: string;
  agentName: string;
  callTo: string;
  event: 'ANSWERED' | 'NO ANSWER' | 'BUSY' | 'FAILED' | string;
  handlingTime: number; // in seconds
  handlingTimeRaw: string;
  raw: Record<string, string>;
}

export interface OutboundSummary {
  totalCalls: number;
  answeredCount: number;
  noAnswerCount: number;
  busyCount: number;
  failedCount: number;
  totalDuration: number; // in seconds
  averageHandlingTime: number; // in seconds
  agentPerformance: {
    name: string;
    ext: string;
    totalCalls: number;
    answeredCalls: number;
    answerRate: number; // percentage (0-100)
    avgHandlingTime: number; // in seconds
    totalDuration: number; // in seconds
  }[];
  trafficPerHour: { hour: string; count: number }[];
  records: OutboundRecord[];
}

export interface AgentOfflineRecord {
  id: string;
  agentOffline: string;
  dateTiket: string;
  jenisAduan: string;
  nomorTiket: string;
  namaPelapor: string;
  casePelapor: string;
  tagCategory: string;
  uker: string;
  statusPelapor: string;
  statusAduan: string;
  picSme: string;
  keteranganCallout: string;
  raw: Record<string, string>;
}

export interface AgentOfflineSummary {
  totalRecords: number;
  statusAduanDistribution: { name: string; count: number }[];
  ukerDistribution: { name: string; count: number }[];
  agentPerformance: { name: string; total: number; solved: number; pending: number; escalated: number }[];
  records: AgentOfflineRecord[];
}

export interface SmeRecord {
  id: string;
  no: string;
  bulan: string;
  tanggalAduan: string;
  noTelepon: string;
  namaPelapor: string;
  noTiket: string;
  idSppg: string;
  channel: string;
  tag: string;
  deskripsi: string;
  statusSppg: string;
  divisiEskalasi: string;
  remarks: string;
  statusAduan: string;
  profilePelapor: string;
  wilayah: string;
  raw: Record<string, string>;
}

export interface SmeSummary {
  totalRecords: number;
  statusAduanDistribution: { name: string; count: number }[];
  divisiEskalasiDistribution: { name: string; count: number }[];
  channelDistribution: { name: string; count: number }[];
  records: SmeRecord[];
}

export interface SmeeRecord {
  id: string;
  no: string;
  bulan: string;
  tanggalAduan: string;
  noTelepon: string;
  namaPelapor: string;
  noTiket: string;
  idSppg: string;
  channel: string;
  tag: string;
  deskripsi: string;
  statusSppg: string;
  divisiEskalasi: string;
  remarks: string;
  statusAduan: string;
  profilePelapor: string;
  wilayah: string;
  raw: Record<string, string>;
}

export interface SmeeSummary {
  totalRecords: number;
  statusAduanDistribution: { name: string; count: number }[];
  divisiEskalasiDistribution: { name: string; count: number }[];
  channelDistribution: { name: string; count: number }[];
  records: SmeeRecord[];
}



