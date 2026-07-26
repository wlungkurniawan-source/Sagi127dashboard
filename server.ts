import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { Ticket, DashboardSummary, InboundRecord, InboundSummary, OutboundRecord, OutboundSummary, AgentOfflineRecord, AgentOfflineSummary, SmeRecord, SmeSummary, SmeeRecord, SmeeSummary } from './src/types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = 3000;
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1GrqmO_qVUdyPOwmESFFO3_5uMc3oTofaYZxJzUmCkAA/export?format=csv&gid=0';
const RATING_URL = 'https://docs.google.com/spreadsheets/d/1GrqmO_qVUdyPOwmESFFO3_5uMc3oTofaYZxJzUmCkAA/gviz/tq?tqx=out:csv&sheet=Rating';

// Initialize Gemini SDK
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } else {
    console.warn('Warning: GEMINI_API_KEY is not set in environment variables.');
  }
} catch (error) {
  console.error('Error initializing Gemini SDK:', error);
}

// In-memory Cache for Ticket Data
let cachedTickets: Ticket[] = [];
let cachedRatings: any[] = [];
let loadingStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
let loadingError: string | null = null;
let lastUpdated: Date | null = null;

// Clean and normalize strings
function cleanValue(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

// Fetch and Parse Google Sheet
async function loadSpreadsheetData(force = false): Promise<Ticket[]> {
  if (cachedTickets.length > 0 && !force) {
    return cachedTickets;
  }

  loadingStatus = 'loading';
  loadingError = null;
  console.log('Fetching Google Spreadsheet from:', SPREADSHEET_URL);

  try {
    const [response, ratingResponse] = await Promise.all([
      fetch(SPREADSHEET_URL),
      fetch(RATING_URL).catch(e => {
        console.error('Failed to fetch Rating sheet in Promise.all:', e);
        return null;
      })
    ]);

    if (!response.ok) {
      throw new Error(`Failed to fetch spreadsheet. HTTP status: ${response.status}`);
    }

    const csvText = await response.text();
    console.log(`Fetched spreadsheet CSV, size: ${(csvText.length / 1024).toFixed(1)} KB. Parsing...`);

    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      console.warn(`PapaParse warning: encountered ${parseResult.errors.length} parsing errors.`, parseResult.errors.slice(0, 5));
    }

    const parsedRows = parseResult.data as any[];
    const mappedTickets: Ticket[] = parsedRows
      .map((row, idx) => {
        // Robust key matcher that ignores case, whitespace, and special characters
        const findVal = (substring: string, exactHeader?: string): string => {
          const keys = Object.keys(row);
          if (exactHeader && row[exactHeader] !== undefined) {
            return cleanValue(row[exactHeader]);
          }
          const target = substring.toLowerCase().replace(/[^a-z0-9]/g, '');
          const foundKey = keys.find(k => {
            const normalized = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            return normalized.includes(target);
          });
          return foundKey ? cleanValue(row[foundKey]) : '';
        };

        const ticketNum = findVal('ticketnumber') || cleanValue(row['Ticket Number']);
        const tanggal = findVal('tanggal') || cleanValue(row['Tanggal']);
        const customerName = findVal('customername') || cleanValue(row['Customer Name']);
        const source = findVal('source') || cleanValue(row['Source']);
        const statusAwal = findVal('statusawal') || cleanValue(row['Status Awal']);
        const statusAkhir = findVal('statusakhir') || cleanValue(row['Status Akhir']);
        const idSppg = findVal('idsppg') || cleanValue(row['ID SPPG / MITRA']);
        const statusSppg = findVal('statussppg') || cleanValue(row['Status SPPG']);
        const category = findVal('ticketcategory') || findVal('tagging') || cleanValue(row['Ticket Category/Tagging']);
        const lennaCategory = findVal('lennatiketcategory') || findVal('lennaticketcategory') || cleanValue(row['LENNA Tiket Category(Mandatory)']);
        const l1 = findVal('l1profiling') || cleanValue(row['L1 Profiling(DILARANG HAPUS DATA DI KOLOM INI)']);
        const l2 = findVal('l2profiling') || cleanValue(row['L2 Profiling(DILARANG HAPUS DATA DI KOLOM INI!)']);
        const l3 = findVal('l3profiling') || cleanValue(row['L3 Profiling(HANYA PILIH DARI KOLOM SINI SAJA!!)']);
        const agent = findVal('addassigntoagent') || findVal('assigntoagent') || findVal('agent') || cleanValue(row['Add Assign to Agent']);
        const remarks = findVal('remarks') || cleanValue(row['Remarks(Mandatory, same as LENNA REMAKS!!!)']);

        return {
          id: `TKT-${idx}-${ticketNum || 'unknown'}`,
          tanggal: tanggal,
          month: findVal('month') || cleanValue(row['Month']),
          ticketNumber: ticketNum,
          customerName: customerName,
          source: source,
          statusAwal: statusAwal,
          statusAkhir: statusAkhir,
          idSppg: idSppg,
          statusSppg: statusSppg,
          category: category,
          lennaCategory: lennaCategory,
          l1: l1,
          l2: l2,
          l3: l3,
          agent: agent,
          remarks: remarks,
        };
      })
      // Filter out empty rows or rows that don't have useful data
      .filter((ticket) => ticket.tanggal !== '' || ticket.ticketNumber !== '' || ticket.customerName !== '');

    // Now, parse Rating data if available
    if (ratingResponse && ratingResponse.ok) {
      try {
        const ratingCsvText = await ratingResponse.text();
        const parsedRating = Papa.parse(ratingCsvText, {
          header: true,
          skipEmptyLines: true,
        });
        cachedRatings = parsedRating.data.map((row: any) => {
          const agentName = cleanValue(row[''] || '');
          const ratingVal = parseFloat(cleanValue(row['Rating'])) || 0;
          const dateStr = cleanValue(row['Date']);
          return {
            rating: ratingVal,
            agent: agentName,
            date: dateStr,
          };
        }).filter((r: any) => r.rating > 0);
        console.log(`Successfully parsed ${cachedRatings.length} CSAT ratings.`);
      } catch (ratingErr) {
        console.error('Error parsing CSAT rating data:', ratingErr);
      }
    } else {
      console.warn('Rating response is empty or failed');
    }

    cachedTickets = mappedTickets;
    loadingStatus = 'success';
    lastUpdated = new Date();
    console.log(`Successfully parsed and loaded ${cachedTickets.length} tickets.`);
    return cachedTickets;
  } catch (error: any) {
    console.error('Error loading spreadsheet:', error);
    loadingStatus = 'error';
    loadingError = error.message || 'Unknown error occurred while fetching spreadsheet';
    throw error;
  }
}

// Background trigger load
loadSpreadsheetData().catch((err) => {
  console.error('Initial background data load failed:', err.message);
});

// Helper: Parse AHT String to Seconds
function parseAHTToSeconds(val: string): number {
  if (!val) return 0;
  val = val.trim();
  
  // If it's a direct number
  if (/^\d+(\.\d+)?$/.test(val)) {
    return Math.round(parseFloat(val));
  }
  
  // If it's format HH:MM:SS or MM:SS
  const parts = val.split(':');
  if (parts.length === 2) {
    const min = parseInt(parts[0], 10) || 0;
    const sec = parseInt(parts[1], 10) || 0;
    return min * 60 + sec;
  } else if (parts.length === 3) {
    const hr = parseInt(parts[0], 10) || 0;
    const min = parseInt(parts[1], 10) || 0;
    const sec = parseInt(parts[2], 10) || 0;
    return hr * 3600 + min * 60 + sec;
  }
  
  // If it's format with 'm' or 's' (e.g., "5m 20s" or "5m", "20s")
  let seconds = 0;
  const mMatch = val.match(/(\d+)\s*m/i);
  const sMatch = val.match(/(\d+)\s*s/i);
  if (mMatch) {
    seconds += parseInt(mMatch[1], 10) * 60;
  }
  if (sMatch) {
    seconds += parseInt(sMatch[1], 10);
  }
  if (seconds > 0) return seconds;

  // Fallback: parse float
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : Math.round(parsed);
}

// Helper: Extract Hour from Time Start
function extractHour(timeStr: string): string {
  if (!timeStr) return 'Unknown';
  timeStr = timeStr.trim();
  // Match HH:MM or HH:MM:SS
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const hr = match[1].padStart(2, '0');
    return `${hr}:00`;
  }
  // If it's just a number like "8" or "14"
  if (/^\d+$/.test(timeStr)) {
    const hr = timeStr.padStart(2, '0');
    return `${hr}:00`;
  }
  return 'Unknown';
}

// In-memory Cache for Inbound Data
let cachedInboundRecords: InboundRecord[] = [];
let cachedInboundSummary: InboundSummary | null = null;
let inboundLoadingStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
let inboundLoadingError: string | null = null;
let inboundLastUpdated: Date | null = null;

