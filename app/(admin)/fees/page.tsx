"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { FeeTable } from '@/components/admin/FeeTable';
import { AddFeeModal } from '@/components/admin/AddFeeModal';
import { EditFeeModal, FeeRecord } from '@/components/admin/EditFeeModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { IndianRupee, Plus, TrendingUp, Clock, AlertCircle, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { generateNextMonthFeesForAllBranches } from '@/app/(admin)/fees/actions';
import { format, addMonths, subMonths, isAfter, startOfMonth } from 'date-fns';

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

export default function FeesPage() {
  // Month Selection State
  const [currentMonthDate, setCurrentMonthDate] = useState(() => startOfMonth(new Date()));
  const maxMonth = useMemo(() => startOfMonth(addMonths(new Date(), 1)), []);
  const selectedMonthStr = format(currentMonthDate, 'yyyy-MM');
  const selectedMonthDisplay = format(currentMonthDate, 'MMMM yyyy');

  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [isGeneratingFees, setIsGeneratingFees] = useState(false);
  const [generateMessage, setGenerateMessage] = useState('');
  const [editingFee, setEditingFee] = useState<FeeRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const supabase = createClient();

  const fetchFees = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('fees')
      .select(`
        *,
        players (full_name, branch_id),
        branches (name)
      `)
      .eq('month', selectedMonthStr)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setFees(data as FeeRecord[]);
    }
    setIsLoading(false);
  }, [selectedMonthStr]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const handleMarkPaid = async (feeId: string) => {
    const { error } = await (supabase as any)
      .from('fees')
      .update({
        status: 'paid',
        paid_date: new Date().toISOString(),
      })
      .eq('id', feeId);

    if (!error) {
      fetchFees();
    }
  };

  const handleGenerateNextMonthFees = async () => {
    setIsGeneratingFees(true);
    setGenerateMessage('');

    const result = await generateNextMonthFeesForAllBranches(selectedMonthStr);

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

  // Only show generate button for current or next month
  const currentSystemMonthStr = format(new Date(), 'yyyy-MM');
  const canGenerate = selectedMonthStr >= currentSystemMonthStr;
  const isNextDisabled = isAfter(addMonths(currentMonthDate, 1), maxMonth);

  // Summary stats
  const totalCollected = fees.filter((f) => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
  const totalPending = fees.filter((f) => f.status === 'pending').reduce((sum, f) => sum + f.amount, 0);
  const totalOverdue = fees.filter((f) => f.status === 'overdue').reduce((sum, f) => sum + f.amount, 0);

  const filteredFees = filterStatus === 'all' ? fees : fees.filter((f) => f.status === filterStatus);

  const totalPages = Math.ceil(filteredFees.length / ITEMS_PER_PAGE);
  const paginatedFees = filteredFees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleFilterChange = (s: 'all' | 'paid' | 'pending' | 'overdue') => {
    setFilterStatus(s);
    setCurrentPage(1); // reset page when filter changes
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fee Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Track monthly fee collection across all branches.</p>
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

        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Fee
          </Button>
          {canGenerate && (
            <Button onClick={handleGenerateNextMonthFees} isLoading={isGeneratingFees} variant="secondary" className="gap-2">
              <Zap className="w-4 h-4" />
              Generate {selectedMonthDisplay}
            </Button>
          )}
        </div>
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Collected"
          value={`₹${totalCollected.toLocaleString('en-IN')}`}
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          color="bg-green-100 dark:bg-green-900/30"
        />
        <StatCard
          label="Pending"
          value={`₹${totalPending.toLocaleString('en-IN')}`}
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          color="bg-amber-100 dark:bg-amber-900/30"
        />
        <StatCard
          label="Overdue"
          value={`₹${totalOverdue.toLocaleString('en-IN')}`}
          icon={<AlertCircle className="w-5 h-5 text-red-600" />}
          color="bg-red-100 dark:bg-red-900/30"
        />
      </div>

      {/* Filter tabs */}
      {fees.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(['all', 'paid', 'pending', 'overdue'] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleFilterChange(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                filterStatus === s
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {fees.length === 0 && !isLoading ? (
          <div className="p-8">
            <EmptyState
              icon={<IndianRupee className="w-6 h-6" />}
              title={`No fees for ${selectedMonthDisplay}`}
              description={canGenerate ? "Generate fees for this month or manually create one." : "No records found for this past month."}
              action={
                canGenerate ? (
                  <Button onClick={handleGenerateNextMonthFees} isLoading={isGeneratingFees}>
                    <Zap className="w-4 h-4 mr-2" />
                    Generate Fees
                  </Button>
                ) : (
                  <Button onClick={() => setIsModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Fee Record
                  </Button>
                )
              }
            />
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
        {filteredFees.length > 0 && !isLoading && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredFees.length}
            itemsPerPage={ITEMS_PER_PAGE}
            itemLabel="records"
          />
        )}
      </div>

      <AddFeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchFees}
      />

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
