import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { DashboardClient } from '@/components/admin/DashboardClient';
import { format, subMonths } from 'date-fns';

export default async function DashboardPage() {
  const supabase = await createClient();
  const currentMonth = format(new Date(), 'yyyy-MM');

  // Chart data queries preparation
  const chartQueries = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(new Date(), i);
    const monthStr = format(d, 'yyyy-MM');
    const monthName = format(d, 'MMM');
    chartQueries.push(
      supabase.from('fees').select('amount').eq('status', 'paid').eq('month', monthStr)
        .then(({ data }) => ({
          name: monthName,
          revenue: data?.reduce((sum, f: any) => sum + f.amount, 0) || 0
        }))
    );
  }

  // Execute all independent queries in parallel
  const [
    { count: playersCount },
    { data: branches },
    { data: currentMonthFees },
    { count: presentCount },
    { count: totalAttendance },
    { data: recentPlayers },
    { data: recentFees },
    ...chartDataResults
  ] = await Promise.all([
    supabase.from('players').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('branches').select('id, name'),
    supabase.from('fees').select('amount').eq('status', 'paid').eq('month', currentMonth),
    supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('status', 'present'),
    supabase.from('attendance').select('*', { count: 'exact', head: true }),
    supabase.from('players').select('id, full_name, branch_id, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('fees').select('id, amount, branch_id, created_at').eq('status', 'paid').order('created_at', { ascending: false }).limit(5),
    ...chartQueries
  ]);

  // Process Results
  const branchesCount = branches?.length || 0;
  const branchesMap = (branches || []).reduce((acc, b: any) => {
    acc[b.id] = b.name;
    return acc;
  }, {} as Record<string, string>);

  const revenue = currentMonthFees?.reduce((sum, f: any) => sum + f.amount, 0) || 0;
  const attendancePct = totalAttendance ? (presentCount || 0) / totalAttendance * 100 : 0;
  
  // Format chart data
  const chartData = chartDataResults as { name: string, revenue: number }[];

  let activities: {
    id: string;
    type: 'fee' | 'player';
    title: string;
    subtitle: string;
    created_at: string;
  }[] = [];

  if (recentPlayers) {
    activities.push(...recentPlayers.map((p: any) => ({
      id: `player-${p.id}`,
      type: 'player' as const,
      title: `${p.full_name} has joined ${branchesMap[p.branch_id] || 'Unknown Branch'}`,
      subtitle: `${branchesMap[p.branch_id] || 'Unknown Branch'}`,
      created_at: p.created_at
    })));
  }
  if (recentFees) {
    activities.push(...recentFees.map((f: any) => ({
      id: `fee-${f.id}`,
      type: 'fee' as const,
      title: `Fee Collected - ₹${f.amount}`,
      subtitle: `${branchesMap[f.branch_id] || 'Unknown Branch'}`,
      created_at: f.created_at
    })));
  }
  
  activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  activities = activities.slice(0, 10);
  
  return (
    <DashboardClient 
      initialPlayersCount={playersCount || 0}
      initialBranchesCount={branchesCount}
      initialRevenue={revenue}
      initialAttendancePct={attendancePct}
      initialActivities={activities}
      initialChartData={chartData}
      branchesMap={branchesMap}
    />
  );
}
