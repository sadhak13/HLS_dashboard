"use client";

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { FeeTable } from '@/components/admin/FeeTable';
import { EditFeeModal, FeeRecord } from '@/components/admin/EditFeeModal';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { IndianRupee, PlusCircle, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { generateNextMonthFeesForBranch } from '@/app/(admin)/fees/actions';
import { format, addMonths, subMonths, isAfter, startOfMonth } from 'date-fns';

export default function MyFeesPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  
  // Month Selection State
  const [currentMonthDate, setCurrentMonthDate] = useState(() => startOfMonth(new Date()));
  const maxMonth = useMemo(() => startOfMonth(addMonths(new Date(), 1)), []);
  const selectedMonthStr = format(currentMonthDate, 'yyyy-MM');
  const selectedMonthDisplay = format(currentMonthDate, 'MMMM yyyy');

  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [isGeneratingFees, setIsGeneratingFees] = useState(false);
  const [generateMessage, setGenerateMessage] = useState('');
  const [editingFee, setEditingFee] = useState<FeeRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const fetchFees = useCallback(async () => {
    if (!profile) return;
    setIsLoading(true);

    // Try using the RPC function first
    const { data: rpcBranchId, error: rpcError } = await supabase.rpc('get_coach_branch_id');

    let resolvedBranchId: string = (rpcBranchId as any) as string;
    
    if (rpcError || !resolvedBranchId) {
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
      resolvedBranchId = coachData.branch_id;
    }

    setBranchId(resolvedBranchId as string);

    const { data } = await (supabase as any)
      .from('fees')
      .select(`*, players(full_name, branch_id), branches(name)`)
      .eq('branch_id', resolvedBranchId)
      .eq('month', selectedMonthStr)
      .order('created_at', { ascending: false });

    setFees((data as FeeRecord[]) ?? []);
    setIsLoading(false);
  }, [profile, supabase, selectedMonthStr]);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const handleMarkPaid = async (feeId: string) => {
    if (!branchId) return;

    const { error } = await (supabase as any)
      .from('fees')
      .update({ status: 'paid', paid_date: new Date().toISOString() })
      .eq('id', feeId)
      .eq('branch_id', branchId);

    if (!error) {
      fetchFees();
    }
  };

  const handleGenerateNextMonthFees = async () => {
    if (!branchId) return;

    setIsGeneratingFees(true);
    setGenerateMessage('');

    const result = await generateNextMonthFeesForBranch(branchId, selectedMonthStr);

    if (result.error) {
      setGenerateMessage(`Error: ${result.error}`);
    } else if (result.message) {
      setGenerateMessage(result.message);
    } else {
      setGenerateMessage(`✓ Successfully created fees for ${result.createdCount} players in ${selectedMonthDisplay}`);
      setTimeout(() => {
        setGenerateMessage('');
        fetchFees();
      }, 2000);
    }

    setIsGeneratingFees(false);
  };

  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => {
      const next = addMonths(prev, 1);
      if (isAfter(next, maxMonth)) return prev;
      return next;
    });
  };

  const currentSystemMonthStr = format(new Date(), 'yyyy-MM');
  const canGenerate = selectedMonthStr >= currentSystemMonthStr;
  const isNextDisabled = isAfter(addMonths(currentMonthDate, 1), maxMonth);

  const paidTotal = fees.filter((fee) => fee.status === 'paid').reduce((sum, fee) => sum + fee.amount, 0);
  const pendingTotal = fees.filter((fee) => fee.status !== 'paid').reduce((sum, fee) => sum + fee.amount, 0);

  const totalPages = Math.ceil(fees.length / ITEMS_PER_PAGE);
  const paginatedFees = fees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-green-600">Your branch fees</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fee tracking</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">See the fee status for players in your branch.</p>
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
          <Button variant="ghost" onClick={handlePrevMonth} className="p-2 h-auto">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-sm font-medium min-w-[120px] text-center text-gray-900 dark:text-white">
            {selectedMonthDisplay}
          </div>
          <Button variant="ghost" onClick={handleNextMonth} disabled={isNextDisabled} className="p-2 h-auto">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {canGenerate && (
          <Button onClick={handleGenerateNextMonthFees} isLoading={isGeneratingFees} variant="secondary" className="gap-2">
            <Zap className="w-4 h-4" />
            Generate {selectedMonthDisplay}
          </Button>
        )}
      </div>

      {generateMessage && (
        <div
          className={`p-4 rounded-lg text-sm font-medium ${
            generateMessage.startsWith('Error')
              ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
          }`}
        >
          {generateMessage}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <IndianRupee className="h-5 w-5" />
          </div>
          <p className="text-sm text-gray-500">Paid in {selectedMonthDisplay}</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">₹{paidTotal.toLocaleString('en-IN')}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <PlusCircle className="h-5 w-5" />
          </div>
          <p className="text-sm text-gray-500">Pending / overdue</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">₹{pendingTotal.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {fees.length === 0 && !isLoading ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500">No fee records found for {selectedMonthDisplay}.</p>
          </div>
        ) : (
          <FeeTable
            fees={paginatedFees}
            isLoading={isLoading}
            onMarkPaid={handleMarkPaid}
            onEdit={(fee) => {
              setEditingFee(fee);
              setIsEditModalOpen(true);
            }}
          />
        )}
        {fees.length > 0 && !isLoading && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={fees.length}
            itemsPerPage={ITEMS_PER_PAGE}
            itemLabel="records"
          />
        )}
      </div>

      <EditFeeModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingFee(null);
        }}
        onSuccess={fetchFees}
        fee={editingFee}
      />
    </div>
  );
}
