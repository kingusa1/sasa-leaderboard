import { google } from 'googleapis';

// Server-side cache to avoid hitting Google Sheets API rate limits
const CACHE_TTL = 30000; // 30 seconds
let cachedData: SheetSummary | null = null;
let cacheTimestamp = 0;

const SHEET_IDS = {
  '12month': process.env.SHEET_ID_1M!,
  '3month': process.env.SHEET_ID_3M!,
  '6month': process.env.SHEET_ID_6M!,
};

const CASH_SHEET_IDS = {
  '12month': process.env.CASH_SHEET_ID_1M!,
  '3month': process.env.CASH_SHEET_ID_3M!,
  '6month': process.env.CASH_SHEET_ID_6M!,
};

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

function getWriteAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export interface VoucherRow {
  code: string;
  status: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  salesPerson: string;
  dateAssigned: string;
  source: 'regular' | 'cash';
}

export type PlanKey = '12month' | '3month' | '6month';

export interface SalespersonStats {
  name: string;
  total: number;
  byPlan: Record<PlanKey, number>;
  clients: { name: string; code: string; date: string; plan: PlanKey; phone: string; email: string; source: 'regular' | 'cash' }[];
  rank?: number;
  conversionRate?: number;
}

export interface PlanStats {
  total: number;
  assigned: number;
  available: number;
  compromised: number;
  other: number;
}

export interface SheetSummary {
  leaderboard: SalespersonStats[];
  totals: {
    totalVouchers: number;
    assigned: number;
    available: number;
    compromised: number;
    other: number;
    totalSalespeople: number;
    byPlan: Record<PlanKey, PlanStats>;
  };
  recentAssignments: { name: string; client: string; plan: PlanKey; date: string; source: 'regular' | 'cash' }[];
  lastUpdated: string;
}

async function fetchSheetData(sheetId: string, source: 'regular' | 'cash' = 'regular'): Promise<VoucherRow[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Sheet1!A:G',
  });

  const rows = res.data.values || [];
  return rows.slice(1).map((r) => ({
    code: r[0] || '',
    status: (r[1] || '').trim().toLowerCase(),
    clientName: (r[2] || '').trim(),
    clientPhone: (r[3] || '').trim(),
    clientEmail: (r[4] || '').trim(),
    salesPerson: (r[5] || '').trim(),
    dateAssigned: (r[6] || '').trim(),
    source,
  }));
}

