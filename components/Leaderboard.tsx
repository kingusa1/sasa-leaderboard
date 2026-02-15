'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SheetSummary, SalespersonStats, PlanKey } from '@/lib/sheets';

// Copy to clipboard with visual feedback
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold transition-all active:scale-95 flex-shrink-0 ${
        copied
          ? 'bg-green-100 text-green-700'
          : 'bg-navy-50 text-navy-600 hover:bg-navy-100 active:bg-navy-200'
      }`}
      title="Tap to copy voucher code"
    >
      {copied ? (
        <>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {text}
        </>
      )}
    </button>
  );
}

const PLAN_LABELS: Record<PlanKey, string> = {
  '12month': '12 Months',
  '3month': '3 Months',
  '6month': '6 Months',
};

const PLAN_COLORS: Record<PlanKey, string> = {
  '12month': 'bg-emerald-500',
  '3month': 'bg-blue-500',
  '6month': 'bg-purple-500',
};

const PLAN_TEXT_COLORS: Record<PlanKey, string> = {
  '12month': 'text-emerald-600',
  '3month': 'text-blue-600',
  '6month': 'text-purple-600',
};

const PLAN_BG_COLORS: Record<PlanKey, string> = {
  '12month': 'bg-emerald-50',
  '3month': 'bg-blue-50',
  '6month': 'bg-purple-50',
};

const PLAN_RING_COLORS: Record<PlanKey, string> = {
  '12month': '#10b981',
  '3month': '#3b82f6',
  '6month': '#8b5cf6',
};

type TimePeriod = 'today' | 'week' | 'month' | 'all';

const TIME_LABELS: Record<TimePeriod, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  all: 'All Time',
};

const TIME_ICONS: Record<TimePeriod, string> = {
  today: '📅',
  week: '📆',
  month: '🗓️',
  all: '🏆',
};

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Handle common formats: M/D/YYYY, MM/DD/YYYY, YYYY-MM-DD, D/M/YYYY
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    // If first part is 4 digits, it's YYYY-MM-DD
    if (parts[0].length === 4) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    // Otherwise M/D/YYYY
    return new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
  }
  // Fallback
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function isInTimePeriod(dateStr: string, period: TimePeriod): boolean {
  if (period === 'all') return true;
  const date = parseDate(dateStr);
  if (!date) return false;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === 'today') {
    return date >= startOfDay;
  }
  if (period === 'week') {
    const day = now.getDay();
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - day);
    return date >= startOfWeek;
  }
  if (period === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return date >= startOfMonth;
  }
  return true;
}

function filterByTimePeriod(leaderboard: SalespersonStats[], period: TimePeriod): SalespersonStats[] {
  if (period === 'all') return leaderboard;

  return leaderboard
    .map((person) => {
      const filteredClients = person.clients.filter((c) => isInTimePeriod(c.date, period));
      const byPlan: Record<PlanKey, number> = { '12month': 0, '3month': 0, '6month': 0 };
      filteredClients.forEach((c) => { byPlan[c.plan]++; });
      return {
        ...person,
        total: filteredClients.length,
        byPlan,
        clients: filteredClients,
      };
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total);
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarGradient(index: number) {
  const gradients = [
    'from-yellow-400 to-orange-500',
    'from-gray-300 to-gray-500',
    'from-amber-600 to-amber-800',
    'from-navy-500 to-navy-700',
    'from-emerald-500 to-teal-600',
    'from-blue-500 to-indigo-600',
    'from-pink-500 to-rose-600',
    'from-violet-500 to-purple-600',
  ];
  return gradients[index % gradients.length];
}

// Animated counter
function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = 0;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (value - start) * eased));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{display}</>;
}

// SVG circular progress ring
function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 6,
  color = '#002E59',
  children,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// Horizontal bar chart for plan distribution
function PlanDistributionBar({ person }: { person: SalespersonStats }) {
  if (person.total === 0) return null;
  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 w-full">
      {(['12month', '3month', '6month'] as PlanKey[]).map((plan) => {
        const pct = (person.byPlan[plan] / person.total) * 100;
        if (pct === 0) return null;
        return (
          <div
            key={plan}
            className={`${PLAN_COLORS[plan]} transition-all duration-700`}
            style={{ width: `${pct}%` }}
            title={`${PLAN_LABELS[plan]}: ${person.byPlan[plan]}`}
          />
        );
      })}
    </div>
  );
}

// Top 3 podium with enhanced design
function TopThree({ people }: { people: SalespersonStats[] }) {
  if (people.length === 0) return null;
  const order = [1, 0, 2]; // silver, gold, bronze for podium layout

  return (
    <div className="bg-gradient-to-b from-navy-700 via-navy-600 to-navy-500 rounded-3xl p-4 sm:p-6 shadow-navy">
      <div className="text-center mb-4">
        <h2 className="text-white font-bold text-sm sm:text-base tracking-wide uppercase">Top Performers</h2>
      </div>
      <div className="flex items-end justify-center gap-3 sm:gap-6">
        {order.map((pos, i) => {
          const person = people[pos];
          if (!person) return <div key={i} className="flex-1 max-w-[110px]" />;
          const heights = ['h-20', 'h-28', 'h-16'];
          const avatarSizes = ['w-14 h-14 text-base', 'w-20 h-20 text-xl', 'w-14 h-14 text-base'];
          const rankEmojis = ['', '', ''];
          const rankLabels = ['2nd', '1st', '3rd'];

          return (
            <div key={pos} className="flex flex-col items-center flex-1 max-w-[110px]">
              {pos === 0 && <div className="text-3xl sm:text-4xl animate-crown mb-1">👑</div>}
              <div className="relative mb-2">
                <div
                  className={`${avatarSizes[i]} rounded-full bg-gradient-to-br ${getAvatarGradient(pos)} flex items-center justify-center text-white font-bold shadow-lg ${pos === 0 ? 'ring-4 ring-yellow-400 animate-pulse-glow' : 'ring-2 ring-white/30'}`}
                >
                  {getInitials(person.name)}
                </div>
                {rankEmojis[i] && (
                  <span className="absolute -bottom-1 -right-1 text-lg">{rankEmojis[i]}</span>
                )}
              </div>
              <div className="text-center mb-1 w-full">
                <div className="font-bold text-white text-xs sm:text-sm truncate">
                  {person.name.split(' ')[0]}
                </div>
                <div className="text-[10px] text-navy-200 truncate">
                  {person.name.split(' ').slice(1).join(' ') || '\u00A0'}
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-yellow-400">
                <AnimatedNumber value={person.total} />
              </div>
              <div
                className={`${heights[i]} w-full bg-gradient-to-t ${
                  pos === 0
                    ? 'from-yellow-500/90 to-yellow-300/90'
                    : pos === 1
                    ? 'from-gray-400/90 to-gray-300/90'
                    : 'from-amber-700/90 to-amber-500/90'
                } rounded-t-2xl mt-2 flex flex-col items-center justify-center backdrop-blur-sm`}
              >
                <span className="text-white font-black text-2xl sm:text-3xl">{pos + 1}</span>
                <span className="text-white/70 text-[9px] font-medium">{rankLabels[i]}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Individual leaderboard row
function LeaderboardRow({
  person,
  rank,
  expanded,
  onToggle,
  maxTotal,
}: {
  person: SalespersonStats;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
  maxTotal: number;
}) {
  const MEDAL_ICONS = ['', '', ''];
  const barWidth = maxTotal > 0 ? (person.total / maxTotal) * 100 : 0;

  return (
    <div className={`bg-white rounded-2xl shadow-card overflow-hidden transition-all ${rank <= 3 ? 'ring-1 ring-navy-100' : ''}`}>
      <button
        onClick={onToggle}
        className="w-full p-3 sm:p-4 flex items-center gap-3 text-left active:bg-gray-50 transition-colors"
      >
        {/* Rank */}
        <div className="flex-shrink-0 w-8 text-center">
          {rank <= 3 ? (
            <span className="text-xl">{MEDAL_ICONS[rank - 1]}</span>
          ) : (
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-xs font-bold text-gray-500">{rank}</span>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br ${getAvatarGradient(rank - 1)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md`}
        >
          {getInitials(person.name)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-navy-700 text-sm sm:text-base truncate">
            {person.name}
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 w-full">
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-navy-500 to-accent-teal rounded-full transition-all duration-1000"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
          {/* Plan badges */}
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {(['12month', '3month', '6month'] as PlanKey[]).map(
              (plan) =>
                person.byPlan[plan] > 0 && (
                  <span
                    key={plan}
                    className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full ${PLAN_BG_COLORS[plan]} ${PLAN_TEXT_COLORS[plan]} font-semibold`}
                  >
                    {PLAN_LABELS[plan]}: {person.byPlan[plan]}
                  </span>
                )
            )}
          </div>
        </div>

        {/* Score */}
        <div className="flex-shrink-0 text-right">
          <div className="text-xl sm:text-2xl font-black text-navy-600">
            {person.total}
          </div>
          <div className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">vouchers</div>
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-300 flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 animate-fade-in">
          {/* Plan distribution */}
          <div className="px-4 pt-3 pb-2">
            <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Plan Distribution</div>
            <PlanDistributionBar person={person} />
            <div className="flex justify-between mt-1.5">
              {(['12month', '3month', '6month'] as PlanKey[]).map((plan) => (
                <div key={plan} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${PLAN_COLORS[plan]}`} />
                  <span className="text-[9px] text-gray-500">
                    {PLAN_LABELS[plan]} ({person.byPlan[plan]})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Client list */}
          {person.clients.length > 0 && (
            <div className="px-4 pb-3">
              <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">
                Clients ({person.clients.length})
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {[...person.clients]
                  .sort((a, b) => {
                    const da = parseDate(a.date);
                    const db = parseDate(b.date);
                    if (!da && !db) return 0;
                    if (!da) return 1;
                    if (!db) return -1;
                    return db.getTime() - da.getTime();
                  })
                  .slice(0, 15)
                  .map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-2.5 py-2"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${PLAN_COLORS[c.plan]} flex-shrink-0`} />
                      <span className="text-navy-700 font-medium truncate flex-1">{c.name}</span>
                      {c.code && <CopyButton text={c.code} />}
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full ${PLAN_BG_COLORS[c.plan]} ${PLAN_TEXT_COLORS[c.plan]} font-medium flex-shrink-0`}
                      >
                        {PLAN_LABELS[c.plan]}
                      </span>
                      {c.date && (
                        <span className="text-gray-400 text-[10px] flex-shrink-0">{c.date}</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Activity feed
function ActivityFeed({ assignments }: { assignments: SheetSummary['recentAssignments'] }) {
  if (assignments.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl shadow-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <h3 className="text-sm font-bold text-navy-700">Recent Activity</h3>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {assignments.slice(0, 10).map((a, i) => (
          <div key={i} className="flex items-start gap-2 text-xs animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="w-6 h-6 rounded-full bg-navy-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#002E59" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-navy-700">
                <span className="font-semibold">{a.name}</span>
                <span className="text-gray-400"> assigned </span>
                <span className="font-medium">{a.client}</span>
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${PLAN_BG_COLORS[a.plan]} ${PLAN_TEXT_COLORS[a.plan]} font-medium`}>
                  {PLAN_LABELS[a.plan]}
                </span>
                {a.date && <span className="text-gray-400 text-[10px]">{a.date}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Leaderboard({ data }: { data: SheetSummary }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | PlanKey>('all');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  const [activeTab, setActiveTab] = useState<'rankings' | 'activity'>('rankings');

  // First filter by time period, then by plan
  const timeFiltered = filterByTimePeriod(data.leaderboard, timePeriod);
  const filteredLeaderboard =
    filter === 'all'
      ? timeFiltered
      : timeFiltered
          .map((p) => {
            const planClients = p.clients.filter((c) => c.plan === filter);
            const byPlan: Record<PlanKey, number> = { '12month': 0, '3month': 0, '6month': 0 };
            byPlan[filter] = planClients.length;
            return { ...p, total: planClients.length, byPlan, clients: planClients };
          })
          .filter((p) => p.total > 0)
          .sort((a, b) => b.total - a.total);

  const maxTotal = filteredLeaderboard.length > 0 ? filteredLeaderboard[0].total : 1;
  const assignmentRate = data.totals.totalVouchers > 0
    ? ((data.totals.assigned / data.totals.totalVouchers) * 100)
    : 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Overview Stats - Circular progress + key metrics */}
      <div className="bg-white rounded-3xl shadow-card p-4 sm:p-5">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Main progress ring */}
          <ProgressRing progress={assignmentRate} size={90} strokeWidth={7} color="#002E59">
            <div className="text-center">
              <div className="text-lg font-black text-navy-700">
                <AnimatedNumber value={Math.round(assignmentRate)} />%
              </div>
              <div className="text-[8px] text-gray-400 font-medium">ASSIGNED</div>
            </div>
          </ProgressRing>

          {/* Key metrics */}
          <div className="flex-1 grid grid-cols-2 gap-2">
            <div className="bg-navy-50 rounded-xl p-2.5">
              <div className="text-lg sm:text-xl font-black text-navy-700">
                <AnimatedNumber value={data.totals.assigned} />
              </div>
              <div className="text-[10px] text-navy-500 font-medium">Assigned</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-2.5">
              <div className="text-lg sm:text-xl font-black text-emerald-700">
                <AnimatedNumber value={data.totals.available} />
              </div>
              <div className="text-[10px] text-emerald-500 font-medium">Available</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-2.5">
              <div className="text-lg sm:text-xl font-black text-amber-700">
                <AnimatedNumber value={data.totals.totalSalespeople} />
              </div>
              <div className="text-[10px] text-amber-500 font-medium">Salespeople</div>
            </div>
            <div className="bg-red-50 rounded-xl p-2.5">
              <div className="text-lg sm:text-xl font-black text-red-600">
                <AnimatedNumber value={data.totals.compromised} />
              </div>
              <div className="text-[10px] text-red-400 font-medium">Compromised</div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan breakdown with circular rings */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {(['12month', '6month', '3month'] as PlanKey[]).map((plan) => {
          const stats = data.totals.byPlan[plan];
          const pct = stats.total > 0 ? (stats.assigned / stats.total) * 100 : 0;
          return (
            <div key={plan} className="bg-white rounded-2xl shadow-card p-3 flex flex-col items-center">
              <ProgressRing progress={pct} size={56} strokeWidth={5} color={PLAN_RING_COLORS[plan]}>
                <span className="text-[10px] font-bold text-gray-700">
                  {Math.round(pct)}%
                </span>
              </ProgressRing>
              <div className="text-center mt-2">
                <div className="text-sm sm:text-base font-bold text-navy-700">
                  {stats.assigned}
                  <span className="text-xs text-gray-400 font-normal">/{stats.total}</span>
                </div>
                <div className="text-[9px] sm:text-[10px] text-gray-500 font-medium">
                  {PLAN_LABELS[plan]}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab switcher */}
      <div className="flex bg-white rounded-xl p-1 shadow-card">
        <button
          onClick={() => setActiveTab('rankings')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'rankings'
              ? 'bg-navy-600 text-white shadow-navy'
              : 'text-gray-500 hover:text-navy-600'
          }`}
        >
          Rankings
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'activity'
              ? 'bg-navy-600 text-white shadow-navy'
              : 'text-gray-500 hover:text-navy-600'
          }`}
        >
          Activity Feed
        </button>
      </div>

      {activeTab === 'rankings' ? (
        <>
          {/* Time Period Selector */}
          <div className="bg-white rounded-2xl shadow-card p-1.5">
            <div className="grid grid-cols-4 gap-1">
              {(['today', 'week', 'month', 'all'] as TimePeriod[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTimePeriod(t); setExpandedIdx(null); }}
                  className={`py-2 px-1 rounded-xl text-center transition-all ${
                    timePeriod === t
                      ? 'bg-navy-600 text-white shadow-navy'
                      : 'text-gray-500 hover:bg-navy-50'
                  }`}
                >
                  <div className="text-sm leading-none mb-0.5">{TIME_ICONS[t]}</div>
                  <div className="text-[10px] font-semibold leading-tight">{TIME_LABELS[t]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Time period summary */}
          {timePeriod !== 'all' && (
            <div className="bg-gradient-to-r from-navy-50 to-blue-50 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-navy-700">{TIME_LABELS[timePeriod]} Rankings</span>
                <span className="text-[10px] text-gray-500 ml-2">
                  {filteredLeaderboard.length} active {filteredLeaderboard.length === 1 ? 'agent' : 'agents'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-navy-700">
                  {filteredLeaderboard.reduce((sum, p) => sum + p.total, 0)}
                </span>
                <span className="text-[10px] text-gray-500 ml-1">sales</span>
              </div>
            </div>
          )}

          {/* Plan Filter Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            {(['all', '12month', '6month', '3month'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  filter === f
                    ? 'bg-navy-600 text-white shadow-navy'
                    : 'bg-white text-gray-500 hover:bg-navy-50 shadow-card'
                }`}
              >
                {f === 'all' ? 'All Plans' : PLAN_LABELS[f]}
              </button>
            ))}
          </div>

          {/* Top 3 Podium */}
          {filteredLeaderboard.length >= 2 && (
            <TopThree people={filteredLeaderboard.slice(0, 3)} />
          )}

          {/* Full Leaderboard */}
          <div className="space-y-2 stagger-children">
            {filteredLeaderboard.map((person, i) => (
              <LeaderboardRow
                key={person.name}
                person={person}
                rank={i + 1}
                expanded={expandedIdx === i}
                onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
                maxTotal={maxTotal}
              />
            ))}
          </div>

          {filteredLeaderboard.length === 0 && (
            <div className="bg-white rounded-2xl shadow-card p-8 text-center">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-gray-500 text-sm">No sales data for this filter yet</p>
            </div>
          )}
        </>
      ) : (
        <ActivityFeed assignments={data.recentAssignments} />
      )}
    </div>
  );
}
