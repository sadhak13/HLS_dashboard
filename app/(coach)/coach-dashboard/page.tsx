"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Users, IndianRupee, CalendarDays, CheckCircle2 } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { FeeReminders } from '@/components/coach/FeeReminders';
import { getCoachBranches, getCoachBatchInfo } from '@/lib/coach';
import { clientCache } from '@/lib/clientCache';

interface CoachDashboardStats {
  branchName: string;
  activePlayers: number;
  unpaidPlayersCount: number;
  presentCount: number;
  absentCount: number;
}

export default function CoachDashboardPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  // Cache key unique to this user and date
  const cacheKey = profile ? `coach_dashboard_stats_${profile.id}` : '';

  const [stats, setStats] = useState<CoachDashboardStats>(() => {
    if (cacheKey) {
      const cached = clientCache.get<CoachDashboardStats>(cacheKey);
      if (cached) return cached;
    }
    return {
      branchName: 'Your branch',
      activePlayers: 0,
      unpaidPlayersCount: 0,
      presentCount: 0,
      absentCount: 0,
    };
  });

  const [isLoading, setIsLoading] = useState(() => {
    if (cacheKey) {
      return !clientCache.get(cacheKey);
    }
    return true;
  });
  const today = new Date().toISOString().split('T')[0];

  const fetchSummary = useCallback(async () => {
    if (!profile) return;
    // Only show the spinner on the very first load — subsequent refreshes happen silently
    if (stats.activePlayers === 0 && stats.unpaidPlayersCount === 0) setIsLoading(true);

    const [branches, batchInfo] = await Promise.all([
      getCoachBranches(profile.id),
      getCoachBatchInfo(profile.id),
    ]);

    if (branches.length === 0) {
      setIsLoading(false);
      return;
    }

    const branchIds = branches.map(b => b.id);
    const branchNames = branches.map(b => b.name).join(', ');
    const hasBatches = !batchInfo.isBranchFallback && batchInfo.batchIds.length > 0;

    // Build player query — scoped to batches if available, else branch
    let playersQuery = (supabase as any).from('players').select('id').eq('status', 'active');
    if (hasBatches) {
      playersQuery = playersQuery.in('batch_id', batchInfo.batchIds);
    } else {
      playersQuery = playersQuery.in('branch_id', branchIds);
    }

    // Fees and attendance still use branch_id (no batch_id on those tables)
    // We'll filter fees client-side by player batch if needed
    const [{ data: playersData }, { data: feesData }, { data: attendanceData }] = await Promise.all([
      playersQuery,
      (supabase as any)
        .from('fees')
        .select('player_id, status, players(batch_id)')
        .in('branch_id', branchIds)
        .in('status', ['pending', 'overdue']),
      (supabase as any)
        .from('attendance')
        .select('status, batch_id')
        .in('branch_id', branchIds)
        .eq('date', today),
    ]);

    const batchSet = hasBatches ? new Set(batchInfo.batchIds) : null;

    // Filter fees to coach's batches
    const scopedFees = batchSet
      ? (feesData ?? []).filter((fee: any) => fee.players?.batch_id && batchSet.has(fee.players.batch_id))
      : (feesData ?? []);

    // Filter attendance to coach's batches
    const scopedAttendance = batchSet
      ? (attendanceData ?? []).filter((row: any) => row.batch_id && batchSet.has(row.batch_id))
      : (attendanceData ?? []);

    const unpaidPlayersCount = new Set(scopedFees.map((fee: any) => fee.player_id).filter(Boolean)).size;
    const presentCount = scopedAttendance.filter((row: any) => row.status === 'present').length;
    const absentCount = scopedAttendance.filter((row: any) => row.status === 'absent').length;

    const newStats = {
      branchName: branchNames,
      activePlayers: playersData?.length || 0,
      unpaidPlayersCount,
      presentCount,
      absentCount,
    };

    setStats(newStats);
    if (cacheKey) {
      clientCache.set(cacheKey, newStats);
    }
    setIsLoading(false);
  }, [profile, today, cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-green-500 uppercase tracking-wider">Coach Overview</p>
        <h1 className="text-4xl font-bold text-white">Welcome back, {profile?.full_name || 'Coach'}</h1>
        <p className="text-base text-gray-400">Here is a snapshot for {stats.branchName}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/10 p-16">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500/20 border-t-green-500" />
            <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full border-4 border-green-500/10" />
          </div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Active Players"
              value={stats.activePlayers}
              icon={Users}
              iconColor="text-green-500"
            />
            <StatCard
              title="Unpaid Players"
              value={stats.unpaidPlayersCount}
              icon={IndianRupee}
              iconColor="text-amber-500"
            />
            <StatCard
              title="Present Today"
              value={stats.presentCount}
              icon={CheckCircle2}
              iconColor="text-blue-500"
            />
            <StatCard
              title="Absent Today"
              value={stats.absentCount}
              icon={CalendarDays}
              iconColor="text-red-500"
            />
          </div>

          {/* Fee Reminders */}
          {profile && <FeeReminders userId={profile.id} compact />}

          {/* Quick Actions Card */}
          <GlassCard title="What you can do next" className="relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <ul className="relative space-y-4">
              <li className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-all group">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Mark today's attendance</p>
                  <p className="text-xs text-gray-400 mt-1">Keep track of your players' presence</p>
                </div>
              </li>

              <li className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-all group">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <IndianRupee className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Review fee records</p>
                  <p className="text-xs text-gray-400 mt-1">Update and manage payment status for your branch</p>
                </div>
              </li>

              <li className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-all group">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CalendarDays className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Monitor pending dues</p>
                  <p className="text-xs text-gray-400 mt-1">Keep an eye on outstanding payments for better follow-up</p>
                </div>
              </li>
            </ul>
          </GlassCard>
        </>
      )}
    </div>
  );
}
