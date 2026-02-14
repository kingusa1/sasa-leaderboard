import { google } from 'googleapis';

const SHEET_IDS = {
  '1month': process.env.SHEET_ID_1M!,
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

export interface SalespersonStats {
  name: string;
  total: number;
  byPlan: { '1month': number; '3month': number; '6month': number };
  clients: { name: string; date: string; plan: string }[];
}

export interface SheetSummary {
  leaderboard: SalespersonStats[];
  totals: {
    totalVouchers: number;
    assigned: number;
    available: number;
    compromised: number;
    byPlan: { '1month': { total: number; assigned: number }; '3month': { total: number; assigned: number }; '6month': { total: number; assigned: number } };
  };
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

export async function getLeaderboardData(): Promise<SheetSummary> {
  const [data1m, data3m, data6m] = await Promise.all([
    fetchSheetData(SHEET_IDS['1month']),
    fetchSheetData(SHEET_IDS['3month']),
    fetchSheetData(SHEET_IDS['6month']),
  ]);

  const salesMap = new Map<string, SalespersonStats>();

  function processRows(rows: VoucherRow[], plan: '1month' | '3month' | '6month') {
    for (const row of rows) {
      if (!row.salesPerson) continue;
      const name = normalizeName(row.salesPerson);
      if (!salesMap.has(name)) {
        salesMap.set(name, {
          name,
          total: 0,
          byPlan: { '1month': 0, '3month': 0, '6month': 0 },
          clients: [],
        });
      }
      const stats = salesMap.get(name)!;
      stats.total++;
      stats.byPlan[plan]++;
      if (row.clientName) {
        stats.clients.push({ name: row.clientName, date: row.dateAssigned, plan });
      }
    }
  }

  processRows(data1m, '1month');
  processRows(data3m, '3month');
  processRows(data6m, '6month');

  const leaderboard = Array.from(salesMap.values()).sort((a, b) => b.total - a.total);

  const countStatus = (rows: VoucherRow[], status: string) =>
    rows.filter((r) => r.status === status).length;

  const totals = {
    totalVouchers: data1m.length + data3m.length + data6m.length,
    assigned:
      countStatus(data1m, 'assigned') +
      countStatus(data3m, 'assigned') +
      countStatus(data6m, 'assigned'),
    available:
      countStatus(data1m, 'available') +
      countStatus(data3m, 'available') +
      countStatus(data6m, 'available'),
    compromised:
      countStatus(data1m, 'compromised') +
      countStatus(data3m, 'compromised') +
      countStatus(data6m, 'compromised'),
    byPlan: {
      '1month': {
        total: data1m.length,
        assigned: countStatus(data1m, 'assigned'),
      },
      '3month': {
        total: data3m.length,
        assigned: countStatus(data3m, 'assigned'),
      },
      '6month': {
        total: data6m.length,
        assigned: countStatus(data6m, 'assigned'),
      },
    },
  };

  return {
    leaderboard,
    totals,
    lastUpdated: new Date().toISOString(),
  };
}
