"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { CoachTable } from '@/components/admin/CoachTable';
import { AddCoachModal } from '@/components/admin/AddCoachModal';
import { EditCoachModal } from '@/components/admin/EditCoachModal';
import { TransferBatchesModal } from '@/components/admin/TransferBatchesModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<any | null>(null);
  const [transferringCoach, setTransferringCoach] = useState<any | null>(null);

  const supabase = createClient();

  const fetchCoaches = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await (supabase as any)
      .from('coaches')
      .select(`
        *,
        profiles (full_name),
        branches (name, location),
        coach_batches (
          id,
          batch_id,
          batches (name, start_time, end_time, branches (name))
        )
      `)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setCoaches(data);
    }
    setIsLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCoaches();
  }, [fetchCoaches]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Coach Directory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Provision accounts, edit details, and manage coach assignments.</p>
        </div>
        {(coaches.length > 0 || isLoading) && (
          <Button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto shrink-0">
            <UserPlus className="w-4 h-4 mr-2" />
            Provision Account
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {coaches.length === 0 && !isLoading ? (
          <div className="p-8">
            <EmptyState
              icon={<UserPlus className="w-6 h-6" />}
              title="No coaches found"
              description="Provision your first coach account to give them access to their assigned batches."
              action={
                <Button onClick={() => setIsAddModalOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Provision Coach
                </Button>
              }
            />
          </div>
        ) : (
          <CoachTable
            coaches={coaches}
            isLoading={isLoading}
            onEdit={(coach) => setEditingCoach(coach)}
            onTransfer={(coach) => setTransferringCoach(coach)}
          />
        )}
      </div>

      <AddCoachModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchCoaches}
      />

      <EditCoachModal
        isOpen={!!editingCoach}
        onClose={() => setEditingCoach(null)}
        onSuccess={fetchCoaches}
        coach={editingCoach}
      />

      <TransferBatchesModal
        isOpen={!!transferringCoach}
        onClose={() => setTransferringCoach(null)}
        onSuccess={fetchCoaches}
        sourceCoach={transferringCoach}
        coaches={coaches}
      />
    </div>
  );
}
