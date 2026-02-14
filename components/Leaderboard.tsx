'use client';

import { useState } from 'react';
import type { SheetSummary, SalespersonStats } from '@/lib/sheets';

const PLAN_LABELS: Record<string, string> = {
  '1month': '1 Month',
  '3month': '3 Months',
  '6month': '6 Months',
};

const MEDAL_ICONS = ['🥇', '🥈', '🥉'];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(index: number) {
  const colors = [
    'bg-navy-600',
    'bg-accent-teal',
    'bg-navy-500',
    'bg-navy-400',
    'bg-navy-300',
  ];
  return colors[index % colors.length];
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-card flex items-center gap-3 min-w-0">
      <div className="text-2xl flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-navy-700 animate-count">{value}</div>
        <div className="text-xs text-gray-500 truncate">{label}</div>
        {sub && <div className="text-[10px] text-gray-400 truncate">{sub}</div>}
      </div>
    </div>
  );
}

function TopThree({ people }: { people: SalespersonStats[] }) {
  if (people.length === 0) return null;
  const positions = [1, 0, 2]; // silver, gold, bronze order for podium
  const heights = ['h-24', 'h-32', 'h-20'];
  const sizes = ['w-14 h-14', 'w-20 h-20', 'w-14 h-14'];
  const textSizes = ['text-lg', 'text-2xl', 'text-lg'];

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4 pt-6 pb-2 px-2">
      {positions.map((pos, i) => {
        const person = people[pos];
        if (!person) return <div key={i} className="flex-1" />;
        return (
          <div key={pos} className="flex flex-col items-center flex-1 max-w-[120px]">
            {pos === 0 && (
              <div className="text-3xl animate-crown mb-1">👑</div>
            )}
            <div
              className={`${sizes[i]} rounded-full ${getAvatarColor(pos)} flex items-center justify-center text-white font-bold ${textSizes[i]} shadow-navy mb-2 ${pos === 0 ? 'animate-pulse-glow ring-4 ring-yellow-400/50' : ''}`}
            >
              {getInitials(person.name)}
            </div>
            <div className="text-center mb-1">
              <div className="font-bold text-navy-700 text-xs sm:text-sm leading-tight truncate w-full">
                {person.name.split(' ')[0]}
              </div>
              <div className="text-[10px] text-gray-500 truncate w-full">
                {person.name.split(' ').slice(1).join(' ')}
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-navy-600">
              {person.total}
            </div>
            <div
              className={`${heights[i]} w-full bg-gradient-to-t ${
                pos === 0
                  ? 'from-yellow-500 to-yellow-300'
                  : pos === 1
                  ? 'from-gray-400 to-gray-300'
                  : 'from-amber-700 to-amber-500'
              } rounded-t-xl mt-1 flex items-center justify-center`}
            >
              <span className="text-white font-bold text-xl sm:text-2xl">
                {pos + 1}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeaderboardRow({
  person,
  rank,
  expanded,
  onToggle,
}: {
  person: SalespersonStats;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden transition-all">
      <button
        onClick={onToggle}
        className="w-full p-3 sm:p-4 flex items-center gap-3 text-left active:bg-gray-50 transition-colors"
      >
        <div className="flex-shrink-0 w-8 text-center">
          {rank <= 3 ? (
            <span className="text-xl">{MEDAL_ICONS[rank - 1]}</span>
          ) : (
            <span className="text-sm font-bold text-gray-400">#{rank}</span>
          )}
        </div>
        <div
          className={`w-10 h-10 rounded-full ${getAvatarColor(rank - 1)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
        >
          {getInitials(person.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-navy-700 text-sm sm:text-base truncate">
            {person.name}
          </div>
          <div className="flex gap-2 mt-0.5">
            {Object.entries(person.byPlan).map(
              ([plan, count]) =>
                count > 0 && (
                  <span
                    key={plan}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-navy-50 text-navy-600 font-medium"
                  >
                    {PLAN_LABELS[plan]}: {count}
                  </span>
                )
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-xl sm:text-2xl font-black text-navy-600">
            {person.total}
          </div>
          <div className="text-[10px] text-gray-400">vouchers</div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && person.clients.length > 0 && (
        <div className="px-4 pb-3 border-t border-gray-100 animate-fade-in">
          <div className="text-xs text-gray-500 font-medium mt-2 mb-1.5">Recent Clients</div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {person.clients
              .sort((a, b) => {
                if (!a.date && !b.date) return 0;
                if (!a.date) return 1;
                if (!b.date) return -1;
                return new Date(b.date).getTime() - new Date(a.date).getTime();
              })
              .slice(0, 10)
              .map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  <span className="text-navy-700 font-medium truncate flex-1">{c.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cream-100 text-gray-500 flex-shrink-0">
                    {PLAN_LABELS[c.plan]}
                  </span>
                  {c.date && (
                    <span className="text-gray-400 flex-shrink-0">{c.date}</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Leaderboard({ data }: { data: SheetSummary }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | '1month' | '3month' | '6month'>('all');

  const filteredLeaderboard =
    filter === 'all'
      ? data.leaderboard
      : data.leaderboard
          .map((p) => ({
            ...p,
            total: p.byPlan[filter],
          }))
          .filter((p) => p.total > 0)
          .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard icon="📦" label="Total Vouchers" value={data.totals.totalVouchers} />
        <StatCard
          icon="✅"
          label="Assigned"
          value={data.totals.assigned}
          sub={`${((data.totals.assigned / data.totals.totalVouchers) * 100).toFixed(1)}%`}
        />
        <StatCard icon="📋" label="Available" value={data.totals.available} />
        <StatCard icon="⚠️" label="Compromised" value={data.totals.compromised} />
      </div>

      {/* Plan breakdown */}
      <div className="grid grid-cols-3 gap-2">
        {(['1month', '3month', '6month'] as const).map((plan) => (
          <div key={plan} className="bg-white rounded-xl p-3 shadow-card text-center">
            <div className="text-[10px] sm:text-xs text-gray-500 mb-1">{PLAN_LABELS[plan]}</div>
            <div className="text-lg font-bold text-navy-600">
              {data.totals.byPlan[plan].assigned}
              <span className="text-xs text-gray-400 font-normal">
                /{data.totals.byPlan[plan].total}
              </span>
            </div>
            <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-navy-600 to-accent-teal rounded-full transition-all duration-1000"
                style={{
                  width: `${(data.totals.byPlan[plan].assigned / data.totals.byPlan[plan].total) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {(['all', '1month', '3month', '6month'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              filter === f
                ? 'bg-navy-600 text-white shadow-navy'
                : 'bg-white text-gray-600 hover:bg-navy-50'
            }`}
          >
            {f === 'all' ? 'All Plans' : PLAN_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Top 3 Podium */}
      <div className="bg-white rounded-3xl shadow-card overflow-hidden">
        <TopThree people={filteredLeaderboard.slice(0, 3)} />
      </div>

      {/* Full Leaderboard */}
      <div className="space-y-2 stagger-children">
        {filteredLeaderboard.map((person, i) => (
          <LeaderboardRow
            key={person.name}
            person={person}
            rank={i + 1}
            expanded={expandedIdx === i}
            onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
          />
        ))}
      </div>
    </div>
  );
}
