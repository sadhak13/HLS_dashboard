"use client";

import React, { useEffect, useState } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { Users, MapPin, IndianRupee, Activity } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
};

interface DashboardClientProps {
  initialPlayersCount: number;
  initialBranchesCount: number;
  initialRevenue: number;
  initialAttendancePct: number;
  initialActivities: ActivityItem[];
  initialChartData: ChartData[];
  branchesMap: Record<string, string>;
}

export function DashboardClient({
  initialPlayersCount,
  initialBranchesCount,
  initialRevenue,
  initialAttendancePct,
  initialActivities,
  initialChartData,
  branchesMap,
}: DashboardClientProps) {
  const [playersCount, setPlayersCount] = useState(initialPlayersCount);
  const [branchesCount, setBranchesCount] = useState(initialBranchesCount);
  const [revenue, setRevenue] = useState(initialRevenue);
  const [attendancePct, setAttendancePct] = useState(initialAttendancePct);
  const [activities, setActivities] = useState(initialActivities);
  const [chartData, setChartData] = useState(initialChartData);
  const supabase = createClient();

  useEffect(() => {
    // Subscribe to changes in players
    const playersSub = supabase
      .channel('players-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const newPlayer = payload.new;
          const branchName = branchesMap[newPlayer.branch_id] || 'Unknown Branch';
          
          // Fetch current strength of that branch
          const { count } = await supabase
            .from('players')
            .select('*', { count: 'exact', head: true })
            .eq('branch_id', newPlayer.branch_id)
            .eq('status', 'active');
            
          const strength = count || 0;

          const newActivity: ActivityItem = {
            id: `player-${newPlayer.id}`,
            type: 'player',
            title: `${newPlayer.full_name} has joined ${branchName} and now the total strength is ${strength}`,
            subtitle: `${branchName} • Just now`,
            created_at: newPlayer.created_at,
          };

          setActivities((prev) => [newActivity, ...prev].slice(0, 10));
          if (newPlayer.status === 'active') {
             setPlayersCount((prev) => prev + 1);
          }
        } else if (payload.eventType === 'DELETE') {
          setPlayersCount((prev) => Math.max(0, prev - 1));
        } else if (payload.eventType === 'UPDATE') {
          if (payload.old.status !== 'active' && payload.new.status === 'active') {
            setPlayersCount((prev) => prev + 1);
          } else if (payload.old.status === 'active' && payload.new.status !== 'active') {
            setPlayersCount((prev) => Math.max(0, prev - 1));
          }
        }
      })
      .subscribe();

    // Subscribe to changes in fees
    const feesSub = supabase
      .channel('fees-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fees' }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new.status === 'paid') {
          const newFee = payload.new;
          const branchName = branchesMap[newFee.branch_id] || 'Unknown Branch';
          
          const newActivity: ActivityItem = {
            id: `fee-${newFee.id}`,
            type: 'fee',
            title: `Fee Collected - ₹${newFee.amount}`,
            subtitle: `${branchName} • Just now`,
            created_at: newFee.created_at,
          };

          setActivities((prev) => [newActivity, ...prev].slice(0, 10));
          setRevenue((prev) => prev + newFee.amount);
          
          // Optimistically update chart data for current month
          const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
          if (newFee.month === currentMonth) {
             setChartData((prev) => {
               const newData = [...prev];
               const lastIdx = newData.length - 1;
               if (lastIdx >= 0) {
                 newData[lastIdx] = { ...newData[lastIdx], revenue: newData[lastIdx].revenue + newFee.amount };
               }
               return newData;
             });
          }
        }
      })
      .subscribe();

    // Subscribe to changes in branches
    const branchesSub = supabase
      .channel('branches-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'branches' }, () => {
        setBranchesCount((prev) => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(playersSub);
      supabase.removeChannel(feesSub);
      supabase.removeChannel(branchesSub);
    };
  }, [branchesMap]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-white">Academy Overview</h1>
        <p className="text-base text-gray-400">Welcome back, here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
          title="Revenue (This Month)"
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

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2">
          <GlassCard title="Revenue Overview" className="h-full">
            <div className="h-80 w-full -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      backdropFilter: 'blur(12px)',
                      color: '#fff'
                    }}
                    formatter={(value: any) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="url(#greenGradient)"
                    radius={[8, 8, 0, 0]}
                    barSize={50}
                  />
                  <defs>
                    <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>

        {/* Recent Activity */}
        <div>
          <GlassCard title="Recent Activity" className="h-full">
            <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Activity className="w-12 h-12 text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500">No recent activity.</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {activities.map((activity) => (
                    <li key={activity.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                      <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                        activity.type === 'fee' ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-blue-500 shadow-lg shadow-blue-500/50'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white leading-snug">{activity.title}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {activity.subtitle.split(' • ')[0]} • {formatDistanceToNow(parseISO(activity.created_at), { addSuffix: true })}
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
    </div>
  );
}