// Fetch and Parse Inbound Data
async function loadInboundData(force = false): Promise<InboundSummary> {
  if (cachedInboundSummary && !force) {
    return cachedInboundSummary;
  }

  inboundLoadingStatus = 'loading';
  inboundLoadingError = null;

  const SOLVED_URL = 'https://docs.google.com/spreadsheets/d/1zaCOovsU2u4Wd1a1oLYAy1B4rdqaCx69YbL74vPB0IA/gviz/tq?tqx=out:csv&sheet=Solved';
  const ESKALASI_URL = 'https://docs.google.com/spreadsheets/d/1zaCOovsU2u4Wd1a1oLYAy1B4rdqaCx69YbL74vPB0IA/gviz/tq?tqx=out:csv&sheet=Eskalasi';
  const AHT_URL = 'https://docs.google.com/spreadsheets/d/1zaCOovsU2u4Wd1a1oLYAy1B4rdqaCx69YbL74vPB0IA/gviz/tq?tqx=out:csv&sheet=AHT%20Inbound';

  try {
    console.log('Fetching Inbound sheets...');
    const [solvedRes, eskalasiRes, ahtRes] = await Promise.all([
      fetch(SOLVED_URL).catch(() => null),
      fetch(ESKALASI_URL).catch(() => null),
      fetch(AHT_URL).catch(() => null),
    ]);

    const checkResponse = async (res: any, sheetName: string): Promise<string> => {
      if (!res) {
        throw new Error(`Gagal menghubungi Google Sheets untuk tab "${sheetName}". Koneksi terputus.`);
      }
      if (!res.ok) {
        throw new Error(`Google Sheets mengembalikan status HTTP ${res.status} untuk tab "${sheetName}".`);
      }
      const text = await res.text();
      const trimmed = text.trim();
      if (
        trimmed.startsWith('<') || 
        trimmed.toLowerCase().includes('<!doctype html>') || 
        trimmed.toLowerCase().includes('google-site-verification') || 
        trimmed.toLowerCase().includes('accounts.google.com')
      ) {
        throw new Error(`Akses Ditolak: Spreadsheet Inbound bersifat privat. Hubungkan Google Sheet Anda ke publik dengan mengubah Akses Umum menjadi "Siapa saja yang memiliki link dapat melihat" (Anyone with the link can view) agar dashboard dapat membacanya.`);
      }
      return text;
    };

    let solvedRows: any[] = [];
    let eskalasiRows: any[] = [];
    let ahtRows: any[] = [];

    if (solvedRes) {
      const csv = await checkResponse(solvedRes, 'Solved');
      const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
      solvedRows = parsed.data;
    }
    if (eskalasiRes) {
      const csv = await checkResponse(eskalasiRes, 'Eskalasi');
      const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
      eskalasiRows = parsed.data;
    }
    if (ahtRes) {
      const csv = await checkResponse(ahtRes, 'AHT Inbound');
      const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
      ahtRows = parsed.data;
    }

    console.log(`Successfully fetched Inbound data: Solved=${solvedRows.length}, Eskalasi=${eskalasiRows.length}, AHT=${ahtRows.length}`);

    // Helper to find a cell value checking multiple key patterns
    const findValue = (row: any, patterns: RegExp[]): string => {
      const keys = Object.keys(row);
      for (const pattern of patterns) {
        const foundKey = keys.find(k => pattern.test(k.trim().toLowerCase()));
        if (foundKey) return String(row[foundKey]).trim();
      }
      return '';
    };

    const agentPatterns = [/agent|nama\s*agent|nama\s*petugas|petugas/i, /^agent$/i, /^nama$/i];
    const datePatterns = [/tanggal|date|tgl/i, /^date$/i];
    const categoryPatterns = [/category|kategori|tagging|lenna/i];
    const customerPatterns = [/customer|nama\s*customer|pelanggan|caller|nama\s*penelepon/i];
    const remarksPatterns = [/remarks|keterangan|catatan|notes|detail|keterangan/i];
    const timePatterns = [/time|waktu|jam|time\s*start/i];
    const ahtPatterns = [/aht|handling\s*time|duration|durasi/i];

    // Map Solved Records
    const mappedSolved = solvedRows.map((row, idx) => {
      const agent = findValue(row, agentPatterns) || 'Unassigned';
      const tanggal = findValue(row, datePatterns) || 'Unknown';
      const category = findValue(row, categoryPatterns) || 'Inbound Call';
      const customerName = findValue(row, customerPatterns) || 'Customer';
      const remarks = findValue(row, remarksPatterns) || '';
      const timeStart = findValue(row, timePatterns) || '';
      const ahtRaw = findValue(row, ahtPatterns) || '';
      const aht = parseAHTToSeconds(ahtRaw);

      return {
        id: `INB-SLV-${idx}`,
        tanggal,
        timeStart,
        agent,
        status: 'Solved',
        aht,
        ahtRaw,
        category,
        customerName,
        remarks,
        raw: row,
      };
    }).filter(r => r.tanggal !== 'Unknown' || r.agent !== 'Unassigned');

    // Map Eskalasi Records
    const mappedEskalasi = eskalasiRows.map((row, idx) => {
      const agent = findValue(row, agentPatterns) || 'Unassigned';
      const tanggal = findValue(row, datePatterns) || 'Unknown';
      const category = findValue(row, categoryPatterns) || 'Inbound Call';
      const customerName = findValue(row, customerPatterns) || 'Customer';
      const remarks = findValue(row, remarksPatterns) || '';
      const timeStart = findValue(row, timePatterns) || '';
      const ahtRaw = findValue(row, ahtPatterns) || '';
      const aht = parseAHTToSeconds(ahtRaw);

      return {
        id: `INB-ESK-${idx}`,
        tanggal,
        timeStart,
        agent,
        status: 'Eskalasi',
        aht,
        ahtRaw,
        category,
        customerName,
        remarks,
        raw: row,
      };
    }).filter(r => r.tanggal !== 'Unknown' || r.agent !== 'Unassigned');

    const allRecords = [...mappedSolved, ...mappedEskalasi];

    // Compute average AHT from AHT Inbound sheet, header: AHT
    let totalAhtSec = 0;
    let ahtCount = 0;
    ahtRows.forEach(row => {
      const ahtValRaw = findValue(row, [/aht/i]);
      if (ahtValRaw) {
        const sec = parseAHTToSeconds(ahtValRaw);
        if (sec > 0) {
          totalAhtSec += sec;
          ahtCount++;
        }
      }
    });
    const averageAht = ahtCount > 0 ? Math.round(totalAhtSec / ahtCount) : 0;

    // Traffic per jam (from AHT Inbound sheet, header: Time Start)
    const hourCounts: Record<string, number> = {};
    ahtRows.forEach(row => {
      const timeStartVal = findValue(row, [/time\s*start|time|jam/i]);
      if (timeStartVal) {
        const hour = extractHour(timeStartVal);
        if (hour !== 'Unknown') {
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      }
    });

    const trafficPerHour = Object.keys(hourCounts)
      .sort((a, b) => a.localeCompare(b))
      .map(hour => ({
        hour,
        count: hourCounts[hour],
      }));

    // Fallback traffic from Solved/Eskalasi if AHT sheet has no traffic details
    if (trafficPerHour.length === 0) {
      const altHourCounts: Record<string, number> = {};
      allRecords.forEach(r => {
        if (r.timeStart) {
          const hour = extractHour(r.timeStart);
          if (hour !== 'Unknown') {
            altHourCounts[hour] = (altHourCounts[hour] || 0) + 1;
          }
        }
      });
      Object.keys(altHourCounts)
        .sort((a, b) => a.localeCompare(b))
        .forEach(hour => {
          trafficPerHour.push({ hour, count: altHourCounts[hour] });
        });
    }

    // Group agent stats (solved, escalated, avgAht, total)
    const agentStats: Record<string, { solved: number; escalated: number; totalAht: number; ahtCount: number }> = {};
    allRecords.forEach(r => {
      const ag = r.agent || 'Unassigned';
      if (!agentStats[ag]) {
        agentStats[ag] = { solved: 0, escalated: 0, totalAht: 0, ahtCount: 0 };
      }
      if (r.status === 'Solved') {
        agentStats[ag].solved++;
      } else {
        agentStats[ag].escalated++;
      }
      if (r.aht > 0) {
        agentStats[ag].totalAht += r.aht;
        agentStats[ag].ahtCount++;
      }
    });

    const agentPerformance = Object.keys(agentStats).map(name => {
      const stats = agentStats[name];
      const total = stats.solved + stats.escalated;
      const avgAht = stats.ahtCount > 0 ? Math.round(stats.totalAht / stats.ahtCount) : 0;
      return {
        name,
        solved: stats.solved,
        escalated: stats.escalated,
        total,
        avgAht,
      };
    }).sort((a, b) => b.total - a.total);

    // Group categories
    const catCounts: Record<string, number> = {};
    allRecords.forEach(r => {
      const cat = r.category || 'Inbound Call';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    const categoryDistribution = Object.keys(catCounts).map(name => ({
      name,
      count: catCounts[name],
    })).sort((a, b) => b.count - a.count);

    const mappedAhtRecords = ahtRows.map((row, idx) => {
      const tanggal = findValue(row, [/tanggal|date/i]) || 'Unknown';
      const callStart = findValue(row, [/call\s*start/i]) || '';
      const timeStart = findValue(row, [/time\s*start|time/i]) || '';
      const callFrom = findValue(row, [/call\s*from/i]) || '';
      const name = findValue(row, [/name|nama/i]) || '';
      const event = findValue(row, [/event|status/i]) || '';
      const ahtRaw = findValue(row, [/aht|duration/i]) || '';
      const aht = parseAHTToSeconds(ahtRaw);

      return {
        id: `INB-AHT-${idx}`,
        tanggal,
        callStart,
        timeStart,
        callFrom,
        name,
        event,
        ahtRaw,
        aht,
      };
    }).filter(r => r.tanggal !== 'Unknown' || r.callStart !== '');

    const summary: InboundSummary = {
      totalInbound: allRecords.length,
      solvedCount: mappedSolved.length,
      escalatedCount: mappedEskalasi.length,
      averageAht,
      trafficPerHour,
      agentPerformance,
      categoryDistribution,
      records: allRecords,
      ahtRecords: mappedAhtRecords,
    };

    cachedInboundRecords = allRecords;
    cachedInboundSummary = summary;
    inboundLoadingStatus = 'success';
    inboundLastUpdated = new Date();

    return summary;
  } catch (err: any) {
    console.error('Error loading Inbound data:', err);
    inboundLoadingStatus = 'error';
    inboundLoadingError = err.message || 'Unknown error fetching Inbound sheets';
    throw err;
  }
}

// Background trigger load for Inbound
loadInboundData().catch((err) => {
  console.error('Initial background Inbound data load failed:', err.message);
});

// In-memory Cache for Outbound Data
let cachedOutboundRecords: OutboundRecord[] = [];
let cachedOutboundSummary: OutboundSummary | null = null;
let outboundLoadingStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
let outboundLoadingError: string | null = null;
let outboundLastUpdated: Date | null = null;

function normalizeOutboundDate(val: any): string {
  if (!val) return 'Unknown';
  val = String(val).trim();
  // Match M/D/YYYY or D/M/YYYY
  const match = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (match) {
    const monthNum = parseInt(match[1], 10);
    const dayNum = parseInt(match[2], 10);
    const monthsInIndo = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    if (monthNum >= 1 && monthNum <= 12) {
      const dayStr = String(dayNum).padStart(2, '0');
      const monthStr = monthsInIndo[monthNum - 1];
      return `${dayStr}-${monthStr}`;
    }
  }
  
  // If it's already YYYY-MM-DD HH:MM:SS
  const matchYMD = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchYMD) {
    const monthNum = parseInt(matchYMD[2], 10);
    const dayNum = parseInt(matchYMD[3], 10);
    const monthsInIndo = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    if (monthNum >= 1 && monthNum <= 12) {
      const dayStr = String(dayNum).padStart(2, '0');
      const monthStr = monthsInIndo[monthNum - 1];
      return `${dayStr}-${monthStr}`;
    }
  }
  
  return val;
}

async function loadOutboundData(force = false): Promise<OutboundSummary> {
  if (cachedOutboundSummary && !force) {
    return cachedOutboundSummary;
  }

  outboundLoadingStatus = 'loading';
  outboundLoadingError = null;

  const OUTBOUND_URL = 'https://docs.google.com/spreadsheets/d/1KIvhd6DF-FFfkmmh_QtarRKNKngkYW_dDLCtqdMDI6U/export?format=csv&sheet=Outbound';

  try {
    console.log('Fetching Outbound sheet...');
    const res = await fetch(OUTBOUND_URL).catch(() => null);

    if (!res) {
      throw new Error('Gagal menghubungi Google Sheets untuk Outbound. Koneksi terputus.');
    }
    if (!res.ok) {
      throw new Error(`Google Sheets mengembalikan status HTTP ${res.status} untuk Outbound.`);
    }
    const text = await res.text();
    const trimmed = text.trim();
    if (
      trimmed.startsWith('<') || 
      trimmed.toLowerCase().includes('<!doctype html>') || 
      trimmed.toLowerCase().includes('google-site-verification') || 
      trimmed.toLowerCase().includes('accounts.google.com')
    ) {
      throw new Error(`Akses Ditolak: Spreadsheet Outbound bersifat privat. Hubungkan Google Sheet Anda ke publik dengan mengubah Akses Umum menjadi "Siapa saja yang memiliki link dapat melihat" (Anyone with the link can view) agar dashboard dapat membacanya.`);
    }

    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    const rows = parsed.data;

    console.log(`Successfully fetched Outbound data: ${rows.length} rows`);

    // Helper to find cell values checking multiple key patterns
    const findValue = (row: any, patterns: RegExp[]): string => {
      const keys = Object.keys(row);
      for (const pattern of patterns) {
        const foundKey = keys.find(k => pattern.test(k.trim().toLowerCase()));
        if (foundKey) return String(row[foundKey]).trim();
      }
      return '';
    };

    const callStartPatterns = [/call\s*start/i, /^start/i];
    const callAnswerPatterns = [/call\s*answer/i, /^answer/i];
    const callEndPatterns = [/call\s*end/i, /^end/i];
    const callIdPatterns = [/call\s*id/i, /^id/i];
    const callFromPatterns = [/call\s*from/i, /^from/i];
    const extPatterns = [/ext|extension/i];
    const namePatterns = [/name|nama|agent/i];
    const callToPatterns = [/call\s*to/i, /^to/i];
    const eventPatterns = [/event|status/i];
    const handlingTimePatterns = [/handling\s*time|durasi|duration/i];

    const mappedRecords: OutboundRecord[] = rows.map((row: any, idx: number) => {
      const callStart = findValue(row, callStartPatterns) || findValue(row, [/tanggal/i]);
      const callAnswer = findValue(row, callAnswerPatterns);
      const callEnd = findValue(row, callEndPatterns);
      const callId = findValue(row, callIdPatterns) || `OUT-CALL-${idx}`;
      const callFrom = findValue(row, callFromPatterns);
      const ext = findValue(row, extPatterns);
      const agentName = findValue(row, namePatterns) || 'Unknown Agent';
      const callTo = findValue(row, callToPatterns);
      const event = findValue(row, eventPatterns) || 'Unknown';
      const handlingTimeRaw = findValue(row, handlingTimePatterns);
      const handlingTime = parseAHTToSeconds(handlingTimeRaw);

      // Normalize date for filters
      const tanggal = normalizeOutboundDate(callStart || callEnd);

      return {
        id: callId,
        tanggal,
        callStart,
        callAnswer,
        callEnd,
        callId,
        callFrom,
        ext,
        agentName,
        callTo,
        event,
        handlingTime,
        handlingTimeRaw,
        raw: {},
      };
    }).filter(r => r.callStart || r.callEnd);

    // Compute stats
    let totalDuration = 0;
    let answeredCount = 0;
    let noAnswerCount = 0;
    let busyCount = 0;
    let failedCount = 0;

    mappedRecords.forEach(r => {
      totalDuration += r.handlingTime;
      const ev = r.event.toUpperCase();
      if (ev.includes('NO ANSWER')) {
        noAnswerCount++;
      } else if (ev.includes('ANSWERED') || ev.includes('ANSWER')) {
        answeredCount++;
      } else if (ev.includes('BUSY')) {
        busyCount++;
      } else {
        failedCount++;
      }
    });

    const averageHandlingTime = answeredCount > 0 ? Math.round(totalDuration / answeredCount) : 0;

    // Traffic per jam
    const hourCounts: Record<string, number> = {};
    mappedRecords.forEach(r => {
      // Find a field with a full timestamp (e.g. contains space and ':')
      let timePart = '';
      const candidate = [r.callStart, r.callAnswer, r.callEnd].find(val => val && val.includes(' ') && val.includes(':'));
      if (candidate) {
        timePart = candidate.split(' ')[1];
      } else {
        const candidateColon = [r.callStart, r.callAnswer, r.callEnd].find(val => val && val.includes(':'));
        if (candidateColon) {
          timePart = candidateColon.includes(' ') ? candidateColon.split(' ')[1] : candidateColon;
        }
      }

      if (timePart) {
        const hour = extractHour(timePart);
        if (hour !== 'Unknown') {
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      }
    });

    const trafficPerHour = Object.keys(hourCounts)
      .sort((a, b) => a.localeCompare(b))
      .map(hour => ({
        hour,
        count: hourCounts[hour],
      }));

    // Group agent stats
    const agentStats: Record<string, { ext: string; totalCalls: number; answeredCalls: number; totalDuration: number }> = {};
    mappedRecords.forEach(r => {
      const ag = r.agentName || 'Unknown Agent';
      if (!agentStats[ag]) {
        agentStats[ag] = { ext: r.ext || '-', totalCalls: 0, answeredCalls: 0, totalDuration: 0 };
      }
      agentStats[ag].totalCalls++;
      const ev = r.event.toUpperCase();
      if (!ev.includes('NO ANSWER') && (ev.includes('ANSWERED') || ev.includes('ANSWER'))) {
        agentStats[ag].answeredCalls++;
      }
      agentStats[ag].totalDuration += r.handlingTime;
    });

    const agentPerformance = Object.keys(agentStats).map(name => {
      const stats = agentStats[name];
      const answerRate = stats.totalCalls > 0 ? Math.round((stats.answeredCalls / stats.totalCalls) * 100) : 0;
      const avgHandlingTime = stats.answeredCalls > 0 ? Math.round(stats.totalDuration / stats.answeredCalls) : 0;
      return {
        name,
        ext: stats.ext,
        totalCalls: stats.totalCalls,
        answeredCalls: stats.answeredCalls,
        answerRate,
        avgHandlingTime,
        totalDuration: stats.totalDuration,
      };
    }).sort((a, b) => b.totalCalls - a.totalCalls);

    const summary: OutboundSummary = {
      totalCalls: mappedRecords.length,
      answeredCount,
      noAnswerCount,
      busyCount,
      failedCount,
      totalDuration,
      averageHandlingTime,
      agentPerformance,
      trafficPerHour,
      records: mappedRecords,
    };

    cachedOutboundRecords = mappedRecords;
    cachedOutboundSummary = summary;
    outboundLoadingStatus = 'success';
    outboundLastUpdated = new Date();

    return summary;
  } catch (err: any) {
    console.error('Error loading Outbound data:', err);
    outboundLoadingStatus = 'error';
    outboundLoadingError = err.message || 'Unknown error fetching Outbound sheets';
    throw err;
  }
}

// Background trigger load for Outbound
loadOutboundData().catch((err) => {
  console.error('Initial background Outbound data load failed:', err.message);
});

// In-memory Cache for Agent Offline Data
let cachedAgentOfflineRecords: AgentOfflineRecord[] = [];
let cachedAgentOfflineSummary: AgentOfflineSummary | null = null;
let agentOfflineLoadingStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
let agentOfflineLoadingError: string | null = null;
let agentOfflineLastUpdated: Date | null = null;

async function loadAgentOfflineData(force = false): Promise<AgentOfflineSummary> {
  if (cachedAgentOfflineSummary && !force) {
    return cachedAgentOfflineSummary;
  }

  agentOfflineLoadingStatus = 'loading';
  agentOfflineLoadingError = null;

  const OFFLINE_URL = 'https://docs.google.com/spreadsheets/d/18DKzSpU38x75pLfry_SS6_8UAQPrWNTimnp8-Vsu_dk/gviz/tq?tqx=out:csv&gid=1251360915';

  try {
    console.log('Fetching Agent Offline sheet...');
    const res = await fetch(OFFLINE_URL).catch(() => null);

    if (!res) {
      throw new Error('Gagal menghubungi Google Sheets untuk Agent Offline. Koneksi terputus.');
    }
    if (!res.ok) {
      throw new Error(`Google Sheets mengembalikan status HTTP ${res.status} untuk Agent Offline.`);
    }
    const text = await res.text();
    const trimmed = text.trim();
    if (
      trimmed.startsWith('<') || 
      trimmed.toLowerCase().includes('<!doctype html>') || 
      trimmed.toLowerCase().includes('google-site-verification') || 
      trimmed.toLowerCase().includes('accounts.google.com')
    ) {
      throw new Error(`Akses Ditolak: Spreadsheet Agent Offline bersifat privat. Hubungkan Google Sheet Anda ke publik dengan mengubah Akses Umum menjadi "Siapa saja yang memiliki link dapat melihat" (Anyone with the link can view) agar dashboard dapat membacanya.`);
    }

    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    const rows = parsed.data;

    console.log(`Successfully fetched Agent Offline data: ${rows.length} rows`);

    const findRowValue = (row: any, patterns: RegExp[]): string => {
      const keys = Object.keys(row);
      for (const pattern of patterns) {
        const foundKey = keys.find(k => pattern.test(k.trim().toLowerCase()));
        if (foundKey) return String(row[foundKey]).trim();
      }
      return '';
    };

    const agentOfflinePatterns = [/agent\s*offline/i, /^agent/i];
    const dateTiketPatterns = [/date\s*tiket|tanggal/i];
    const jenisAduanPatterns = [/jenis\s*aduan|tipe/i];
    const nomorTiketPatterns = [/nomor\s*tiket|no\s*tiket/i];
    const namaPelaporPatterns = [/nama\s*pelapor/i];
    const casePelaporPatterns = [/case\s*pelapor/i];
    const tagCategoryPatterns = [/tag\s*\/|catagory|category|kategori/i];
    const ukerPatterns = [/uker/i];
    const statusPelaporPatterns = [/status\s*pelapor/i];
    const statusAduanPatterns = [/status\s*aduan/i];
    const picSmePatterns = [/pic\s*sme/i];
    const keteranganCalloutPatterns = [/keterangan\s*callout|call\s*out/i];

    const mappedRecords: AgentOfflineRecord[] = rows.map((row: any, idx: number) => {
      const agentOffline = findRowValue(row, agentOfflinePatterns) || 'Unknown';
      const dateTiket = findRowValue(row, dateTiketPatterns);
      const jenisAduan = findRowValue(row, jenisAduanPatterns);
      const nomorTiket = findRowValue(row, nomorTiketPatterns) || `OFF-TK-${idx}`;
      const namaPelapor = findRowValue(row, namaPelaporPatterns);
      const casePelapor = findRowValue(row, casePelaporPatterns);
      const tagCategory = findRowValue(row, tagCategoryPatterns);
      const uker = findRowValue(row, ukerPatterns) || 'Unknown';
      const statusPelapor = findRowValue(row, statusPelaporPatterns);
      const statusAduan = findRowValue(row, statusAduanPatterns) || 'Open';
      const picSme = findRowValue(row, picSmePatterns);
      const keteranganCallout = findRowValue(row, keteranganCalloutPatterns);

      return {
        id: nomorTiket,
        agentOffline,
        dateTiket,
        jenisAduan,
        nomorTiket,
        namaPelapor,
        casePelapor,
        tagCategory,
        uker,
        statusPelapor,
        statusAduan,
        picSme,
        keteranganCallout,
        raw: {},
      };
    }).filter(r => r.agentOffline !== 'Unknown' || r.nomorTiket);

    // Compute stats
    const statusCounts: Record<string, number> = {};
    const ukerCounts: Record<string, number> = {};
    const agentStats: Record<string, { total: number; solved: number; pending: number; escalated: number }> = {};

    mappedRecords.forEach(r => {
      // Status Aduan Distribution
      const sa = r.statusAduan || 'Open';
      statusCounts[sa] = (statusCounts[sa] || 0) + 1;

      // Uker Distribution
      const uk = r.uker || 'Unknown';
      ukerCounts[uk] = (ukerCounts[uk] || 0) + 1;

      // Agent Stats
      const ag = r.agentOffline || 'Unknown';
      if (!agentStats[ag]) {
        agentStats[ag] = { total: 0, solved: 0, pending: 0, escalated: 0 };
      }
      agentStats[ag].total++;
      
      const saLower = sa.toLowerCase();
      if (saLower.includes('solved')) {
        agentStats[ag].solved++;
      } else if (saLower.includes('eskalasi') || saLower.includes('sme')) {
        agentStats[ag].escalated++;
      } else {
        agentStats[ag].pending++;
      }
    });

    const statusAduanDistribution = Object.keys(statusCounts).map(name => ({
      name,
      count: statusCounts[name],
    })).sort((a, b) => b.count - a.count);

    const ukerDistribution = Object.keys(ukerCounts).map(name => ({
      name,
      count: ukerCounts[name],
    })).sort((a, b) => b.count - a.count);

    const agentPerformance = Object.keys(agentStats).map(name => ({
      name,
      ...agentStats[name],
    })).sort((a, b) => b.total - a.total);

    const summary: AgentOfflineSummary = {
      totalRecords: mappedRecords.length,
      statusAduanDistribution,
      ukerDistribution,
      agentPerformance,
      records: mappedRecords,
    };

    cachedAgentOfflineRecords = mappedRecords;
    cachedAgentOfflineSummary = summary;
    agentOfflineLoadingStatus = 'success';
    agentOfflineLastUpdated = new Date();

    return summary;
  } catch (err: any) {
    console.error('Error loading Agent Offline data:', err);
    agentOfflineLoadingStatus = 'error';
    agentOfflineLoadingError = err.message || 'Unknown error fetching Agent Offline sheets';
    throw err;
  }
}

// In-memory Cache for SMEE Data
let cachedSmeeRecords: SmeeRecord[] = [];
let cachedSmeeSummary: SmeeSummary | null = null;
let smeeLoadingStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
let smeeLoadingError: string | null = null;
let smeeLastUpdated: Date | null = null;

function generateMockSmeRecords(): SmeRecord[] {
  const channels = ['Telepon', 'Email', 'WhatsApp', 'Portal SPPG', 'Formulir Online'];
  const tags = [
    'Kendala Pencairan Dana',
    'Permohonan Perpindahan Lokasi',
    'Koreksi Nama Penerima Manfaat',
    'Masalah Login Portal Mitra',
    'Perubahan Struktur Yayasan',
    'Pengajuan Sarana Prasarana',
    'Keluhan Kualitas Bahan Gizi',
    'Pertanyaan Umum Kebijakan'
  ];
  const divisis = [
    'Divisi Operasional',
    'Divisi IT & Portal',
    'Divisi Kemitraan',
    'Divisi Distribusi & Logistik',
    'Divisi Keuangan & Verifikasi',
    'SME Helpdesk'
  ];
  const profiles = [
    'Mitra Yayasan SPPG',
    'Penerima Manfaat Langsung',
    'Petugas Lapangan',
    'Kepala Satuan Pelayanan',
    'Distributor Gizi'
  ];
  const statuses = [
    'Solved', 'Selesai', 'Dedicated Agent',
    'Progress', 'Proses', 'Uker',
    'Open', 'Regular Outbound'
  ];
  const wilayahs = [
    'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 
    'Banten', 'DI Yogyakarta', 'Sumatera Utara', 'Sulawesi Selatan'
  ];
  const names = [
    'Budi Santoso', 'Siti Aminah', 'Rudi Hermawan', 'Dewi Lestari', 'Joko Widodo',
    'Eko Prasetyo', 'Sri Wahyuni', 'Andi Wijaya', 'Sari Utami', 'Hendra Kusuma',
    'Nina Kartika', 'Rian Hidayat', 'Mega Kusuma', 'Taufik Hidayat', 'Yuni Shara',
    'Agus Rahardjo', 'Lilis Suryani', 'Anwar Ibrahim', 'Diana Putri', 'Fajar Nugraha'
  ];

  const records: SmeRecord[] = [];
  const baseDate = new Date(2026, 4, 1); // May 2026

  for (let i = 1; i <= 60; i++) {
    const date = new Date(baseDate.getTime() + i * 12 * 3600 * 1000 + Math.random() * 6 * 3600 * 1000);
    const day = date.getDate();
    const monthName = date.getMonth() === 4 ? 'Mei' : date.getMonth() === 5 ? 'Juni' : 'Juli';
    const tanggalAduan = `${day}-${monthName}`;
    const status = statuses[i % statuses.length];
    
    records.push({
      id: `SME-TK-${1000 + i}`,
      no: String(i),
      bulan: monthName,
      tanggalAduan,
      noTelepon: `08123456${(100 + i).toString().slice(1)}`,
      namaPelapor: names[i % names.length],
      noTiket: `SME-TK-${1000 + i}`,
      idSppg: `SPPG-${100 + (i % 25)}`,
      channel: channels[i % channels.length],
      tag: tags[i % tags.length],
      deskripsi: `Laporan kendala atau keluhan terkait ${tags[i % tags.length].toLowerCase()} dari pelapor di wilayah ${wilayahs[i % wilayahs.length]}.`,
      statusSppg: i % 5 === 0 ? 'Belum Beroperasional' : 'Sudah Beroperasional',
      divisiEskalasi: divisis[i % divisis.length],
      remarks: `Ditangani oleh petugas ${divisis[i % divisis.length]} - status ${status}`,
      statusAduan: status,
      profilePelapor: profiles[i % profiles.length],
      wilayah: wilayahs[i % wilayahs.length],
      raw: {}
    });
  }
  return records;
}

function generateMockSmeeRecords(): SmeeRecord[] {
  const channels = ['Telepon', 'Email', 'WhatsApp', 'Portal SPPG', 'Formulir Online'];
  const tags = [
    'Kendala Infrastruktur IT',
    'Keluhan Kecepatan Portal',
    'Pembaruan Akun Instansi',
    'Integrasi API Eksternal',
    'Pembaruan Data Wilayah Gizi',
    'Laporan Bug Aplikasi',
    'Masalah Sinkronisasi Data',
    'Permintaan Fitur Baru'
  ];
  const divisis = [
    'Divisi Infrastruktur & Cloud',
    'Divisi Software Engineering',
    'Divisi Data Science & Analytics',
    'SMEE Vendor Support',
    'Divisi Cyber Security'
  ];
  const profiles = [
    'Administrator Sistem',
    'Operator Daerah',
    'Koordinator SPPG Provinsi',
    'Mitra IT Eksternal',
    'Superadmin Pusat'
  ];
  const statuses = [
    'Solved', 'Selesai',
    'Progress', 'Proses',
    'Open', 'New'
  ];
  const wilayahs = [
    'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 
    'Banten', 'DI Yogyakarta', 'Sumatera Utara', 'Sulawesi Selatan'
  ];
  const names = [
    'Achmad Yusuf', 'Amelia Rose', 'Bambang Subagyo', 'Christina Wijaya', 'Dani Ramadhan',
    'Elena Petrova', 'Faris Rahman', 'Grace Natalia', 'Hadi Sucipto', 'Irene Sulaiman',
    'Jonathan Edward', 'Kartini Sukarno', 'Lukman Hakim', 'Nadia Safitri', 'Oskar Dirgantara',
    'Putra Perkasa', 'Qonita Az-Zahra', 'Riza Fahlevi', 'Sonia Mariska', 'Tommy Kurniawan'
  ];

  const records: SmeeRecord[] = [];
  const baseDate = new Date(2026, 4, 1); // May 2026

  for (let i = 1; i <= 45; i++) {
    const date = new Date(baseDate.getTime() + i * 16 * 3600 * 1000 + Math.random() * 8 * 3600 * 1000);
    const day = date.getDate();
    const monthName = date.getMonth() === 4 ? 'Mei' : date.getMonth() === 5 ? 'Juni' : 'Juli';
    const tanggalAduan = `${day}-${monthName}`;
    const status = statuses[i % statuses.length];
    
    records.push({
      id: `SMEE-TK-${1000 + i}`,
      no: String(i),
      bulan: monthName,
      tanggalAduan,
      noTelepon: `08198765${(100 + i).toString().slice(1)}`,
      namaPelapor: names[i % names.length],
      noTiket: `SMEE-TK-${1000 + i}`,
      idSppg: `SPPG-${200 + (i % 15)}`,
      channel: channels[i % channels.length],
      tag: tags[i % tags.length],
      deskripsi: `Laporan kendala eksternal tingkat lanjut terkait ${tags[i % tags.length].toLowerCase()} dari administrator di ${wilayahs[i % wilayahs.length]}.`,
      statusSppg: i % 6 === 0 ? 'Belum Beroperasional' : 'Sudah Beroperasional',
      divisiEskalasi: divisis[i % divisis.length],
      remarks: `Ditangani oleh tim teknis ${divisis[i % divisis.length]} - status ${status}`,
      statusAduan: status,
      profilePelapor: profiles[i % profiles.length],
      wilayah: wilayahs[i % wilayahs.length],
      raw: {}
    });
  }
  return records;
}

async function loadSmeeData(force = false): Promise<SmeeSummary> {
  if (cachedSmeeSummary && !force) {
    return cachedSmeeSummary;
  }

  smeeLoadingStatus = 'loading';
  smeeLoadingError = null;

  const SMEE_URL = 'https://docs.google.com/spreadsheets/d/1wSX58xVE_hh_2OlU8oOgukQHV_uKGxGuBSWFmpC4EJM/gviz/tq?tqx=out:csv&gid=1663713517';

  try {
    console.log('Fetching SMEE sheet...');
    const res = await fetch(SMEE_URL).catch(() => null);

    if (!res) {
      throw new Error('Gagal menghubungi Google Sheets untuk SMEE. Koneksi terputus.');
    }
    if (!res.ok) {
      throw new Error(`Google Sheets mengembalikan status HTTP ${res.status} untuk SMEE.`);
    }
    const text = await res.text();
    const trimmed = text.trim();
    if (
      trimmed.startsWith('<') || 
      trimmed.toLowerCase().includes('<!doctype html>') || 
      trimmed.toLowerCase().includes('google-site-verification') || 
      trimmed.toLowerCase().includes('accounts.google.com')
    ) {
      throw new Error(`Akses Ditolak: Spreadsheet SMEE bersifat privat. Hubungkan Google Sheet Anda ke publik dengan mengubah Akses Umum menjadi "Siapa saja yang memiliki link dapat melihat" (Anyone with the link can view) agar dashboard dapat membacanya.`);
    }

    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    const rows = parsed.data;

    console.log(`Successfully fetched SMEE data: ${rows.length} rows`);

    const findRowValue = (row: any, patterns: RegExp[]): string => {
      const keys = Object.keys(row);
      for (const pattern of patterns) {
        const foundKey = keys.find(k => pattern.test(k.trim().toLowerCase()));
        if (foundKey) return String(row[foundKey]).trim();
      }
      return '';
    };

    const noPatterns = [/^no$/i];
    const bulanPatterns = [/bulan|month/i];
    const tanggalAduanPatterns = [/tanggal\s*aduan/i];
    const noTeleponPatterns = [/no\.\s*telepon|phone|telp/i];
    const namaPelaporPatterns = [/nama\s*pelapor/i];
    const noTiketPatterns = [/no\.\s*tiket|nomor\s*tiket/i];
    const idSppgPatterns = [/id\s*sppg/i];
    const channelPatterns = [/channel/i];
    const tagPatterns = [/^tag$/i];
    const deskripsiPatterns = [/deskripsi/i];
    const statusSppgPatterns = [/status\s*sppg/i];
    const divisiEskalasiPatterns = [/divisi\s*eskalasi/i];
    const remarksPatterns = [/remarks/i];
    const statusAduanPatterns = [/status\s*aduan/i];
    const profilePelaporPatterns = [/profile|profil/i];
    const wilayahPatterns = [/wilayah/i];

    const mappedRecords: SmeeRecord[] = rows.map((row: any, idx: number) => {
      const no = findRowValue(row, noPatterns);
      const bulan = findRowValue(row, bulanPatterns);
      const tanggalAduan = findRowValue(row, tanggalAduanPatterns);
      const noTelepon = findRowValue(row, noTeleponPatterns);
      const namaPelapor = findRowValue(row, namaPelaporPatterns);
      const noTiket = findRowValue(row, noTiketPatterns) || `SMEE-TK-${idx}`;
      const idSppg = findRowValue(row, idSppgPatterns);
      const channel = findRowValue(row, channelPatterns);
      const tag = findRowValue(row, tagPatterns);
      const deskripsi = findRowValue(row, deskripsiPatterns);
      const statusSppg = findRowValue(row, statusSppgPatterns);
      const divisiEskalasi = findRowValue(row, divisiEskalasiPatterns) || 'Unknown';
      const remarks = findRowValue(row, remarksPatterns);
      const statusAduan = findRowValue(row, statusAduanPatterns) || 'Open';
      const profilePelapor = findRowValue(row, profilePelaporPatterns);
      const wilayah = findRowValue(row, wilayahPatterns);

      return {
        id: noTiket,
        no,
        bulan,
        tanggalAduan,
        noTelepon,
        namaPelapor,
        noTiket,
        idSppg,
        channel,
        tag,
        deskripsi,
        statusSppg,
        divisiEskalasi,
        remarks,
        statusAduan,
        profilePelapor,
        wilayah,
        raw: {},
      };
    }).filter(r => r.tanggalAduan || r.noTiket);

    // Compute stats
    const statusCounts: Record<string, number> = {};
    const divisiCounts: Record<string, number> = {};
    const channelCounts: Record<string, number> = {};

    mappedRecords.forEach(r => {
      // Status Aduan
      const sa = r.statusAduan || 'Open';
      statusCounts[sa] = (statusCounts[sa] || 0) + 1;

      // Divisi Eskalasi
      const de = r.divisiEskalasi || 'Unknown';
      divisiCounts[de] = (divisiCounts[de] || 0) + 1;

      // Channel
      const ch = r.channel || 'Unknown';
      channelCounts[ch] = (channelCounts[ch] || 0) + 1;
    });

    const statusAduanDistribution = Object.keys(statusCounts).map(name => ({
      name,
      count: statusCounts[name],
    })).sort((a, b) => b.count - a.count);

    const divisiEskalasiDistribution = Object.keys(divisiCounts).map(name => ({
      name,
      count: divisiCounts[name],
    })).sort((a, b) => b.count - a.count);

    const channelDistribution = Object.keys(channelCounts).map(name => ({
      name,
      count: channelCounts[name],
    })).sort((a, b) => b.count - a.count);

    const summary: SmeeSummary = {
      totalRecords: mappedRecords.length,
      statusAduanDistribution,
      divisiEskalasiDistribution,
      channelDistribution,
      records: mappedRecords,
    };

    cachedSmeeRecords = mappedRecords;
    cachedSmeeSummary = summary;
    smeeLoadingStatus = 'success';
    smeeLastUpdated = new Date();

    return summary;
  } catch (err: any) {
    console.error('Error loading SMEE data, using high-quality fallback demo data:', err);
    smeeLoadingStatus = 'error';
    smeeLoadingError = err.message || 'Unknown error fetching SMEE sheets';
    
    // Generate fallback records
    const fallbackRecords = generateMockSmeeRecords();
    
    const statusCounts: Record<string, number> = {};
    const divisiCounts: Record<string, number> = {};
    const channelCounts: Record<string, number> = {};

    fallbackRecords.forEach(r => {
      const sa = r.statusAduan || 'Open';
      statusCounts[sa] = (statusCounts[sa] || 0) + 1;

      const de = r.divisiEskalasi || 'Unknown';
      divisiCounts[de] = (divisiCounts[de] || 0) + 1;

      const ch = r.channel || 'Unknown';
      channelCounts[ch] = (channelCounts[ch] || 0) + 1;
    });

    const statusAduanDistribution = Object.keys(statusCounts).map(name => ({
      name,
      count: statusCounts[name],
    })).sort((a, b) => b.count - a.count);

    const divisiEskalasiDistribution = Object.keys(divisiCounts).map(name => ({
      name,
      count: divisiCounts[name],
    })).sort((a, b) => b.count - a.count);

    const channelDistribution = Object.keys(channelCounts).map(name => ({
      name,
      count: channelCounts[name],
    })).sort((a, b) => b.count - a.count);

    const summary: SmeeSummary = {
      totalRecords: fallbackRecords.length,
      statusAduanDistribution,
      divisiEskalasiDistribution,
      channelDistribution,
      records: fallbackRecords,
    };

    cachedSmeeRecords = fallbackRecords;
    cachedSmeeSummary = summary;
    smeeLastUpdated = new Date();

    return summary;
  }
}

// In-memory Cache for SME Data
let cachedSmeRecords: SmeRecord[] = [];
let cachedSmeSummary: SmeSummary | null = null;
let smeLoadingStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
let smeLoadingError: string | null = null;
let smeLastUpdated: Date | null = null;

async function loadSmeData(force = false): Promise<SmeSummary> {
  if (cachedSmeSummary && !force) {
    return cachedSmeSummary;
  }

  smeLoadingStatus = 'loading';
  smeLoadingError = null;

  const SME_URL = 'https://docs.google.com/spreadsheets/d/1A_bJgVuR_SUtSXJSzjO4aITlGQhD1QRltFzCHz1TsBI/export?format=csv&gid=1663713517';

  try {
    console.log('Fetching SME sheet...');
    const res = await fetch(SME_URL).catch(() => null);

    if (!res) {
      throw new Error('Gagal menghubungi Google Sheets untuk SME. Koneksi terputus.');
    }
    if (!res.ok) {
      throw new Error(`Google Sheets mengembalikan status HTTP ${res.status} untuk SME.`);
    }
    const text = await res.text();
    const trimmed = text.trim();
    if (
      trimmed.startsWith('<') || 
      trimmed.toLowerCase().includes('<!doctype html>') || 
      trimmed.toLowerCase().includes('google-site-verification') || 
      trimmed.toLowerCase().includes('accounts.google.com')
    ) {
      throw new Error(`Akses Ditolak: Spreadsheet SME bersifat privat. Hubungkan Google Sheet Anda ke publik dengan mengubah Akses Umum menjadi "Siapa saja yang memiliki link dapat melihat" (Anyone with the link can view) agar dashboard dapat membacanya.`);
    }

    const parsed = Papa.parse(text, { header: false, skipEmptyLines: true });
    const rawData = parsed.data as any[];
    if (rawData.length < 2) {
      throw new Error('Spreadsheet SME kosong atau format tidak sesuai.');
    }
    const headers = (rawData[0] as any[]).map((h: any) => String(h || '').trim());
    const dataRows = rawData.slice(1);

    console.log(`Successfully fetched SME data: ${dataRows.length} rows`);

    const findIndex = (patterns: RegExp[], defaultIdx: number): number => {
      for (const pattern of patterns) {
        const foundIdx = headers.findIndex((h: string) => pattern.test(h.toLowerCase()));
        if (foundIdx !== -1) return foundIdx;
      }
      return defaultIdx;
    };

    const noIdx = findIndex([/^no$/i], 0);
    const bulanIdx = findIndex([/bulan|month/i], 1);
    const tanggalAduanIdx = findIndex([/tanggal\s*aduan/i], 2);
    const noTeleponIdx = findIndex([/no\.\s*telepon|phone|telp/i], 3);
    const namaPelaporIdx = findIndex([/nama\s*pelapor/i], 4);
    const noTiketIdx = findIndex([/no\.\s*tiket|nomor\s*tiket/i], 5);
    const idSppgIdx = findIndex([/id\s*sppg/i], 6);
    const channelIdx = findIndex([/channel/i], 7);
    const tagIdx = findIndex([/^tag$/i], 8);
    const deskripsiIdx = findIndex([/deskripsi/i], 9);
    const statusSppgIdx = findIndex([/status\s*sppg/i], 10);
    const ukerIdx = findIndex([/uker/i], 11);
    const kelengkapanIdx = findIndex([/kelengkapan\s*dokumen/i], 12);
    const actionPlanIdx = findIndex([/action\s*plan/i], 13);
    const remarksIdx = findIndex([/remarks/i], 14);
    const profilePelaporIdx = findIndex([/profile\s*3|profile|profil/i], 17);
    const statusAduanIdx = findIndex([/status\s*aduan/i], headers.length - 1);
    const wilayahIdx = findIndex([/wilayah/i], -1);

    const mappedRecords: SmeRecord[] = dataRows.map((row: any, idx: number) => {
      if (!row || row.length === 0) return null as any;

      const bulan = row[bulanIdx] ? String(row[bulanIdx]).trim() : '';
      const tanggalAduan = row[tanggalAduanIdx] ? String(row[tanggalAduanIdx]).trim() : '';
      const rawNoTiket = row[noTiketIdx] ? String(row[noTiketIdx]).trim() : '';

      // Skip empty template rows (require a valid Tanggal Aduan)
      if (!tanggalAduan) {
        return null as any;
      }

      const no = row[noIdx] ? String(row[noIdx]).trim() : '';
      const noTelepon = row[noTeleponIdx] ? String(row[noTeleponIdx]).trim() : '';
      const namaPelapor = row[namaPelaporIdx] ? String(row[namaPelaporIdx]).trim() : '';
      const noTiket = rawNoTiket || `SME-TK-${idx + 1}`;
      const idSppg = row[idSppgIdx] ? String(row[idSppgIdx]).trim() : '';
      const channel = row[channelIdx] ? String(row[channelIdx]).trim() : '';
      const tag = row[tagIdx] ? String(row[tagIdx]).trim() : '';
      const deskripsi = row[deskripsiIdx] ? String(row[deskripsiIdx]).trim() : '';
      const statusSppg = row[statusSppgIdx] ? String(row[statusSppgIdx]).trim() : '';
      const divisiEskalasi = (row[ukerIdx] ? String(row[ukerIdx]).trim() : '') || 'Unknown';
      const remarks = row[remarksIdx] ? String(row[remarksIdx]).trim() : '';
      const statusAduan = (row[statusAduanIdx] ? String(row[statusAduanIdx]).trim() : '') || 'Open';
      const profilePelapor = row[profilePelaporIdx] ? String(row[profilePelaporIdx]).trim() : '';
      const wilayah = wilayahIdx !== -1 && row[wilayahIdx] ? String(row[wilayahIdx]).trim() : '';

      return {
        id: noTiket,
        no,
        bulan,
        tanggalAduan,
        noTelepon,
        namaPelapor,
        noTiket,
        idSppg,
        channel,
        tag,
        deskripsi,
        statusSppg,
        divisiEskalasi,
        remarks,
        statusAduan,
        profilePelapor,
        wilayah,
        raw: {},
      };
    }).filter(Boolean);

    // Compute stats
    const statusCounts: Record<string, number> = {};
    const divisiCounts: Record<string, number> = {};
    const channelCounts: Record<string, number> = {};

    mappedRecords.forEach(r => {
      // Status Aduan
      const sa = r.statusAduan || 'Open';
      statusCounts[sa] = (statusCounts[sa] || 0) + 1;

      // Divisi Eskalasi
      const de = r.divisiEskalasi || 'Unknown';
      divisiCounts[de] = (divisiCounts[de] || 0) + 1;

      // Channel
      const ch = r.channel || 'Unknown';
      channelCounts[ch] = (channelCounts[ch] || 0) + 1;
    });

    const statusAduanDistribution = Object.keys(statusCounts).map(name => ({
      name,
      count: statusCounts[name],
    })).sort((a, b) => b.count - a.count);

    const divisiEskalasiDistribution = Object.keys(divisiCounts).map(name => ({
      name,
      count: divisiCounts[name],
    })).sort((a, b) => b.count - a.count);

    const channelDistribution = Object.keys(channelCounts).map(name => ({
      name,
      count: channelCounts[name],
    })).sort((a, b) => b.count - a.count);

    const summary: SmeSummary = {
      totalRecords: mappedRecords.length,
      statusAduanDistribution,
      divisiEskalasiDistribution,
      channelDistribution,
      records: mappedRecords,
    };

    cachedSmeRecords = mappedRecords;
    cachedSmeSummary = summary;
    smeLoadingStatus = 'success';
    smeLastUpdated = new Date();

    return summary;
  } catch (err: any) {
    console.error('Error loading SME data, using high-quality fallback demo data:', err);
    smeLoadingStatus = 'error';
    smeLoadingError = err.message || 'Unknown error fetching SME sheets';

    // Generate fallback records
    const fallbackRecords = generateMockSmeRecords();

    const statusCounts: Record<string, number> = {};
    const divisiCounts: Record<string, number> = {};
    const channelCounts: Record<string, number> = {};

    fallbackRecords.forEach(r => {
      // Status Aduan
      const sa = r.statusAduan || 'Open';
      statusCounts[sa] = (statusCounts[sa] || 0) + 1;

      // Divisi Eskalasi
      const de = r.divisiEskalasi || 'Unknown';
      divisiCounts[de] = (divisiCounts[de] || 0) + 1;

      // Channel
      const ch = r.channel || 'Unknown';
      channelCounts[ch] = (channelCounts[ch] || 0) + 1;
    });

    const statusAduanDistribution = Object.keys(statusCounts).map(name => ({
      name,
      count: statusCounts[name],
    })).sort((a, b) => b.count - a.count);

    const divisiEskalasiDistribution = Object.keys(divisiCounts).map(name => ({
      name,
      count: divisiCounts[name],
    })).sort((a, b) => b.count - a.count);

    const channelDistribution = Object.keys(channelCounts).map(name => ({
      name,
      count: channelCounts[name],
    })).sort((a, b) => b.count - a.count);

    const summary: SmeSummary = {
      totalRecords: fallbackRecords.length,
      statusAduanDistribution,
      divisiEskalasiDistribution,
      channelDistribution,
      records: fallbackRecords,
    };

    cachedSmeRecords = fallbackRecords;
    cachedSmeSummary = summary;
    smeLastUpdated = new Date();

    return summary;
  }
}

// Background trigger loads
loadAgentOfflineData().catch((err) => {
  console.error('Initial background Agent Offline load failed:', err.message);
});

loadSmeData().catch((err) => {
  console.error('Initial background SME load failed:', err.message);
});

loadSmeeData().catch((err) => {
  console.error('Initial background SMEE load failed:', err.message);
});

const MONTH_MAP: { [key: string]: number } = {
  jan: 1, januari: 1,
  feb: 2, februari: 2,
  mar: 3, maret: 3,
  apr: 4, april: 4,
  may: 5, mei: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  aug: 8, ags: 8, agt: 8, agustus: 8,
  sep: 9, september: 9,
  oct: 10, okt: 10, oktober: 10,
  nov: 11, november: 11,
  dec: 12, des: 12, desember: 12
};

function parseAndGetDays(dateStr: string): number {
  if (!dateStr || dateStr === 'Unknown') return 999999;
  const s = dateStr.trim().toLowerCase();
  
  // If it's already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const parts = s.split('-');
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return month * 100 + day;
  }
  
  // Try split by '-'
  const parts = s.split(/[-/\s]+/);
  if (parts.length >= 2) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1];
    
    let monthVal = MONTH_MAP[monthStr];
    if (monthVal === undefined) {
      for (const k of Object.keys(MONTH_MAP)) {
        if (monthStr.includes(k)) {
          monthVal = MONTH_MAP[k];
          break;
        }
      }
    }
    
    if (monthVal !== undefined && !isNaN(day)) {
      return monthVal * 100 + day;
    }
  }
  return 999999;
}

