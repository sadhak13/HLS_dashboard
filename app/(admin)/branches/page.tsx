"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { BranchTable } from '@/components/admin/BranchTable';
import { AddBranchModal } from '@/components/admin/AddBranchModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { MapPin, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';

type Branch = Database['public']['Tables']['branches']['Row'];

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const supabase = createClient();

  const fetchBranches = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (data && !error) {
      setBranches(data);
    }
    setIsLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Academy Branches</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage all your training locations and centers.</p>
        </div>
        {(branches.length > 0 || isLoading) && (
          <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Add Branch
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {branches.length === 0 && !isLoading ? (
          <div className="p-8">
            <EmptyState 
              icon={<MapPin className="w-6 h-6" />}
              title="No branches found"
              description="Get started by adding your first football academy branch location."
              action={
                <Button onClick={() => setIsModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Branch
                </Button>
              }
            />
          </div>
        ) : (
          <BranchTable branches={branches} isLoading={isLoading} />
        )}
      </div>

      <AddBranchModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchBranches}
      />
    </div>
  );
}
