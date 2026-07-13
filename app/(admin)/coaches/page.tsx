"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { CoachTable } from '@/components/admin/CoachTable';
import { AddCoachModal } from '@/components/admin/AddCoachModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const supabase = createClient();

  const fetchCoaches = useCallback(async () => {
    setIsLoading(true);
    // Fetch coaches and join with profiles and branches
    const { data, error } = await supabase
      .from('coaches')
      .select(`
        *,
        profiles (full_name),
        branches (name, location)
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
          <p className="text-sm text-gray-500 dark:text-gray-400">Provision accounts and assign coaches to branches.</p>
        </div>
        {(coaches.length > 0 || isLoading) && (
          <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto shrink-0">
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
              description="Provision your first coach account to give them access to their assigned branch."
              action={
                <Button onClick={() => setIsModalOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Provision Coach
                </Button>
              }
            />
          </div>
        ) : (
          <CoachTable coaches={coaches} isLoading={isLoading} />
        )}
      </div>

      <AddCoachModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchCoaches}
      />
    </div>
  );
}