function parseDateStr(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    return new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeName(name: string): string {
  return name
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function getPlanStats(rows: VoucherRow[]): PlanStats {
  const assigned = rows.filter((r) => r.status === 'assigned').length;
  const available = rows.filter((r) => r.status === 'available').length;
  const compromised = rows.filter((r) => r.status === 'compromised').length;
  const other = rows.length - assigned - available - compromised;
  return { total: rows.length, assigned, available, compromised, other };
}

export async function getLeaderboardData(): Promise<SheetSummary> {
  // Return cached data if still fresh
  if (cachedData && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedData;
  }

  const [data12m, data3m, data6m, cashData12m, cashData3m, cashData6m] = await Promise.all([
    fetchSheetData(SHEET_IDS['12month'], 'regular'),
    fetchSheetData(SHEET_IDS['3month'], 'regular'),
    fetchSheetData(SHEET_IDS['6month'], 'regular'),
    fetchSheetData(CASH_SHEET_IDS['12month'], 'cash'),
    fetchSheetData(CASH_SHEET_IDS['3month'], 'cash'),
    fetchSheetData(CASH_SHEET_IDS['6month'], 'cash'),
  ]);

  const all12m = [...data12m, ...cashData12m];
  const all3m = [...data3m, ...cashData3m];
  const all6m = [...data6m, ...cashData6m];

  const salesMap = new Map<string, SalespersonStats>();
  const allAssignments: { name: string; client: string; plan: PlanKey; date: string; source: 'regular' | 'cash'; order: number }[] = [];
  let orderCounter = 0;

  function processRows(rows: VoucherRow[], plan: PlanKey) {
    for (const row of rows) {
      if (!row.salesPerson || !row.clientName) continue;
      const name = normalizeName(row.salesPerson);
      if (!salesMap.has(name)) {
        salesMap.set(name, {
          name,
          total: 0,
          byPlan: { '12month': 0, '3month': 0, '6month': 0 },
          clients: [],
        });
      }
      const stats = salesMap.get(name)!;
      stats.total++;
      stats.byPlan[plan]++;
      stats.clients.push({
        name: row.clientName,
        code: row.code,
        date: row.dateAssigned,
        plan,
        phone: row.clientPhone,
        email: row.clientEmail,
        source: row.source,
      });
      allAssignments.push({
        name,
        client: row.clientName,
        plan,
        date: row.dateAssigned,
        source: row.source,
        order: orderCounter++,
      });
    }
  }

  processRows(all12m, '12month');
  processRows(all3m, '3month');
  processRows(all6m, '6month');

  const leaderboard = Array.from(salesMap.values())
    .sort((a, b) => b.total - a.total)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  const plan12 = getPlanStats(all12m);
  const plan3 = getPlanStats(all3m);
  const plan6 = getPlanStats(all6m);

  const totals = {
    totalVouchers: all12m.length + all3m.length + all6m.length,
    assigned: plan12.assigned + plan3.assigned + plan6.assigned,
    available: plan12.available + plan3.available + plan6.available,
    compromised: plan12.compromised + plan3.compromised + plan6.compromised,
    other: plan12.other + plan3.other + plan6.other,
    totalSalespeople: leaderboard.length,
    byPlan: { '12month': plan12, '3month': plan3, '6month': plan6 },
  };

  // Sort by date (newest first), then by row order (latest added first) for same date
  allAssignments.sort((a, b) => {
    const dateA = parseDateStr(a.date);
    const dateB = parseDateStr(b.date);
    const timeA = dateA ? dateA.getTime() : 0;
    const timeB = dateB ? dateB.getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;
    return b.order - a.order;
  });

  const recentAssignments = allAssignments.map(({ order, ...rest }) => rest);

  const result: SheetSummary = {
    leaderboard,
    totals,
    recentAssignments: recentAssignments.slice(0, 20),
    lastUpdated: new Date().toISOString(),
  };

  // Update cache
  cachedData = result;
  cacheTimestamp = Date.now();

  return result;
}

export interface CashAssignmentRequest {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  salesPerson: string;
  plan: PlanKey;
}

export interface CashAssignmentResult {
  success: boolean;
  voucherCode?: string;
  error?: string;
}

export async function assignCashVoucher(req: CashAssignmentRequest): Promise<CashAssignmentResult> {
  const sheetId = CASH_SHEET_IDS[req.plan];
  if (!sheetId) {
    return { success: false, error: 'Invalid plan selected' };
  }

  const auth = getWriteAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // Read all rows to find the first "available" voucher
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Sheet1!A:G',
  });

  const rows = res.data.values || [];
  let targetRowIndex = -1;
  let voucherCode = '';

  for (let i = 1; i < rows.length; i++) {
    const status = (rows[i][1] || '').trim().toLowerCase();
    if (status === 'available') {
      targetRowIndex = i;
      voucherCode = rows[i][0] || '';
      break;
    }
  }

  if (targetRowIndex === -1) {
    return { success: false, error: 'No available vouchers for this plan' };
  }

  // Write the assignment data to that row
  const sheetRowNumber = targetRowIndex + 1;
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `Sheet1!B${sheetRowNumber}:G${sheetRowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        'assigned',
        req.clientName,
        req.clientPhone,
        req.clientEmail,
        req.salesPerson,
        dateStr,
      ]],
    },
  });

  // Invalidate cache so next leaderboard fetch picks up the new assignment
  cachedData = null;
  cacheTimestamp = 0;

  return { success: true, voucherCode };
}
