'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Leaderboard from '@/components/Leaderboard';
import ChatWidget from '@/components/ChatWidget';
import LockScreen from '@/components/LockScreen';
import type { SheetSummary } from '@/lib/sheets';

const REFRESH_INTERVAL = 10000; // 10 seconds

export default function Home() {
  const [data, setData] = useState<SheetSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(10);
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/sheets', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      setData(json);
      setError(null);
      setLastRefresh(new Date());
      setCountdown(10);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + auto-refresh
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 10 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <LockScreen>
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-navy-700 text-white sticky top-0 z-40 shadow-navy">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo/sasa-logo-color.png"
              alt="SASA Worldwide"
              width={100}
              height={34}
              className="brightness-0 invert h-7 w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="live-dot" />
            <span className="text-[11px] text-green-300 font-medium">LIVE</span>
            <span className="text-[10px] text-gray-400 hidden sm:inline">
              {countdown}s
            </span>
          </div>
        </div>
      </header>

      {/* Title Section */}
      <div className="bg-gradient-to-b from-navy-700 to-navy-600 text-white pb-8 pt-4 -mt-px">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Sales Leaderboard
          </h1>
          <p className="text-navy-200 text-xs sm:text-sm mt-1">
            Real-time voucher assignment tracking
          </p>
          {lastRefresh && (
            <p className="text-navy-300 text-[10px] mt-2">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-3 sm:px-4 -mt-4 relative z-10">
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-navy-200 border-t-navy-600 rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading leaderboard...</p>
          </div>
        ) : error && !data ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-600 font-medium">Failed to load data</p>
            <p className="text-red-400 text-sm mt-1">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-6 py-2 bg-navy-600 text-white rounded-full text-sm font-medium"
            >
              Retry
            </button>
          </div>
        ) : data ? (
          <Leaderboard data={data} onCashSuccess={fetchData} />
        ) : null}
      </div>

      {/* WhatsApp-style Chat */}
      <ChatWidget />
    </div>
    </LockScreen>
  );
}
