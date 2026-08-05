"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { PeriodPicker, PeriodRange, getDefaultPeriod } from '@/components/admin/PeriodPicker';
import { Users, MapPin, IndianRupee, Activity, UserPlus, AlertCircle, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow, parseISO, format, eachMonthOfInterval, startOfYear, endOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { useTheme } from '@/context/ThemeContext';

type ActivityItem = {
  id: string;
  type: 'fee' | 'player';
  title: string;
  subtitle: string;
  created_at: string;
};

type ChartData = {
  name: string;
  revenue: number;
  monthKey: string;
};

const PIE_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#ef4444', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48',
];

interface DashboardClientProps {
  branchesMap: Record<string, string>;
  initialBranchesCount: number;
}

export function DashboardClient({ branchesMap, initialBranchesCount }: DashboardClientProps) {
  const { theme } = useTheme();
  const [period, setPeriod] = useState<PeriodRange>(getDefaultPeriod);
  const [playersCount, setPlayersCount] = useState(0);
  const [branchesCount, setBranchesCount] = useState(initialBranchesCount);
  const [revenue, setRevenue] = useState(0);
  const [attendancePct, setAttendancePct] = useState(0);
  const [newEnrollments, setNewEnrollments] = useState(0);
  const [pendingDues, setPendingDues] = useState(0);
  const [collectionRate, setCollectionRate] = useState(0);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [branchDistribution, setBranchDistribution] = useState<{ name: string; value: number }[]>([]);
  const [activePieIndex, setActivePieIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const fetchDashboardData = useCallback(async (p: PeriodRange) => {
    setIsLoading(true);

    const fromDate = p.from;
    const toDate = p.to;

    // Year-to-date range for the chart (always Jan 1 → today, independent of period picker)
    const now = new Date();
    const ytdFrom = format(startOfYear(now), 'yyyy-MM-dd');
    const ytdTo = format(endOfMonth(now), 'yyyy-MM-dd');
    const ytdMonths = eachMonthOfInterval({ start: parseISO(ytdFrom), end: now });
    const ytdMonthKeys = ytdMonths.map(m => format(m, 'yyyy-MM'));
    const ytdMonthLabels = ytdMonths.map(m => format(m, 'MMM'));

    const [
      { count: activePlayers },
      { data: paidFees },
      { data: pendingFees },
      { count: presentCount },
      { count: totalAttendance },
      { data: enrolledPlayers },
      { data: recentPlayers },
      { data: recentFees },
      { data: playersByBranch },
      { data: ytdFees },
    ] = await Promise.all([
      supabase.from('players').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      (supabase as any).from('fees').select('amount, month').eq('status', 'paid').gte('paid_date', fromDate).lte('paid_date', toDate + 'T23:59:59'),
      (supabase as any).from('fees').select('amount').in('status', ['pending', 'overdue']).gte('created_at', fromDate).lte('created_at', toDate + 'T23:59:59'),
      (supabase as any).from('attendance').select('*', { count: 'exact', head: true }).eq('status', 'present').gte('date', fromDate).lte('date', toDate),
      (supabase as any).from('attendance').select('*', { count: 'exact', head: true }).gte('date', fromDate).lte('date', toDate),
      supabase.from('players').select('id').gte('enrolled_date', fromDate).lte('enrolled_date', toDate),
      supabase.from('players').select('id, full_name, branch_id, created_at').order('created_at', { ascending: false }).limit(5),
      (supabase as any).from('fees').select('id, amount, branch_id, created_at').eq('status', 'paid').order('created_at', { ascending: false }).limit(5),
      supabase.from('players').select('branch_id').eq('status', 'active'),
      // Year-to-date fees for the chart (always full year regardless of period picker)
      (supabase as any).from('fees').select('amount, month').eq('status', 'paid').gte('paid_date', ytdFrom).lte('paid_date', ytdTo + 'T23:59:59'),
    ]);

    // Active players (always current count)
    setPlayersCount(activePlayers || 0);

    // Revenue for the selected period
    const totalRevenue = (paidFees ?? []).reduce((sum: number, f: any) => sum + f.amount, 0);
    setRevenue(totalRevenue);

    // Pending dues
    const totalPending = (pendingFees ?? []).reduce((sum: number, f: any) => sum + f.amount, 0);
    setPendingDues(totalPending);

    // Collection rate
    const totalBilled = totalRevenue + totalPending;
    setCollectionRate(totalBilled > 0 ? (totalRevenue / totalBilled) * 100 : 0);

    // Attendance percentage
    setAttendancePct(totalAttendance ? ((presentCount || 0) / totalAttendance) * 100 : 0);

    // New enrollments
    setNewEnrollments(enrolledPlayers?.length || 0);

    // Chart data: always shows all months Jan → now (year-to-date)
    const revenueByMonth: Record<string, number> = {};
    ytdMonthKeys.forEach(mk => { revenueByMonth[mk] = 0; });
    (ytdFees ?? []).forEach((f: any) => {
      if (f.month && revenueByMonth[f.month] !== undefined) {
        revenueByMonth[f.month] += f.amount;
      }
    });
    const chartResult: ChartData[] = ytdMonthKeys.map((mk, i) => ({
      name: ytdMonthLabels[i],
      monthKey: mk,
      revenue: revenueByMonth[mk] || 0,
    }));
    setChartData(chartResult);

    // Branch-wise player distribution
    const branchCounts: Record<string, number> = {};
    (playersByBranch ?? []).forEach((p: any) => {
      branchCounts[p.branch_id] = (branchCounts[p.branch_id] || 0) + 1;
    });
    const distribution = Object.entries(branchCounts)
      .map(([branchId, count]) => ({
        name: branchesMap[branchId] || 'Unknown',
        value: count,
      }))
      .sort((a, b) => b.value - a.value);
    setBranchDistribution(distribution);

    // Activities
    const acts: ActivityItem[] = [];
    if (recentPlayers) {
      acts.push(...recentPlayers.map((p: any) => ({
        id: `player-${p.id}`,
        type: 'player' as const,
        title: `${p.full_name} joined ${branchesMap[p.branch_id] || 'Unknown Branch'}`,
        subtitle: branchesMap[p.branch_id] || 'Unknown Branch',
        created_at: p.created_at,
      })));
    }
    if (recentFees) {
      acts.push(...recentFees.map((f: any) => ({
        id: `fee-${f.id}`,
        type: 'fee' as const,
        title: `Fee Collected - ₹${f.amount}`,
        subtitle: branchesMap[f.branch_id] || 'Unknown Branch',
        created_at: f.created_at,
      })));
    }
    acts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setActivities(acts.slice(0, 10));

    setIsLoading(false);
  }, [branchesMap]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchDashboardData(period);
  }, [period, fetchDashboardData]);

  // Realtime subscriptions for live updates
  useEffect(() => {
    const playersSub = supabase
      .channel('players-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new.status === 'active') {
          setPlayersCount(prev => prev + 1);
          setNewEnrollments(prev => prev + 1);
          const branchName = branchesMap[payload.new.branch_id] || 'Unknown Branch';
          const newPlayerActivity: ActivityItem = {
            id: `player-${payload.new.id}`,
            type: 'player',
            title: `${payload.new.full_name} joined ${branchName}`,
            subtitle: branchName,
            created_at: payload.new.created_at,
          };
          setActivities(prev => [newPlayerActivity, ...prev].slice(0, 10));
        } else if (payload.eventType === 'UPDATE') {
          if (payload.old.status !== 'active' && payload.new.status === 'active') {
            setPlayersCount(prev => prev + 1);
          } else if (payload.old.status === 'active' && payload.new.status !== 'active') {
            setPlayersCount(prev => Math.max(0, prev - 1));
          }
        } else if (payload.eventType === 'DELETE') {
          setPlayersCount(prev => Math.max(0, prev - 1));
        }
      })
      .subscribe();

    const feesSub = supabase
      .channel('fees-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fees' }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new.status === 'paid') {
          const branchName = branchesMap[payload.new.branch_id] || 'Unknown Branch';
          setRevenue(prev => prev + payload.new.amount);
          const newFeeActivity: ActivityItem = {
            id: `fee-${payload.new.id}`,
            type: 'fee',
            title: `Fee Collected - ₹${payload.new.amount}`,
            subtitle: branchName,
            created_at: payload.new.created_at,
          };
          setActivities(prev => [newFeeActivity, ...prev].slice(0, 10));
        }
      })
      .subscribe();

    const branchesSub = supabase
      .channel('branches-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'branches' }, () => {
        setBranchesCount(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(playersSub);
      supabase.removeChannel(feesSub);
      supabase.removeChannel(branchesSub);
    };
  }, [branchesMap]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header with Period Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Academy Overview</h1>
          <p className="text-sm sm:text-base text-gray-400">Welcome back, here&apos;s what&apos;s happening.</p>
        </div>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      {/* Loading overlay for stats */}
      <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
        {/* Primary Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
          <StatCard
            title="Total Active Players"
            value={playersCount}
            icon={Users}
            iconColor="text-green-500"
          />
          <StatCard
            title="Total Branches"
            value={branchesCount}
            icon={MapPin}
            iconColor="text-blue-500"
          />
          <StatCard
            title="Revenue"
            value={`₹${revenue.toLocaleString('en-IN')}`}
            icon={IndianRupee}
            iconColor="text-emerald-500"
          />
          <StatCard
            title="Avg. Attendance"
            value={`${attendancePct.toFixed(1)}%`}
            icon={Activity}
            iconColor="text-purple-500"
          />
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6 mt-3 md:mt-4 lg:mt-6">
          <StatCard
            title="New Enrollments"
            value={newEnrollments}
            icon={UserPlus}
            iconColor="text-cyan-500"
          />
          <StatCard
            title="Pending Dues"
            value={`₹${pendingDues.toLocaleString('en-IN')}`}
            icon={AlertCircle}
            iconColor="text-amber-500"
          />
          <StatCard
            title="Collection Rate"
            value={`${collectionRate.toFixed(1)}%`}
            icon={TrendingUp}
            iconColor="text-teal-500"
            className="col-span-2 lg:col-span-1"
          />
        </div>
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2">
          <GlassCard title="Revenue Overview" className="h-full">
            <div className="h-64 sm:h-72 md:h-80 w-full -mx-2">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <Tooltip
                      cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                      contentStyle={{
                        borderRadius: '12px',
                        border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb',
                        backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.9)' : '#ffffff',
                        backdropFilter: 'blur(12px)',
                        color: theme === 'dark' ? '#fff' : '#1a1a2e',
                        boxShadow: theme === 'dark' ? undefined : '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value: any) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, 'Revenue']}
                    />
                    <Bar
                      dataKey="revenue"
                      radius={[8, 8, 0, 0]}
                      barSize={40}
                    >
                      {chartData.map((entry, index) => {
                        const inRange = entry.monthKey >= period.from.slice(0, 7) && entry.monthKey <= period.to.slice(0, 7);
                        return (
                          <Cell
                            key={`bar-cell-${index}`}
                            fill={inRange ? 'url(#greenGradient)' : (theme === 'dark' ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.18)')}
                          />
                        );
                      })}
                    </Bar>
                    <defs>
                      <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.65} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  No revenue data for this period.
                </div>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-2 text-right pr-1">
              Chart shows year-to-date · <span className="text-green-400">Highlighted</span> = selected period
            </p>
          </GlassCard>
        </div>

        {/* Recent Activity */}
        <div>
          <GlassCard title="Recent Activity" className="h-full">
            <div className="max-h-72 sm:max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Activity className="w-12 h-12 text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500">No recent activity.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {activities.map((activity) => (
                    <li key={activity.id} className="flex items-start gap-3 p-2.5 sm:p-3 rounded-xl hover:bg-white/5 transition-colors">
                      <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${activity.type === 'fee' ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-blue-500 shadow-lg shadow-blue-500/50'
                        }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-white leading-snug">{activity.title}</p>
                        <p className="text-[11px] sm:text-xs text-gray-400 mt-1">
                          {activity.subtitle} &bull; {formatDistanceToNow(parseISO(activity.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Branch Distribution Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <GlassCard title="Student Distribution by Branch">
          <div className="h-64 sm:h-72 md:h-80 w-full">
            {branchDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {branchDistribution.map((_, index) => (
                      <linearGradient key={`grad-${index}`} id={`pieGrad-${index}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={PIE_COLORS[index % PIE_COLORS.length]} stopOpacity={1} />
                        <stop offset="100%" stopColor={PIE_COLORS[index % PIE_COLORS.length]} stopOpacity={0.6} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    activeShape={(props: any) => {
                      const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
                      return (
                        <g>
                          <Sector
                            cx={cx}
                            cy={cy}
                            innerRadius={innerRadius}
                            outerRadius={outerRadius + 8}
                            startAngle={startAngle}
                            endAngle={endAngle}
                            fill={fill}
                            cornerRadius={4}
                          />
                          <Sector
                            cx={cx}
                            cy={cy}
                            innerRadius={outerRadius + 12}
                            outerRadius={outerRadius + 15}
                            startAngle={startAngle}
                            endAngle={endAngle}
                            fill={fill}
                            opacity={0.3}
                            cornerRadius={2}
                          />
                        </g>
                      );
                    }}
                    data={branchDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius="52%"
                    outerRadius="78%"
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    cornerRadius={6}
                    onMouseEnter={(_, index) => setActivePieIndex(index)}
                    animationBegin={0}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  >
                    {branchDistribution.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#pieGrad-${index})`}
                        stroke="rgba(0,0,0,0.2)"
                        strokeWidth={1}
                      />
                    ))}
                  </Pie>
                  {/* Center label */}
                  <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '28px', fontWeight: 700, fill: theme === 'dark' ? '#ffffff' : '#1a1a2e' }}>
                    {branchDistribution.reduce((s, b) => s + b.value, 0)}
                  </text>
                  <text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '11px', fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
                    students
                  </text>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb',
                      backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : '#ffffff',
                      backdropFilter: 'blur(12px)',
                      color: theme === 'dark' ? '#fff' : '#1a1a2e',
                      boxShadow: theme === 'dark' ? '0 20px 40px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.1)',
                      padding: '10px 14px',
                    }}
                    formatter={(value: any, name: any) => [`${value} students`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                No student data available.
              </div>
            )}
          </div>
          {/* Modern inline legend */}
          {branchDistribution.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
              {branchDistribution.map((branch, i) => {
                const total = branchDistribution.reduce((s, b) => s + b.value, 0);
                const pct = total > 0 ? ((branch.value / total) * 100).toFixed(0) : '0';
                return (
                  <button
                    key={branch.name}
                    onMouseEnter={() => setActivePieIndex(i)}
                    className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-all text-xs ${activePieIndex === i ? 'bg-white/10' : 'hover:bg-white/5'
                      }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="text-gray-400 font-medium">{branch.name}</span>
                    <span className="text-gray-500">{pct}%</span>
                  </button>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Branch-wise breakdown table */}
        <GlassCard title="Branch Breakdown">
          <div className="max-h-72 sm:max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {branchDistribution.length > 0 ? (
              <div className="space-y-2">
                {branchDistribution.map((branch, i) => {
                  const total = branchDistribution.reduce((s, b) => s + b.value, 0);
                  const pct = total > 0 ? (branch.value / total) * 100 : 0;
                  return (
                    <div key={branch.name} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-white truncate">{branch.name}</p>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-xs text-gray-400">{branch.value} students</span>
                            <span className="text-xs font-semibold text-green-400">{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 mt-2 border-t border-white/[0.07] flex items-center justify-between px-3">
                  <span className="text-xs font-medium text-gray-400">Total</span>
                  <span className="text-sm font-bold text-white">
                    {branchDistribution.reduce((s, b) => s + b.value, 0)} students
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full py-8 text-gray-500 text-sm">
                No student data available.
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
