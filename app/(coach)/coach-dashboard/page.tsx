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
import { ROLE_LABELS, ROLES } from '@/constants/roles';

interface BatchPlayerCount {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  count: number;
}

interface CoachDashboardStats {
  branchName: string;
  activePlayers: number;
  unpaidPlayersCount: number;
  presentCount: number;
  absentCount: number;
  batchCounts: BatchPlayerCount[];
}

function formatTime(time: string) {
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
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
      batchCounts: [],
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
      getCoachBranches(profile.id, profile.role),
      getCoachBatchInfo(profile.id, profile.role),
    ]);

    if (branches.length === 0) {
      setIsLoading(false);
      return;
    }

    const branchIds = branches.map(b => b.id);
    const branchNames = branches.map(b => b.name).join(', ');
    const hasBatches = !batchInfo.isBranchFallback && batchInfo.batchIds.length > 0;

    // Build player query — scoped to batches if available, else branch
    let playersQuery = (supabase as any).from('players').select('id, batch_id').eq('status', 'active');
    if (hasBatches) {
      playersQuery = playersQuery.in('batch_id', batchInfo.batchIds);
    } else {
      playersQuery = playersQuery.in('branch_id', branchIds);
    }

    // Batches in scope — the specific assigned batches, or every batch in the branch(es)
    let batchesQuery = (supabase as any).from('batches').select('id, name, start_time, end_time');
    batchesQuery = hasBatches
      ? batchesQuery.in('id', batchInfo.batchIds)
      : batchesQuery.in('branch_id', branchIds);

    // Fees and attendance still use branch_id (no batch_id on those tables)
    // We'll filter fees client-side by player batch if needed
    const [{ data: playersData }, { data: batchesData }, { data: feesData }, { data: attendanceData }] = await Promise.all([
      playersQuery,
      batchesQuery.order('start_time'),
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

    // Active player count per batch, in schedule order
    const playerCountByBatch = new Map<string, number>();
    for (const player of playersData ?? []) {
      if (!player.batch_id) continue;
      playerCountByBatch.set(player.batch_id, (playerCountByBatch.get(player.batch_id) || 0) + 1);
    }
    const batchCounts: BatchPlayerCount[] = (batchesData ?? []).map((batch: any) => ({
      id: batch.id,
      name: batch.name,
      startTime: batch.start_time,
      endTime: batch.end_time,
      count: playerCountByBatch.get(batch.id) || 0,
    }));

    const newStats = {
      branchName: branchNames,
      activePlayers: playersData?.length || 0,
      unpaidPlayersCount,
      presentCount,
      absentCount,
      batchCounts,
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
        <p className="text-sm font-semibold text-green-500 uppercase tracking-wider">{ROLE_LABELS[profile?.role ?? ROLES.COACH]} Overview</p>
        <h1 className="text-4xl font-bold text-white">Welcome back, {profile?.full_name || ROLE_LABELS[profile?.role ?? ROLES.COACH]}</h1>
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

          {/* Players by Batch */}
          {stats.batchCounts.length > 0 && (
            <GlassCard title="Players by Batch">
              <ul className="divide-y divide-white/10">
                {stats.batchCounts.map((batch) => (
                  <li key={batch.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-white">{batch.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatTime(batch.startTime)} – {formatTime(batch.endTime)}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                      {batch.count}
                    </span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          )}

          {/* Fee Reminders */}
          {profile && <FeeReminders userId={profile.id} role={profile.role} compact />}

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
