"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { ManagerTable } from '@/components/admin/ManagerTable';
import { AddManagerModal } from '@/components/admin/AddManagerModal';
import { EditManagerModal } from '@/components/admin/EditManagerModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ManagersPage() {
  const [managers, setManagers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<any | null>(null);

  const supabase = createClient();

  const fetchManagers = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await (supabase as any)
      .from('managers')
      .select(`
        *,
        profiles (full_name),
        branches (name, location)
      `)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setManagers(data);
    } else if (error) {
      console.error('Failed to fetch managers:', error);
    }
    setIsLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manager Directory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Provision accounts and edit branch managers.</p>
        </div>
        {(managers.length > 0 || isLoading) && (
          <Button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto shrink-0">
            <UserPlus className="w-4 h-4 mr-2" />
            Provision Account
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {managers.length === 0 && !isLoading ? (
          <div className="p-8">
            <EmptyState
              icon={<UserPlus className="w-6 h-6" />}
              title="No managers found"
              description="Provision your first manager account to give them oversight of a branch."
              action={
                <Button onClick={() => setIsAddModalOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Provision Manager
                </Button>
              }
            />
          </div>
        ) : (
          <ManagerTable
            managers={managers}
            isLoading={isLoading}
            onEdit={(manager) => setEditingManager(manager)}
          />
        )}
      </div>

      <AddManagerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchManagers}
      />

      <EditManagerModal
        isOpen={!!editingManager}
        onClose={() => setEditingManager(null)}
        onSuccess={fetchManagers}
        manager={editingManager}
      />
    </div>
  );
}