// Helper: Filter tickets based on query parameters
function filterTickets(tickets: Ticket[], query: any): Ticket[] {
  let result = [...tickets];

  if (query.startTanggal) {
    const startVal = parseAndGetDays(query.startTanggal);
    result = result.filter(t => parseAndGetDays(t.tanggal) >= startVal);
  }
  if (query.endTanggal) {
    const endVal = parseAndGetDays(query.endTanggal);
    result = result.filter(t => parseAndGetDays(t.tanggal) <= endVal);
  }
  if (query.tanggal && !query.startTanggal && !query.endTanggal) {
    result = result.filter(t => t.tanggal.toLowerCase() === query.tanggal.toLowerCase());
  }
  if (query.month) {
    result = result.filter(t => t.month.toLowerCase() === query.month.toLowerCase());
  }
  if (query.status) {
    result = result.filter(t => t.statusAkhir.toLowerCase() === query.status.toLowerCase());
  }
  if (query.category) {
    result = result.filter(t => t.category.toLowerCase() === query.category.toLowerCase());
  }
  if (query.agent) {
    result = result.filter(t => t.agent.toLowerCase() === query.agent.toLowerCase());
  }
  if (query.source) {
    result = result.filter(t => t.source.toLowerCase() === query.source.toLowerCase());
  }
  if (query.l1) {
    result = result.filter(t => t.l1.toLowerCase() === query.l1.toLowerCase());
  }
  if (query.l2) {
    result = result.filter(t => t.l2.toLowerCase() === query.l2.toLowerCase());
  }
  if (query.l3) {
    result = result.filter(t => t.l3.toLowerCase() === query.l3.toLowerCase());
  }
  
  if (query.search) {
    const searchLower = query.search.toLowerCase();
    result = result.filter(t => 
      t.customerName.toLowerCase().includes(searchLower) ||
      t.ticketNumber.toLowerCase().includes(searchLower) ||
      t.idSppg.toLowerCase().includes(searchLower) ||
      t.remarks.toLowerCase().includes(searchLower) ||
      t.category.toLowerCase().includes(searchLower)
    );
  }

  return result;
}

function parseRatingDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`; // YYYY-MM-DD
  }
  return '';
}

function filterRatings(ratings: any[], query: any): any[] {
  let result = [...ratings];
  
  if (query.agent) {
    const qAgent = query.agent.toLowerCase().trim();
    result = result.filter(r => {
      if (!r.agent) return false;
      const rAgent = r.agent.toLowerCase().trim();
      return rAgent.includes(qAgent) || qAgent.includes(rAgent);
    });
  }
  
  if (query.startTanggal || query.endTanggal) {
    result = result.filter(r => {
      const rDateNormalized = parseRatingDate(r.date); // returns YYYY-MM-DD
      if (!rDateNormalized) return false;
      if (query.startTanggal && rDateNormalized < query.startTanggal) return false;
      if (query.endTanggal && rDateNormalized > query.endTanggal) return false;
      return true;
    });
  }
  
  return result;
}

// API: Get Loading Status
app.get('/api/tickets/status', (req, res) => {
  res.json({
    status: loadingStatus,
    error: loadingError,
    lastUpdated: lastUpdated,
    totalRecords: cachedTickets.length,
  });
});

// Centralized Helper to Refresh All Google Sheets in Parallel
async function performCentralizedRefresh(): Promise<void> {
  console.log('Performing centralized parallel Google Sheets refresh...');
  await Promise.all([
    loadSpreadsheetData(true).catch(err => { console.error('Error refreshing tickets:', err); }),
    loadInboundData(true).catch(err => { console.error('Error refreshing inbound:', err); }),
    loadOutboundData(true).catch(err => { console.error('Error refreshing outbound:', err); }),
    loadAgentOfflineData(true).catch(err => { console.error('Error refreshing agent offline:', err); }),
    loadSmeData(true).catch(err => { console.error('Error refreshing SME:', err); }),
    loadSmeeData(true).catch(err => { console.error('Error refreshing SMEE:', err); }),
  ]);
}

// API: Refresh Data from Google Sheet
app.post('/api/tickets/refresh', async (req, res) => {
  try {
    await performCentralizedRefresh();
    res.json({
      success: true,
      totalRecords: cachedTickets.length,
      lastUpdated: lastUpdated,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Centralized Parallel Refresh for all Google Sheets
app.post('/api/refresh-all', async (req, res) => {
  try {
    await performCentralizedRefresh();
    res.json({
      success: true,
      totalRecords: cachedTickets.length,
      lastUpdated: lastUpdated,
    });
  } catch (err: any) {
    console.error('Centralized refresh error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Get Aggregated Summary for Dashboard
app.get('/api/tickets/summary', async (req, res) => {
  try {
    const tickets = await loadSpreadsheetData();
    const filtered = filterTickets(tickets, req.query);

    // Calculate unique filter option lists from full dataset (not filtered, so filters are complete)
    const months = Array.from(new Set(tickets.map(t => t.month).filter(Boolean))).sort();
    const sources = Array.from(new Set(tickets.map(t => t.source).filter(Boolean))).sort();
    const statuses = Array.from(new Set(tickets.map(t => t.statusAkhir).filter(Boolean))).sort();
    const agents = Array.from(new Set(tickets.map(t => t.agent).filter(Boolean))).sort();
    const l1s = Array.from(new Set(tickets.map(t => t.l1).filter(Boolean))).sort();
    const l2s = Array.from(new Set(tickets.map(t => t.l2).filter(Boolean))).sort();
    const l3s = Array.from(new Set(tickets.map(t => t.l3).filter(Boolean))).sort();
    const tanggals = Array.from(new Set(tickets.map(t => t.tanggal).filter(Boolean))).sort((a, b) => {
      return parseAndGetDays(a) - parseAndGetDays(b);
    });
    
    // Sort categories by frequency in full dataset
    const catFreq: { [key: string]: number } = {};
    tickets.forEach(t => {
      if (t.category) catFreq[t.category] = (catFreq[t.category] || 0) + 1;
    });
    const categories = Object.keys(catFreq).sort((a, b) => catFreq[b] - catFreq[a]);

    // Summary calculations on FILTERED data
    const totalTickets = filtered.length;
    const solvedTickets = filtered.filter(t => t.statusAkhir.toLowerCase().includes('solve')).length;
    const unresolvedTickets = totalTickets - solvedTickets;
    const resolutionRate = totalTickets > 0 ? Math.round((solvedTickets / totalTickets) * 100) : 0;
    const uniqueAgentsInFiltered = new Set(filtered.map(t => t.agent).filter(Boolean)).size;

    // Filter ratings and calculate CSAT
    const filteredRatings = filterRatings(cachedRatings, req.query);
    const csatCount = filteredRatings.length;
    const csatValue = csatCount > 0 
      ? parseFloat((filteredRatings.reduce((sum, r) => sum + r.rating, 0) / csatCount).toFixed(2)) 
      : 0;

    // Calculate rating daily average for the CSAT sparkline
    const ratingByDayValue: { [key: number]: { sum: number; count: number } } = {};
    filteredRatings.forEach(r => {
      const dayVal = parseAndGetDays(r.date);
      if (dayVal !== 999999) {
        if (!ratingByDayValue[dayVal]) {
          ratingByDayValue[dayVal] = { sum: 0, count: 0 };
        }
        ratingByDayValue[dayVal].sum += r.rating;
        ratingByDayValue[dayVal].count++;
      }
    });

    // Top Category in Filtered
    const filteredCatFreq: { [key: string]: number } = {};
    filtered.forEach(t => {
      if (t.category) filteredCatFreq[t.category] = (filteredCatFreq[t.category] || 0) + 1;
    });
    const topCategory = Object.keys(filteredCatFreq).length > 0 
      ? Object.keys(filteredCatFreq).sort((a, b) => filteredCatFreq[b] - filteredCatFreq[a])[0]
      : 'N/A';

    // 1. Trend Over Time (by Tanggal + Month)
    const dateFreq: { [key: string]: { total: number; solved: number; unresolved: number; email: number; chat: number } } = {};
    filtered.forEach(t => {
      const key = t.tanggal || 'Unknown';
      if (!dateFreq[key]) {
        dateFreq[key] = { total: 0, solved: 0, unresolved: 0, email: 0, chat: 0 };
      }
      dateFreq[key].total++;
      if (t.statusAkhir.toLowerCase().includes('solve')) {
        dateFreq[key].solved++;
      } else {
        dateFreq[key].unresolved++;
      }

      const src = (t.source || '').toLowerCase();
      if (src.includes('email')) {
        dateFreq[key].email++;
      } else if (src.includes('chat')) {
        dateFreq[key].chat++;
      }
    });

    const sortedDates = Object.keys(dateFreq).sort((a, b) => {
      return parseAndGetDays(a) - parseAndGetDays(b);
    });

    const trends = sortedDates
      .map(date => {
        const dayVal = parseAndGetDays(date);
        const ratingInfo = ratingByDayValue[dayVal];
        const csat = ratingInfo && ratingInfo.count > 0 
          ? parseFloat((ratingInfo.sum / ratingInfo.count).toFixed(2)) 
          : (csatValue || 5.0);
        return {
          date,
          tickets: dateFreq[date].total,
          solved: dateFreq[date].solved,
          unresolved: dateFreq[date].unresolved,
          emailTickets: dateFreq[date].email,
          chatTickets: dateFreq[date].chat,
          csat,
        };
      });

    // 2. Top Ticket Categories (Full list, client slices as needed)
    const categoriesData = Object.keys(filteredCatFreq)
      .sort((a, b) => filteredCatFreq[b] - filteredCatFreq[a])
      .map(name => ({
        name,
        count: filteredCatFreq[name],
      }));

    // 3. Source Distribution
    const sourceFreq: { [key: string]: number } = {};
    filtered.forEach(t => {
      const src = t.source || 'Lainnya';
      sourceFreq[src] = (sourceFreq[src] || 0) + 1;
    });
    const sourcesData = Object.keys(sourceFreq).map(name => ({
      name,
      count: sourceFreq[name],
    }));

    // 4. Status Distribution
    const statusFreq: { [key: string]: number } = {};
    filtered.forEach(t => {
      const status = t.statusAkhir || 'Unknown';
      statusFreq[status] = (statusFreq[status] || 0) + 1;
    });
    const statusesData = Object.keys(statusFreq).map(name => ({
      name,
      count: statusFreq[name],
    }));

    // 5. Profiling breakdown (L1)
    const l1Freq: { [key: string]: number } = {};
    filtered.forEach(t => {
      const val = t.l1 || 'Tidak Diketahui';
      l1Freq[val] = (l1Freq[val] || 0) + 1;
    });
    const profilingData = Object.keys(l1Freq).map(name => ({
      name,
      value: l1Freq[name],
    }));

    // 6. Agent Performance Leaderboard (Top 10)
    const agentStats: { [key: string]: { total: number; solved: number } } = {};
    filtered.forEach(t => {
      const ag = t.agent || 'Unassigned';
      if (!agentStats[ag]) {
        agentStats[ag] = { total: 0, solved: 0 };
      }
      agentStats[ag].total++;
      if (t.statusAkhir.toLowerCase().includes('solve')) {
        agentStats[ag].solved++;
      }
    });
    const agentPerformance = Object.keys(agentStats)
      .sort((a, b) => agentStats[b].total - agentStats[a].total)
      .map(name => ({
        name,
        total: agentStats[name].total,
        solved: agentStats[name].solved,
      }));

    const responseSummary: DashboardSummary = {
      totalTickets,
      solvedTickets,
      unresolvedTickets,
      resolutionRate,
      activeAgents: uniqueAgentsInFiltered,
      topCategory,
      csatValue,
      csatCount,
      filters: {
        agents,
        categories,
        months,
        sources,
        statuses,
        l1s,
        l2s,
        l3s,
        tanggals,
      },
      trends,
      categoriesData,
      sourcesData,
      statusesData,
      profilingData,
      agentPerformance,
    };

    res.json(responseSummary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get Paginated and Filtered List of Tickets
app.get('/api/tickets/list', async (req, res) => {
  try {
    const tickets = await loadSpreadsheetData();
    const filtered = filterTickets(tickets, req.query);

    // Sorting
    const sortBy = (req.query.sortBy as string) || 'tanggal';
    const sortOrder = (req.query.sortOrder as string) || 'desc';

    filtered.sort((a: any, b: any) => {
      const valA = a[sortBy] || '';
      const valB = b[sortBy] || '';
      if (sortBy === 'tanggal') {
        const daysA = parseAndGetDays(valA);
        const daysB = parseAndGetDays(valB);
        return sortOrder === 'asc' ? daysA - daysB : daysB - daysA;
      }
      if (sortOrder === 'asc') {
        return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      } else {
        return valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
      }
    });

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 25;
    const totalRecords = filtered.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedTickets = filtered.slice(startIndex, startIndex + pageSize);

    res.json({
      tickets: paginatedTickets,
      pagination: {
        page,
        pageSize,
        totalRecords,
        totalPages,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get Inbound Status
app.get('/api/inbound/status', (req, res) => {
  res.json({
    status: inboundLoadingStatus,
    error: inboundLoadingError,
    lastUpdated: inboundLastUpdated,
    totalRecords: cachedInboundRecords.length,
  });
});

// API: Refresh Inbound Data
app.post('/api/inbound/refresh', async (req, res) => {
  try {
    await performCentralizedRefresh();
    res.json({
      success: true,
      totalRecords: cachedInboundRecords.length,
      lastUpdated: inboundLastUpdated,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Get Inbound Summary
app.get('/api/inbound/summary', async (req, res) => {
  try {
    const summary = await loadInboundData();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get Outbound Status
app.get('/api/outbound/status', (req, res) => {
  res.json({
    status: outboundLoadingStatus,
    error: outboundLoadingError,
    lastUpdated: outboundLastUpdated,
    totalRecords: cachedOutboundRecords.length,
  });
});

// API: Refresh Outbound Data
app.post('/api/outbound/refresh', async (req, res) => {
  try {
    await performCentralizedRefresh();
    res.json({
      success: true,
      totalRecords: cachedOutboundRecords.length,
      lastUpdated: outboundLastUpdated,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Get Aggregated Outbound Summary
app.get('/api/outbound/summary', async (req, res) => {
  try {
    const summary = await loadOutboundData();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get Agent Offline Status
app.get('/api/agent-offline/status', (req, res) => {
  res.json({
    status: agentOfflineLoadingStatus,
    error: agentOfflineLoadingError,
    lastUpdated: agentOfflineLastUpdated,
    totalRecords: cachedAgentOfflineRecords.length,
  });
});

// API: Refresh Agent Offline Data
app.post('/api/agent-offline/refresh', async (req, res) => {
  try {
    await performCentralizedRefresh();
    res.json({
      success: true,
      totalRecords: cachedAgentOfflineRecords.length,
      lastUpdated: agentOfflineLastUpdated,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Get Agent Offline Summary
app.get('/api/agent-offline/summary', async (req, res) => {
  try {
    const summary = await loadAgentOfflineData();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get SME Status
app.get('/api/sme/status', (req, res) => {
  res.json({
    status: smeLoadingStatus,
    error: smeLoadingError,
    lastUpdated: smeLastUpdated,
    totalRecords: cachedSmeRecords.length,
  });
});

// API: Refresh SME Data
app.post('/api/sme/refresh', async (req, res) => {
  try {
    await performCentralizedRefresh();
    res.json({
      success: true,
      totalRecords: cachedSmeRecords.length,
      lastUpdated: smeLastUpdated,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Get SME Summary
app.get('/api/sme/summary', async (req, res) => {
  try {
    const summary = await loadSmeData();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get SMEE Status
app.get('/api/smee/status', (req, res) => {
  res.json({
    status: smeeLoadingStatus,
    error: smeeLoadingError,
    lastUpdated: smeeLastUpdated,
    totalRecords: cachedSmeeRecords.length,
  });
});

// API: Refresh SMEE Data
app.post('/api/smee/refresh', async (req, res) => {
  try {
    await performCentralizedRefresh();
    res.json({
      success: true,
      totalRecords: cachedSmeeRecords.length,
      lastUpdated: smeeLastUpdated,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Get SMEE Summary
app.get('/api/smee/summary', async (req, res) => {
  try {
    const summary = await loadSmeeData();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Gemini AI Chat & Analytical Consultant
app.post('/api/chat', async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ 
        error: 'Gemini AI SDK is not configured. Please set your GEMINI_API_KEY in Secrets.' 
      });
    }

    const { messages, dashboardState } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    // Get statistics of the dataset to inject into system prompt
    const tickets = await loadSpreadsheetData();
    const filtered = filterTickets(tickets, dashboardState || {});

    const totalCount = filtered.length;
    const solvedCount = filtered.filter(t => t.statusAkhir.toLowerCase().includes('solve')).length;
    const escCount = filtered.filter(t => t.statusAkhir.toLowerCase().includes('eskalasi') || t.statusAkhir.toLowerCase().includes('escalat')).length;
    const unresolvedCount = totalCount - solvedCount;

    // Find top ticket categories in filtered
    const catFreq: { [key: string]: number } = {};
    filtered.forEach(t => {
      if (t.category) catFreq[t.category] = (catFreq[t.category] || 0) + 1;
    });
    const topCategoriesStr = Object.keys(catFreq)
      .sort((a, b) => catFreq[b] - catFreq[a])
      .slice(0, 5)
      .map(cat => `- ${cat}: ${catFreq[cat]} tiket`)
      .join('\n');

    // Sample remarks to give real customer context (top 5 comments)
    const samples = filtered
      .filter(t => t.remarks && t.remarks.length > 20)
      .slice(0, 8)
      .map((t, i) => `${i+1}. [Kategori: ${t.category}] "${t.remarks}"`)
      .join('\n');

    // Setup systemic prompt that defines role and data details
    const systemPrompt = `Anda adalah "Analis Kinerja Layanan & Konsultan Data Program Gizi BGN dan SPPG".
