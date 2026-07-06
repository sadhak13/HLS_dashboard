"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Users, IndianRupee, CalendarDays, CheckCircle2 } from 'lucide-react';

interface CoachDashboardStats {
  branchName: string;
  activePlayers: number;
  pendingAmount: number;
  presentCount: number;
  absentCount: number;
}

export default function CoachDashboardPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [stats, setStats] = useState<CoachDashboardStats>({
    branchName: 'Your branch',
    activePlayers: 0,
    pendingAmount: 0,
    presentCount: 0,
    absentCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  const fetchSummary = useCallback(async () => {
    if (!profile) return;
    setIsLoading(true);

    const { data: rpcBranchId, error: rpcError } = await supabase.rpc('get_coach_branch_id');

    let branchId: string = (rpcBranchId as any) as string;
    
    if (rpcError || !branchId) {
      console.warn('RPC failed or returned null, falling back to direct table query...', rpcError);
      const { data: coachData } = await (supabase as any)
        .from('coaches')
        .select('branch_id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!coachData) {
        setIsLoading(false);
        return;
      }
      branchId = coachData.branch_id;
    }

    const [{ data: branchData }, { data: playersData }, { data: feesData }, { data: attendanceData }] = await Promise.all([
      (supabase as any).from('branches').select('name').eq('id', branchId).single(),
      (supabase as any).from('players').select('id').eq('branch_id', branchId).eq('status', 'active'),
      (supabase as any).from('fees').select('amount,status').eq('branch_id', branchId).in('status', ['pending', 'overdue']),
      (supabase as any).from('attendance').select('status').eq('branch_id', branchId).eq('date', today),
    ]);

    const pendingAmount = (feesData ?? []).reduce((sum: number, fee: any) => sum + Number(fee.amount || 0), 0);
    const presentCount = (attendanceData ?? []).filter((row: any) => row.status === 'present').length;
    const absentCount = (attendanceData ?? []).filter((row: any) => row.status === 'absent').length;

    setStats({
      branchName: branchData?.name || 'Your branch',
      activePlayers: playersData?.length || 0,
      pendingAmount,
      presentCount,
      absentCount,
    });
    setIsLoading(false);
  }, [profile, supabase, today]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-green-600">Coach overview</p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back, {profile?.full_name || 'Coach'}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Here is a snapshot for {stats.branchName}.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-10 dark:border-gray-700 dark:bg-gray-800">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-sm text-gray-500">Active players</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.activePlayers}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <IndianRupee className="h-5 w-5" />
              </div>
              <p className="text-sm text-gray-500">Pending fees</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">₹{stats.pendingAmount.toLocaleString('en-IN')}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-sm text-gray-500">Present today</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.presentCount}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                <CalendarDays className="h-5 w-5" />
              </div>
              <p className="text-sm text-gray-500">Absent today</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.absentCount}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">What you can do next</h2>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• Mark today's attendance for your players.</li>
              <li>• Review and update fee records for your branch.</li>
              <li>• Keep an eye on pending dues to support better follow-up.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
