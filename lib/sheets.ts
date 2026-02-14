import { google } from 'googleapis';

const SHEET_IDS = {
  '12month': process.env.SHEET_ID_1M!,
  '3month': process.env.SHEET_ID_3M!,
  '6month': process.env.SHEET_ID_6M!,
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

export interface VoucherRow {
  code: string;
  status: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  salesPerson: string;
  dateAssigned: string;
}

export type PlanKey = '12month' | '3month' | '6month';

export interface SalespersonStats {
  name: string;
  total: number;
  byPlan: Record<PlanKey, number>;
  clients: { name: string; date: string; plan: PlanKey; phone: string; email: string }[];
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
  recentAssignments: { name: string; client: string; plan: PlanKey; date: string }[];
  lastUpdated: string;
}

async function fetchSheetData(sheetId: string): Promise<VoucherRow[]> {
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
  }));
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
  const [data12m, data3m, data6m] = await Promise.all([
    fetchSheetData(SHEET_IDS['12month']),
    fetchSheetData(SHEET_IDS['3month']),
    fetchSheetData(SHEET_IDS['6month']),
  ]);

  const salesMap = new Map<string, SalespersonStats>();
  const recentAssignments: SheetSummary['recentAssignments'] = [];

  function processRows(rows: VoucherRow[], plan: PlanKey) {
    for (const row of rows) {
      if (!row.salesPerson) continue;
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
      if (row.clientName) {
        stats.clients.push({
          name: row.clientName,
          date: row.dateAssigned,
          plan,
          phone: row.clientPhone,
          email: row.clientEmail,
        });
        recentAssignments.push({
          name,
          client: row.clientName,
          plan,
          date: row.dateAssigned,
        });
      }
    }
  }

  processRows(data12m, '12month');
  processRows(data3m, '3month');
  processRows(data6m, '6month');

  const leaderboard = Array.from(salesMap.values())
    .sort((a, b) => b.total - a.total)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  const plan12 = getPlanStats(data12m);
  const plan3 = getPlanStats(data3m);
  const plan6 = getPlanStats(data6m);

  const totals = {
    totalVouchers: data12m.length + data3m.length + data6m.length,
    assigned: plan12.assigned + plan3.assigned + plan6.assigned,
    available: plan12.available + plan3.available + plan6.available,
    compromised: plan12.compromised + plan3.compromised + plan6.compromised,
    other: plan12.other + plan3.other + plan6.other,
    totalSalespeople: leaderboard.length,
    byPlan: { '12month': plan12, '3month': plan3, '6month': plan6 },
  };

  // Sort recent assignments by date (newest first)
  recentAssignments.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return {
    leaderboard,
    totals,
    recentAssignments: recentAssignments.slice(0, 20),
    lastUpdated: new Date().toISOString(),
  };
}
