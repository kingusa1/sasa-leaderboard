import { NextResponse } from 'next/server';
import { getLeaderboardData } from '@/lib/sheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const data = await getLeaderboardData();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('Sheets API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sheet data' },
      { status: 500 }
    );
  }
}
