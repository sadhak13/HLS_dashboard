"use client";

import React, { useEffect, useState } from 'react';
import { KPICard } from '@/components/admin/KPICard';
import { Users, MapPin, IndianRupee, Activity } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
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
  }, [supabase, branchesMap]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Academy Overview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back, here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Total Active Players" 
          value={playersCount.toString()} 
          trend={{ value: 0, isPositive: true }}
          icon={<Users className="w-6 h-6" />} 
        />
        <KPICard 
          title="Total Branches" 
          value={branchesCount.toString()} 
          trend={{ value: 0, isPositive: true }}
          icon={<MapPin className="w-6 h-6" />} 
        />
        <KPICard 
          title="Revenue (This Month)" 
          value={`₹${revenue.toLocaleString('en-IN')}`} 
          trend={{ value: 0, isPositive: true }}
          icon={<IndianRupee className="w-6 h-6" />} 
        />
        <KPICard 
          title="Avg. Attendance" 
          value={`${attendancePct.toFixed(1)}%`} 
          trend={{ value: 0, isPositive: true }}
          icon={<Activity className="w-6 h-6" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => `₹${val}`} />
                    <Tooltip 
                      cursor={{ fill: '#f3f4f6' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-gray-500">No recent activity.</p>
              ) : (
                <ul className="space-y-4">
                  {activities.map((activity) => (
                    <li key={activity.id} className="flex items-start gap-3">
                      <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${activity.type === 'fee' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.title}</p>
                        <p className="text-xs text-gray-500">
                          {activity.subtitle.split(' • ')[0]} • {formatDistanceToNow(parseISO(activity.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
