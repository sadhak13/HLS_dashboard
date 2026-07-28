"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Bell, Phone } from 'lucide-react';
import { getCoachBranches, getCoachBatchInfo } from '@/lib/coach';

interface PendingFeePlayer {
  playerName: string;
  amount: number;
  parentPhone: string;
  dueDate: number;
  daysLeft: number;
}

function getDueDate(enrolledDate: string): number {
  const day = new Date(enrolledDate).getDate();
  return day <= 14 ? 15 : 20;
}

interface FeeRemindersProps {
  userId: string;
  compact?: boolean;
}

export function FeeReminders({ userId, compact = false }: FeeRemindersProps) {
  const supabase = createClient();
  const [reminders, setReminders] = useState<PendingFeePlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReminders = useCallback(async () => {
    setIsLoading(true);

    const [branches, batchInfo] = await Promise.all([
      getCoachBranches(userId),
      getCoachBatchInfo(userId),
    ]);

    if (branches.length === 0) {
      setIsLoading(false);
      return;
    }

    const branchIds = branches.map(b => b.id);
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const { data: fees } = await (supabase as any)
      .from('fees')
      .select('amount, players (full_name, parent_phone, enrolled_date, batch_id)')
      .in('branch_id', branchIds)
      .eq('month', currentMonth)
      .eq('status', 'pending');

    if (!fees || fees.length === 0) {
      setReminders([]);
      setIsLoading(false);
      return;
    }

    // Filter to this coach's batches if they have batch assignments
    const batchSet = (!batchInfo.isBranchFallback && batchInfo.batchIds.length > 0)
      ? new Set(batchInfo.batchIds)
      : null;

    const pending: PendingFeePlayer[] = [];

    for (const fee of fees) {
      if (!fee.players) continue;
      // Skip players not in this coach's batches
      if (batchSet && (!fee.players.batch_id || !batchSet.has(fee.players.batch_id))) continue;

      const dueDate = getDueDate(fee.players.enrolled_date);
      const daysLeft = dueDate - currentDay;

      if (daysLeft <= 5) {
        pending.push({
          playerName: fee.players.full_name,
          amount: fee.amount,
          parentPhone: fee.players.parent_phone,
          dueDate,
          daysLeft: Math.max(0, daysLeft),
        });
      }
    }

    pending.sort((a, b) => a.daysLeft - b.daysLeft);
    setReminders(pending);
    setIsLoading(false);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  if (isLoading || reminders.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-amber-500/20 overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-white/10 flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Bell className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Fee Reminders</h3>
          <p className="text-xs text-gray-400">{reminders.length} player{reminders.length > 1 ? 's' : ''} with upcoming dues</p>
        </div>
      </div>

      <div className={`divide-y divide-white/5 ${compact ? 'max-h-64 overflow-y-auto' : ''}`}>
        {reminders.map((r, i) => (
          <div key={i} className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white truncate">{r.playerName}</p>
                {r.daysLeft === 0 ? (
                  <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                    Due today
                  </span>
                ) : r.daysLeft <= 2 ? (
                  <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {r.daysLeft}d left
                  </span>
                ) : (
                  <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-gray-400 border border-white/10">
                    {r.daysLeft}d left
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Phone className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-400">{r.parentPhone}</span>
              </div>
            </div>
            <p className="text-sm font-semibold text-white shrink-0">₹{r.amount.toLocaleString('en-IN')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
