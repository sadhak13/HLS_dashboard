"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { FeeTable } from '@/components/admin/FeeTable';
import { AddFeeModal } from '@/components/admin/AddFeeModal';
import { EditFeeModal, FeeRecord } from '@/components/admin/EditFeeModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { IndianRupee, Plus, TrendingUp, Clock, AlertCircle, Zap, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { generateNextMonthFeesForAllBranches } from '@/app/(admin)/fees/actions';
import { format, addMonths, subMonths, isAfter, startOfMonth } from 'date-fns';
import XLSX from 'xlsx-js-style';

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
  const { showToast } = useToast();
  // Month Selection State
  const [currentMonthDate, setCurrentMonthDate] = useState(() => startOfMonth(new Date()));
  const maxMonth = useMemo(() => startOfMonth(addMonths(new Date(), 1)), []);
  const selectedMonthStr = format(currentMonthDate, 'yyyy-MM');
  const selectedMonthDisplay = format(currentMonthDate, 'MMMM yyyy');

  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterBatch, setFilterBatch] = useState('all');
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string; branch_id: string }[]>([]);
  const [isGeneratingFees, setIsGeneratingFees] = useState(false);
  const [generateMessage, setGenerateMessage] = useState('');
  const [editingFee, setEditingFee] = useState<FeeRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [markPaidFeeId, setMarkPaidFeeId] = useState<string | null>(null);
  const [markPaidMode, setMarkPaidMode] = useState<'cash' | 'online' | 'cash+online'>('cash');
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Stats are fetched separately to avoid coupling with pagination
  const [stats, setStats] = useState({ collected: 0, pending: 0, overdue: 0 });
  const [isExporting, setIsExporting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const fetchFilters = async () => {
      const { data: branchData } = await supabase.from('branches').select('id, name').order('name');
      if (branchData) setBranches(branchData);

      const { data: batchData } = await (supabase as any).from('batches').select('id, name, branch_id').order('name');
      if (batchData) setBatches(batchData);
    };
    fetchFilters();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFees = useCallback(async (page: number, status: string, branch: string, batch: string) => {
    setIsLoading(true);
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const selectStr = batch !== 'all'
      ? '*, players!inner (full_name, branch_id, batch_id), branches (name)'
      : '*, players (full_name, branch_id, batch_id), branches (name)';

    let query = supabase
      .from('fees')
      .select(selectStr, { count: 'exact' })
      .eq('month', selectedMonthStr)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (branch !== 'all') {
      query = query.eq('branch_id', branch);
    }

    if (batch !== 'all') {
      query = query.eq('players.batch_id', batch);
    }

    const { data, error, count } = await query;

    if (error) {
      showToast('Failed to load fee records.');
    } else if (data) {
      setFees(data as FeeRecord[]);
      setTotalCount(count ?? 0);
    }
    setIsLoading(false);
  }, [selectedMonthStr]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStats = useCallback(async (branch: string, batch: string) => {
    const selectStr = batch !== 'all'
      ? 'status, amount, players!inner (batch_id)'
      : 'status, amount';

    let query = supabase
      .from('fees')
      .select(selectStr)
      .eq('month', selectedMonthStr);

    if (branch !== 'all') {
      query = query.eq('branch_id', branch);
    }

    if (batch !== 'all') {
      query = query.eq('players.batch_id', batch);
    }

    const { data } = await query as { data: { status: string; amount: number }[] | null };

    if (data) {
      const collected = data.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0);
      const pending = data.filter(f => f.status === 'pending').reduce((s, f) => s + f.amount, 0);
      const overdue = data.filter(f => f.status === 'overdue').reduce((s, f) => s + f.amount, 0);
      setStats({ collected, pending, overdue });
    }
  }, [selectedMonthStr]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchFees(currentPage, filterStatus, filterBranch, filterBatch);
    fetchStats(filterBranch, filterBatch);
  }, [fetchFees, fetchStats, currentPage, filterStatus, filterBranch, filterBatch]);

  const handleMarkPaidClick = (feeId: string) => {
    setMarkPaidFeeId(feeId);
    setMarkPaidMode('cash');
  };

  const handleConfirmMarkPaid = async () => {
    if (!markPaidFeeId) return;
    setIsMarkingPaid(true);

    const { error } = await (supabase as any)
      .from('fees')
      .update({
        status: 'paid',
        mode_of_payment: markPaidMode,
        paid_date: new Date().toISOString(),
      })
      .eq('id', markPaidFeeId);

    if (!error) {
      fetchFees(currentPage, filterStatus, filterBranch, filterBatch);
      fetchStats(filterBranch, filterBatch);
    }
    setIsMarkingPaid(false);
    setMarkPaidFeeId(null);
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
        fetchFees(currentPage, filterStatus, filterBranch, filterBatch);
        fetchStats(filterBranch, filterBatch);
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

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleFilterChange = (s: 'all' | 'paid' | 'pending' | 'overdue') => {
    setFilterStatus(s);
    setCurrentPage(1);
  };

  const handleBranchChange = (branchId: string) => {
    setFilterBranch(branchId);
    setFilterBatch('all');
    setCurrentPage(1);
  };

  const handleBatchChange = (batchId: string) => {
    setFilterBatch(batchId);
    setCurrentPage(1);
  };

  const handleExportExcel = async () => {
    setIsExporting(true);

    try {
      let query = (supabase as any)
        .from('fees')
        .select('amount, status, mode_of_payment, paid_date, players (full_name, parent_phone, date_of_birth, batch_id, batches (name)), branches (name)')
        .eq('month', selectedMonthStr)
        .order('created_at', { ascending: true });

      if (filterBranch !== 'all') {
        query = query.eq('branch_id', filterBranch);
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        showToast(error ? 'Failed to fetch data for export.' : 'No records to export.');
        setIsExporting(false);
        return;
      }

      const headerCols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      const workbook = XLSX.utils.book_new();

      const buildSheet = (fees: any[]) => {
        const rows = fees.map((fee: any, index: number) => ({
          'S.No': index + 1,
          'Player Name': fee.players?.full_name ?? '—',
          'Phone Number': fee.players?.parent_phone ?? '—',
          'Date of Birth': fee.players?.date_of_birth
            ? new Date(fee.players.date_of_birth).toLocaleDateString('en-IN')
            : '—',
          'Batch': fee.players?.batches?.name ?? '—',
          'Branch': fee.branches?.name ?? '—',
          'Amount (₹)': fee.amount,
          'Status': fee.status.charAt(0).toUpperCase() + fee.status.slice(1),
          'Mode of Payment': fee.mode_of_payment
            ? fee.mode_of_payment === 'cash+online' ? 'Cash + Online' : fee.mode_of_payment.charAt(0).toUpperCase() + fee.mode_of_payment.slice(1)
            : '—',
          'Paid On': fee.paid_date
            ? new Date(fee.paid_date).toLocaleDateString('en-IN')
            : '—',
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);
        headerCols.forEach(col => {
          const cell = worksheet[`${col}1`];
          if (cell) cell.s = { font: { bold: true } };
        });
        return worksheet;
      };

      if (filterBranch === 'all') {
        const grouped: Record<string, any[]> = {};
        data.forEach((fee: any) => {
          const name = fee.branches?.name ?? 'Unknown';
          if (!grouped[name]) grouped[name] = [];
          grouped[name].push(fee);
        });

        Object.entries(grouped).forEach(([branchName, fees]) => {
          const sheet = buildSheet(fees);
          XLSX.utils.book_append_sheet(workbook, sheet, branchName.substring(0, 31));
        });
      } else {
        const branchName = branches.find(b => b.id === filterBranch)?.name ?? 'Branch';
        const sheet = buildSheet(data);
        XLSX.utils.book_append_sheet(workbook, sheet, branchName.substring(0, 31));
      }

      const statusLabel = filterStatus === 'all' ? '' : `_${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}`;
      const branchLabel = filterBranch === 'all' ? 'All_Branches' : (branches.find(b => b.id === filterBranch)?.name ?? 'Branch').replace(/\s+/g, '_');
      const fileName = `Fees_Report_${selectedMonthDisplay.replace(' ', '_')}_${branchLabel}${statusLabel}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      showToast('Failed to generate Excel report.');
    }

    setIsExporting(false);
  };

  const branchBatches = filterBranch === 'all'
    ? []
    : batches.filter((b) => b.branch_id === filterBranch);
  const showBatchFilter = branchBatches.length > 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fee Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">Track monthly fee collection across all branches.</p>
          </div>

          {/* Desktop action buttons */}
          <div className="hidden sm:flex gap-2">
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
            <Button onClick={handleExportExcel} isLoading={isExporting} variant="secondary" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Download Excel
            </Button>
          </div>
        </div>

        {/* Month Navigation & Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
            <Button variant="ghost" onClick={handlePrevMonth} className="p-2 h-auto">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-xs sm:text-sm font-medium min-w-[90px] sm:min-w-[120px] text-center text-gray-900 dark:text-white">
              {selectedMonthDisplay}
            </div>
            <Button variant="ghost" onClick={handleNextMonth} disabled={isNextDisabled} className="p-2 h-auto">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <select
            value={filterBranch}
            onChange={(e) => handleBranchChange(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 cursor-pointer"
          >
            <option value="all">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {showBatchFilter && (
            <select
              value={filterBatch}
              onChange={(e) => handleBatchChange(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 cursor-pointer"
            >
              <option value="all">All Batches</option>
              {branchBatches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Mobile action buttons */}
        <div className="flex sm:hidden gap-2">
          <Button onClick={() => setIsModalOpen(true)} size="sm" className="gap-1.5 flex-1">
            <Plus className="w-3.5 h-3.5" />
            Create
          </Button>
          {canGenerate && (
            <Button onClick={handleGenerateNextMonthFees} isLoading={isGeneratingFees} variant="secondary" size="sm" className="gap-1.5 flex-1">
              <Zap className="w-3.5 h-3.5" />
              Generate
            </Button>
          )}
          <Button onClick={handleExportExcel} isLoading={isExporting} variant="secondary" size="sm" className="gap-1.5 flex-1">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel
          </Button>
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
          value={`₹${stats.collected.toLocaleString('en-IN')}`}
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          color="bg-green-100 dark:bg-green-900/30"
        />
        <StatCard
          label="Pending"
          value={`₹${stats.pending.toLocaleString('en-IN')}`}
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          color="bg-amber-100 dark:bg-amber-900/30"
        />
        <StatCard
          label="Overdue"
          value={`₹${stats.overdue.toLocaleString('en-IN')}`}
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
        {totalCount === 0 && !isLoading ? (
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
            fees={fees}
            isLoading={isLoading}
            onMarkPaid={handleMarkPaidClick}
            onEdit={(fee) => {
              setEditingFee(fee);
              setIsEditModalOpen(true);
            }}
          />
        )}
        {totalCount > 0 && !isLoading && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalCount}
            itemsPerPage={ITEMS_PER_PAGE}
            itemLabel="records"
          />
        )}
      </div>

      <AddFeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => { fetchFees(currentPage, filterStatus, filterBranch, filterBatch); fetchStats(filterBranch, filterBatch); }}
      />

      <EditFeeModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingFee(null);
        }}
        onSuccess={() => { fetchFees(currentPage, filterStatus, filterBranch, filterBatch); fetchStats(filterBranch, filterBatch); }}
        fee={editingFee}
      />

      {/* Mark Paid modal */}
      <Modal
        isOpen={!!markPaidFeeId}
        onClose={() => setMarkPaidFeeId(null)}
        title="Mark as Paid"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Select the payment mode used by the player.</p>
          <div className="grid grid-cols-3 gap-2">
            {(['cash', 'online', 'cash+online'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setMarkPaidMode(mode)}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium capitalize transition-colors border ${
                  markPaidMode === mode
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                }`}
              >
                {mode === 'cash+online' ? 'Cash + Online' : mode}
              </button>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setMarkPaidFeeId(null)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirmMarkPaid}
              isLoading={isMarkingPaid}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