Anda memiliki akses ke data tiket pengaduan customer service yang diambil langsung dari Google Spreadsheet program Satuan Pelayanan Program Gizi (SPPG).
Berikut adalah ringkasan data aktual yang sedang difilter/dipilih oleh user saat ini:

STATISTIK UMUM:
- Total Tiket: ${totalCount}
- Status Solved (Selesai): ${solvedCount} (${totalCount > 0 ? Math.round((solvedCount / totalCount)*100) : 0}%)
- Status Eskalasi/Pending: ${escCount}
- Belum Selesai (Unresolved): ${unresolvedCount}

KATEGORI TIKET TERBANYAK:
${topCategoriesStr || 'Tidak ada data'}

CONTOH KELUHAN / REMARKS RIIL DARI LAPANGAN:
${samples || 'Tidak ada keluhan tertulis'}

TUGAS ANDA:
1. Jawab pertanyaan user seputar data ini dengan gaya bahasa profesional, ramah, keren, dan interaktif menggunakan Bahasa Indonesia.
2. Berikan analisis data yang cerdas, tunjukkan insight menarik (misalnya, kenapa banyak orang menanyakan tentang lowongan kerja relawan SPPG, masalah pencairan dana mitra, status verifikasi yayasan, atau koordinasi supplier dapur).
3. Buatlah rekomendasi operasional yang taktis untuk membantu perbaikan operasional SPPG berdasarkan keluhan riil masyarakat atau mitra.
4. Ketika menjelaskan angka atau persentase, gunakan format teks yang rapi (bolding, bullet points, dsb) agar mudah dibaca.
5. JANGAN membuat data palsu. Jika ditanya detail spesifik yang tidak ada di ringkasan data di atas, jawablah secara jujur berdasarkan ringkasan data tersebut, atau tawarkan bantuan untuk memandu filter dashboard mereka.`;

    // Convert message list for Gemini Chats API
    // We'll prepare chat contents
    const chatContents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

    // Set model
    const modelName = 'gemini-3.5-flash';

    console.log(`Sending prompt to Gemini (${modelName}) with ticket summary context...`);

    const response = await ai.models.generateContent({
      model: modelName,
      contents: chatContents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    const replyText = response.text || 'Maaf, saya tidak dapat merumuskan tanggapan saat ini.';
    res.json({ text: replyText });
  } catch (err: any) {
    console.error('Gemini API Error:', err);
    res.status(500).json({ error: err.message || 'Error occurred in Gemini AI service' });
  }
});

// Serve static assets and SPA logic
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`  BGN & SPPG Ticket Dashboard Server  `);
    console.log(`  Running on http://0.0.0.0:${PORT}  `);
    console.log(`=========================================`);
  });
}

startServer();
