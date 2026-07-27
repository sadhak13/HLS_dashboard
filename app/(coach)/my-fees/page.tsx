"use client";

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { FeeTable } from '@/components/admin/FeeTable';
import { EditFeeModal, FeeRecord } from '@/components/admin/EditFeeModal';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { IndianRupee, Zap, ChevronLeft, ChevronRight, TrendingUp, Clock } from 'lucide-react';
import { FeeReminders } from '@/components/coach/FeeReminders';
import { generateFeesForBranches } from '@/app/(admin)/fees/actions';
import { format, addMonths, subMonths, isAfter, startOfMonth } from 'date-fns';
import { getCoachBranches } from '@/lib/coach';

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
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [coachBranches, setCoachBranches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [isGeneratingFees, setIsGeneratingFees] = useState(false);
  const [generateMessage, setGenerateMessage] = useState('');
  const [editingFee, setEditingFee] = useState<FeeRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [markPaidFeeId, setMarkPaidFeeId] = useState<string | null>(null);
  const [markPaidMode, setMarkPaidMode] = useState<'cash' | 'online' | 'cash+online'>('cash');
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const fetchFees = useCallback(async () => {
    if (!profile) return;
    setIsLoading(true);

    const branches = await getCoachBranches(profile.id);

    if (branches.length === 0) {
      setIsLoading(false);
      return;
    }

    const resolvedBranchIds = branches.map(b => b.id);
    setBranchIds(resolvedBranchIds);
    setCoachBranches(branches);

    const { data } = await (supabase as any)
      .from('fees')
      .select(`*, players(full_name, branch_id), branches(name)`)
      .in('branch_id', resolvedBranchIds)
      .eq('month', selectedMonthStr)
      .order('created_at', { ascending: false });

    setFees((data as FeeRecord[]) ?? []);
    setIsLoading(false);
  }, [profile, selectedMonthStr]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const handleMarkPaidClick = (feeId: string) => {
    setMarkPaidFeeId(feeId);
    setMarkPaidMode('cash');
  };

  const handleConfirmMarkPaid = async () => {
    if (!markPaidFeeId || branchIds.length === 0) return;
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
      fetchFees();
    }
    setIsMarkingPaid(false);
    setMarkPaidFeeId(null);
  };

  const handleGenerateNextMonthFees = async () => {
    if (branchIds.length === 0) return;

    setIsGeneratingFees(true);
    setGenerateMessage('');

    const result = await generateFeesForBranches(branchIds, selectedMonthStr);

    if (result.error) {
      setGenerateMessage(`Error: ${result.error}`);
    } else if (result.message) {
      setGenerateMessage(result.message);
    } else {
      setGenerateMessage(`Successfully created fees for ${result.createdCount} players in ${selectedMonthDisplay}`);
      setTimeout(() => {
        setGenerateMessage('');
        fetchFees();
      }, 2000);
    }

    setIsGeneratingFees(false);
  };

  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => subMonths(prev, 1));
    setCurrentPage(1);
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => {
      const next = addMonths(prev, 1);
      if (isAfter(next, maxMonth)) return prev;
      return next;
    });
    setCurrentPage(1);
  };

  const currentSystemMonthStr = format(new Date(), 'yyyy-MM');
  const canGenerate = selectedMonthStr >= currentSystemMonthStr;
  const isNextDisabled = isAfter(addMonths(currentMonthDate, 1), maxMonth);

  const filteredFees = selectedBranchFilter === 'all'
    ? fees
    : fees.filter(fee => fee.players?.branch_id === selectedBranchFilter);

  const paidTotal = filteredFees.filter((fee) => fee.status === 'paid').reduce((sum, fee) => sum + fee.amount, 0);
  const pendingTotal = filteredFees.filter((fee) => fee.status !== 'paid').reduce((sum, fee) => sum + fee.amount, 0);
  const paidCount = filteredFees.filter((fee) => fee.status === 'paid').length;
  const pendingCount = filteredFees.filter((fee) => fee.status !== 'paid').length;

  const totalPages = Math.ceil(filteredFees.length / ITEMS_PER_PAGE);
  const paginatedFees = filteredFees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Fee Tracking</h1>
          <p className="text-sm text-gray-400 mt-1">Track fee status for players in your branch.</p>
        </div>

        {canGenerate && (
          <button
            onClick={handleGenerateNextMonthFees}
            disabled={isGeneratingFees}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-500 shadow-lg shadow-green-500/25 border border-green-500/30 transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            <Zap className="w-4 h-4" />
            {isGeneratingFees ? 'Generating...' : `Generate ${selectedMonthDisplay}`}
          </button>
        )}
      </div>

      {/* Message */}
      {generateMessage && (
        <div
          className={`rounded-xl p-4 text-sm font-medium border ${
            generateMessage.startsWith('Error')
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-green-500/10 border-green-500/20 text-green-400'
          }`}
        >
          {generateMessage}
        </div>
      )}

      {/* Month Navigator */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-green-400" />
            <span className="text-sm sm:text-base font-semibold text-white">{selectedMonthDisplay}</span>
          </div>
          <button
            onClick={handleNextMonth}
            disabled={isNextDisabled}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Branch Filter */}
      {coachBranches.length > 1 && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
          <select
            value={selectedBranchFilter}
            onChange={(e) => { setSelectedBranchFilter(e.target.value); setCurrentPage(1); }}
            className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 appearance-none cursor-pointer"
          >
            <option value="all" className="bg-slate-900">All Branches</option>
            {coachBranches.map(b => (
              <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 shrink-0">
              <IndianRupee className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wider">Collected</p>
              <p className="text-lg sm:text-xl font-bold text-white">₹{paidTotal.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-gray-500">{paidCount} paid</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
              <IndianRupee className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wider">Pending</p>
              <p className="text-lg sm:text-xl font-bold text-white">₹{pendingTotal.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-gray-500">{pendingCount} unpaid</p>
            </div>
          </div>
        </div>
        <div className="hidden sm:block rounded-2xl bg-white/[0.03] border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 shrink-0">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wider">Collection Rate</p>
              <p className="text-lg sm:text-xl font-bold text-white">
                {filteredFees.length > 0 ? Math.round((paidCount / filteredFees.length) * 100) : 0}%
              </p>
              <p className="text-[10px] text-gray-500">{filteredFees.length} total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fee Reminders */}
      {profile && <FeeReminders userId={profile.id} />}

      {/* Fee Table */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredFees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <IndianRupee className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-white font-medium mb-1">No fee records</p>
            <p className="text-sm text-gray-400 text-center">No records found for {selectedMonthDisplay}.</p>
          </div>
        ) : (
          <>
            <FeeTable
              fees={paginatedFees}
              isLoading={isLoading}
              onMarkPaid={handleMarkPaidClick}
              onEdit={(fee) => {
                setEditingFee(fee);
                setIsEditModalOpen(true);
              }}
            />
            {filteredFees.length > ITEMS_PER_PAGE && (
              <div className="border-t border-white/10 px-4 py-3">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={fees.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  itemLabel="records"
                />
              </div>
            )}
          </>
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
