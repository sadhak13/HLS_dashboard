"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { computeBranchFinanceSummary, resolveAsOf, wasEmployedDuringMonth, type RentType } from '@/lib/finance';
import { fetchBranchMonthFinances } from '@/lib/orgFinance';
import { deleteExpense } from '@/app/(admin)/expenses/actions';
import { EXPENSE_CATEGORY_LABELS } from '@/lib/validations';
import { BranchFinanceSettingsModal } from '@/components/admin/BranchFinanceSettingsModal';
import { AddExpenseModal } from '@/components/admin/AddExpenseModal';
import { ExpensesTabs } from '@/components/admin/ExpensesTabs';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import Spinner from '@/components/ui/Spinner';
import {
  IndianRupee, TrendingDown, Wallet, Users, ChevronLeft, ChevronRight,
  Settings, Plus, Trash2, AlertCircle, Wrench, Trophy, Siren,
} from 'lucide-react';
import { format, addMonths, subMonths, isAfter, startOfMonth } from 'date-fns';
import type { BranchFinanceRevision, Expense } from '@/types/app.types';

const ALL_BRANCHES = 'all';

interface AggregateBranchRow {
  branchId: string;
  branchName: string;
  activeStudents: number;
  revenue: number;
  totalExpense: number;
  netProfit: number;
  isConfigured: boolean;
}

interface AggregateData {
  revenue: number;
  rentExpense: number;
  totalSalary: number;
  wholeAcademyExpense: number;
  totalExpense: number;
  netProfit: number;
  activeStudents: number;
  breakEvenStudents: number | null;
  unconfiguredBranchNames: string[];
  perBranch: AggregateBranchRow[];
}

type ExpenseRow = Expense & { branch_name?: string };

function categoryTotals(rows: { category: string; amount: number }[]) {
  const map = new Map<string, number>();
  rows.forEach(r => map.set(r.category, (map.get(r.category) ?? 0) + r.amount));
  return Array.from(map.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export default function ExpensesPage() {
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const isAggregate = selectedBranchId === ALL_BRANCHES;

  const [currentMonthDate, setCurrentMonthDate] = useState(() => startOfMonth(new Date()));
  const maxMonth = useMemo(() => startOfMonth(addMonths(new Date(), 1)), []);
  const selectedMonthStr = format(currentMonthDate, 'yyyy-MM');
  const selectedMonthDisplay = format(currentMonthDate, 'MMMM yyyy');
  const isNextDisabled = isAfter(addMonths(currentMonthDate, 1), maxMonth);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Single-branch state
  const [revenue, setRevenue] = useState(0);
  const [activeStudents, setActiveStudents] = useState(0);
  const [totalSalary, setTotalSalary] = useState(0);
  const [financeHistory, setFinanceHistory] = useState<BranchFinanceRevision[]>([]);

  // Aggregate ("All Branches") state
  const [aggregateData, setAggregateData] = useState<AggregateData | null>(null);

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const fetchBranches = async () => {
      const { data } = await (supabase as any).from('branches').select('id, name').order('name');
      if (data) {
        setBranches(data);
        if (data.length > 0) setSelectedBranchId(data[0].id);
      }
    };
    fetchBranches();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAggregateData = useCallback(async (monthStr: string, branchList: { id: string; name: string }[]) => {
    const allBranchIds = branchList.map(b => b.id);
    if (allBranchIds.length === 0) {
      setAggregateData(null);
      setExpenses([]);
      return;
    }

    const [monthFinances, branchExpensesRes, wholeAcademyExpensesRes, playersRes] = await Promise.all([
      fetchBranchMonthFinances(supabase, allBranchIds, [monthStr]),
      (supabase as any).from('expenses').select('*').in('branch_id', allBranchIds).eq('month', monthStr).order('created_at', { ascending: false }),
      (supabase as any).from('expenses').select('*').is('branch_id', null).eq('month', monthStr).order('created_at', { ascending: false }),
      (supabase as any).from('players').select('branch_id').in('branch_id', allBranchIds).eq('status', 'active'),
    ]);

    if (branchExpensesRes.error) throw new Error(branchExpensesRes.error.message || 'Failed to load expense data');
    if (wholeAcademyExpensesRes.error) throw new Error(wholeAcademyExpensesRes.error.message || 'Failed to load whole-academy expenses');
    if (playersRes.error) throw new Error(playersRes.error.message || 'Failed to load player counts');

    const activeStudentsByBranch = new Map<string, number>();
    (playersRes.data ?? []).forEach((p: any) => {
      activeStudentsByBranch.set(p.branch_id, (activeStudentsByBranch.get(p.branch_id) ?? 0) + 1);
    });

    let totalRevenue = 0, totalRent = 0, totalSalaryAll = 0, totalExpenseAll = 0, netProfitAll = 0, breakEvenSum = 0;
    let hasAnyConfigured = false;
    const unconfiguredBranchNames: string[] = [];
    const perBranch: AggregateBranchRow[] = [];

    monthFinances.forEach((row) => {
      const branchSummary = computeBranchFinanceSummary({
        revenue: row.revenue,
        rentType: row.rentType,
        rentValue: row.rentValue,
        standardFeePerStudent: row.standardFeePerStudent,
        totalSalary: row.totalSalary,
        miscExpense: row.miscExpense,
      });
      const branchName = branchList.find(b => b.id === row.branchId)?.name ?? 'Unknown branch';

      totalRevenue += row.revenue;
      totalRent += branchSummary.rentExpense;
      totalSalaryAll += row.totalSalary;
      totalExpenseAll += branchSummary.totalExpense;
      netProfitAll += branchSummary.netProfit;

      const isConfigured = branchSummary.breakEvenStudents !== null;
      if (isConfigured) {
        breakEvenSum += branchSummary.breakEvenStudents!;
        hasAnyConfigured = true;
      } else {
        unconfiguredBranchNames.push(branchName);
      }

      perBranch.push({
        branchId: row.branchId,
        branchName,
        activeStudents: activeStudentsByBranch.get(row.branchId) ?? 0,
        revenue: row.revenue,
        totalExpense: branchSummary.totalExpense,
        netProfit: branchSummary.netProfit,
        isConfigured,
      });
    });

    const wholeAcademyRows: any[] = wholeAcademyExpensesRes.data ?? [];
    const wholeAcademyTotal = wholeAcademyRows.reduce((s, e) => s + e.amount, 0);
    totalExpenseAll += wholeAcademyTotal;
    netProfitAll -= wholeAcademyTotal;

    const branchExpenseRows: any[] = branchExpensesRes.data ?? [];

    setAggregateData({
      revenue: totalRevenue,
      rentExpense: totalRent,
      totalSalary: totalSalaryAll,
      wholeAcademyExpense: wholeAcademyTotal,
      totalExpense: totalExpenseAll,
      netProfit: netProfitAll,
      activeStudents: playersRes.data?.length ?? 0,
      breakEvenStudents: hasAnyConfigured ? breakEvenSum : null,
      unconfiguredBranchNames,
      perBranch: [...perBranch].sort((a, b) => b.netProfit - a.netProfit),
    });

    setExpenses([
      ...branchExpenseRows.map(e => ({ ...e, branch_name: branchList.find(b => b.id === e.branch_id)?.name })),
      ...wholeAcademyRows.map(e => ({ ...e, branch_name: 'Whole Academy' })),
    ]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBranchData = useCallback(async (branchId: string, monthStr: string, branchList: { id: string; name: string }[]) => {
    if (!branchId) return;
    setIsLoading(true);
    setLoadError('');

    try {
      if (branchId === ALL_BRANCHES) {
        setFinanceHistory([]);
        await fetchAggregateData(monthStr, branchList);
      } else {
        setAggregateData(null);

        const [feesRes, playersRes, coachesRes, revisionsRes, expensesRes] = await Promise.all([
          (supabase as any).from('fees').select('amount').eq('branch_id', branchId).eq('month', monthStr).eq('status', 'paid'),
          (supabase as any).from('players').select('id', { count: 'exact', head: true }).eq('branch_id', branchId).eq('status', 'active'),
          (supabase as any).from('coaches').select('id, created_at, deactivated_at').eq('branch_id', branchId),
          (supabase as any).from('branch_finance_revisions').select('*').eq('branch_id', branchId),
          (supabase as any).from('expenses').select('*').eq('branch_id', branchId).eq('month', monthStr).order('created_at', { ascending: false }),
        ]);

        const firstError = [feesRes.error, playersRes.error, coachesRes.error, revisionsRes.error, expensesRes.error].find(Boolean);
        if (firstError) throw new Error(firstError.message || 'Failed to load expense data');

        const coaches: { id: string; created_at: string; deactivated_at: string | null }[] = coachesRes.data ?? [];
        const employedCoachIds = coaches
          .filter(c => wasEmployedDuringMonth(
            format(new Date(c.created_at), 'yyyy-MM'),
            c.deactivated_at ? format(new Date(c.deactivated_at), 'yyyy-MM') : null,
            monthStr
          ))
          .map(c => c.id);

        let salaryHistoryRows: { coach_id: string; monthly_salary: number; effective_from: string }[] = [];
        if (employedCoachIds.length > 0) {
          const { data, error } = await (supabase as any)
            .from('coach_salary_history')
            .select('coach_id, monthly_salary, effective_from')
            .in('coach_id', employedCoachIds);
          if (error) throw new Error(error.message || 'Failed to load salary history');
          salaryHistoryRows = data ?? [];
        }

        const salary = employedCoachIds.reduce((sum, coachId) => {
          const history = salaryHistoryRows
            .filter(h => h.coach_id === coachId)
            .map(h => ({ effectiveFrom: h.effective_from, value: h.monthly_salary }));
          return sum + (resolveAsOf(history, monthStr) ?? 0);
        }, 0);

        const monthlyRevenue = (feesRes.data ?? []).reduce((sum: number, f: { amount: number }) => sum + f.amount, 0);

        setRevenue(monthlyRevenue);
        setActiveStudents(playersRes.count ?? 0);
        setTotalSalary(salary);
        setFinanceHistory(revisionsRes.data ?? []);
        setExpenses(expensesRes.data ?? []);
      }
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load expense data');
    } finally {
      setIsLoading(false);
    }
  }, [fetchAggregateData]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchBranchData(selectedBranchId, selectedMonthStr, branches);
  }, [fetchBranchData, selectedBranchId, selectedMonthStr, branches]);

  const handlePrevMonth = () => setCurrentMonthDate((prev) => subMonths(prev, 1));
  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => {
      const next = addMonths(prev, 1);
      return isAfter(next, maxMonth) ? prev : next;
    });
  };

  const otherExpenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const displayCategoryTotals = useMemo(() => categoryTotals(expenses), [expenses]);

  const resolvedSettings = resolveAsOf(
    financeHistory.map(r => ({
      effectiveFrom: r.effective_from,
      value: { rentType: r.rent_type as RentType, rentValue: r.rent_value, standardFeePerStudent: r.standard_fee_per_student },
    })),
    selectedMonthStr
  );

  const summary = computeBranchFinanceSummary({
    revenue,
    rentType: resolvedSettings?.rentType ?? 'fixed',
    rentValue: resolvedSettings?.rentValue ?? 0,
    standardFeePerStudent: resolvedSettings?.standardFeePerStudent ?? 0,
    totalSalary,
    miscExpense: otherExpenseTotal,
  });

  // Unified display values — single-branch (computed above) or aggregate (from fetchAggregateData)
  const displayRevenue = isAggregate ? (aggregateData?.revenue ?? 0) : revenue;
  const displayRentExpense = isAggregate ? (aggregateData?.rentExpense ?? 0) : summary.rentExpense;
  const displayTotalSalary = isAggregate ? (aggregateData?.totalSalary ?? 0) : totalSalary;
  const displayTotalExpense = isAggregate ? (aggregateData?.totalExpense ?? 0) : summary.totalExpense;
  const displayNetProfit = isAggregate ? (aggregateData?.netProfit ?? 0) : summary.netProfit;
  const displayActiveStudents = isAggregate ? (aggregateData?.activeStudents ?? 0) : activeStudents;
  const displayBreakEvenStudents = isAggregate ? (aggregateData?.breakEvenStudents ?? null) : summary.breakEvenStudents;

  const breakEvenTrend = displayBreakEvenStudents && displayBreakEvenStudents > 0
    ? {
      value: Math.round(((displayActiveStudents - displayBreakEvenStudents) / displayBreakEvenStudents) * 100),
      isPositive: displayActiveStudents >= displayBreakEvenStudents,
    }
    : undefined;

  const selectedBranchName = isAggregate ? 'All Branches' : (branches.find(b => b.id === selectedBranchId)?.name ?? '');

  const bestBranch = aggregateData && aggregateData.perBranch.length > 0 ? aggregateData.perBranch[0] : null;
  const worstBranch = aggregateData && aggregateData.perBranch.length > 0 ? aggregateData.perBranch[aggregateData.perBranch.length - 1] : null;

  const handleConfirmDelete = async () => {
    if (!deletingExpense) return;
    setIsDeleting(true);
    const result = await deleteExpense(deletingExpense.id);
    if (!result.error) {
      fetchBranchData(selectedBranchId, selectedMonthStr, branches);
    }
    setIsDeleting(false);
    setDeletingExpense(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses & Break-Even</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
              Track ground rent, salaries, and other costs per branch — and see how many students you need to break even.
            </p>
          </div>
        </div>

        <ExpensesTabs />

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
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 cursor-pointer"
          >
            <option value={ALL_BRANCHES}>All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {branches.length === 0 && !isLoading ? (
        <EmptyState
          icon={<IndianRupee className="w-6 h-6" />}
          title="No branches yet"
          description="Add a branch first, then come back here to configure its rent and track expenses."
        />
      ) : loadError ? (
        <EmptyState
          icon={<AlertCircle className="w-6 h-6 text-red-500" />}
          title="Couldn't load expense data"
          description={loadError}
          action={
            <Button onClick={() => fetchBranchData(selectedBranchId, selectedMonthStr, branches)}>
              Retry
            </Button>
          }
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Spinner />
        </div>
      ) : (
        <>
          {!isAggregate && !resolvedSettings && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-500/20">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                  Rent and standard fee not configured for {selectedBranchName} for {selectedMonthDisplay}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-0.5">
                  Break-even projections need this to be set once — it applies from that month onward.
                </p>
              </div>
              <Button size="sm" onClick={() => setIsSettingsModalOpen(true)} className="shrink-0">
                Configure
              </Button>
            </div>
          )}

          {isAggregate && aggregateData && aggregateData.unconfiguredBranchNames.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-500/20">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                  {aggregateData.unconfiguredBranchNames.length} branch{aggregateData.unconfiguredBranchNames.length > 1 ? 'es' : ''} haven&apos;t configured rent & fee yet
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-0.5">
                  {aggregateData.unconfiguredBranchNames.join(', ')} — the combined break-even figure below excludes {aggregateData.unconfiguredBranchNames.length > 1 ? 'them' : 'it'}. Switch to that branch above to configure it.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              title="Revenue"
              value={`₹${displayRevenue.toLocaleString('en-IN')}`}
              icon={IndianRupee}
              iconColor="text-green-500"
            />
            <StatCard
              title="Total Expenses"
              value={`₹${displayTotalExpense.toLocaleString('en-IN')}`}
              icon={TrendingDown}
              iconColor="text-red-500"
            />
            <StatCard
              title="Net Profit"
              value={`₹${displayNetProfit.toLocaleString('en-IN')}`}
              icon={Wallet}
              iconColor={displayNetProfit >= 0 ? 'text-green-500' : 'text-red-500'}
            />
            <StatCard
              title="Students (Actual / Break-Even)"
              value={displayBreakEvenStudents !== null ? `${displayActiveStudents} / ${displayBreakEvenStudents}` : `${displayActiveStudents} / —`}
              icon={Users}
              iconColor="text-blue-500"
              trend={breakEvenTrend}
            />
          </div>

          {isAggregate && aggregateData && bestBranch && worstBranch && bestBranch.branchId !== worstBranch.branchId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                title="Best Performing Branch"
                value={bestBranch.branchName}
                icon={Trophy}
                iconColor="text-green-500"
                className="border-green-500/20"
              />
              <StatCard
                title="Most Urgent Branch"
                value={worstBranch.branchName}
                icon={Siren}
                iconColor="text-red-500"
                className="border-red-500/20"
              />
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle>Expense Breakdown — {selectedBranchName}</CardTitle>
              {!isAggregate && (
                <Button variant="outline" size="sm" onClick={() => setIsSettingsModalOpen(true)} className="gap-1.5">
                  <Settings className="w-3.5 h-3.5" />
                  Configure Rent & Fee
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  Ground Rent {!isAggregate && resolvedSettings ? `(${resolvedSettings.rentType === 'fixed' ? 'fixed' : `${resolvedSettings.rentValue}% of revenue`})` : ''}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">₹{displayRentExpense.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Coach Salaries</span>
                <span className="font-medium text-gray-900 dark:text-white">₹{displayTotalSalary.toLocaleString('en-IN')}</span>
              </div>
              {isAggregate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Whole-Academy Overhead</span>
                  <span className="font-medium text-gray-900 dark:text-white">₹{(aggregateData?.wholeAcademyExpense ?? 0).toLocaleString('en-IN')}</span>
                </div>
              )}
              {displayCategoryTotals.map(({ category, amount }) => (
                <div key={category} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {EXPENSE_CATEGORY_LABELS[category as keyof typeof EXPENSE_CATEGORY_LABELS] ?? category}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">₹{amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
              <div className="h-px bg-gray-200 dark:bg-gray-700" />
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-gray-700 dark:text-gray-200">Total Expenses</span>
                <span className="text-gray-900 dark:text-white">₹{displayTotalExpense.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Net Profit = Revenue − (Ground Rent + Coach Salaries + Other Expenses)
              </p>
            </CardContent>
          </Card>

          {isAggregate && aggregateData && aggregateData.perBranch.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Branch Comparison — {selectedMonthDisplay}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Branch</TableHead>
                      <TableHead>Active Students</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Expenses</TableHead>
                      <TableHead>Net Profit</TableHead>
                      <TableHead>Flags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aggregateData.perBranch.map((b) => (
                      <TableRow key={b.branchId}>
                        <TableCell className="font-medium text-gray-900 dark:text-white">{b.branchName}</TableCell>
                        <TableCell>{b.activeStudents}</TableCell>
                        <TableCell>₹{b.revenue.toLocaleString('en-IN')}</TableCell>
                        <TableCell>₹{b.totalExpense.toLocaleString('en-IN')}</TableCell>
                        <TableCell className={b.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          ₹{b.netProfit.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1.5">
                            {!b.isConfigured && <Badge variant="warning">Not Configured</Badge>}
                            {b.netProfit < 0 && <Badge variant="danger">Losing Money</Badge>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Expense Ledger</h2>
            <Button size="sm" onClick={() => setIsAddExpenseModalOpen(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Add Expense
            </Button>
          </div>

          {expenses.length === 0 ? (
            <EmptyState
              icon={<Wrench className="w-6 h-6" />}
              title={`No expenses logged for ${selectedMonthDisplay}`}
              description={
                isAggregate
                  ? 'No costs logged across any branch (or the whole academy) for this month.'
                  : 'Add equipment, transport, utilities, or other costs for this branch and month.'
              }
              action={
                <Button onClick={() => setIsAddExpenseModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  {isAggregate && <TableHead>Branch</TableHead>}
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Logged On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <Badge variant={expense.category === 'misc' ? 'default' : 'info'}>
                        {EXPENSE_CATEGORY_LABELS[expense.category as keyof typeof EXPENSE_CATEGORY_LABELS] ?? expense.category}
                      </Badge>
                    </TableCell>
                    {isAggregate && <TableCell>{expense.branch_name ?? 'Whole Academy'}</TableCell>}
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>₹{expense.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell>{new Date(expense.created_at).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => setDeletingExpense(expense)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        aria-label="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}

      {!isAggregate && (
        <BranchFinanceSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onSuccess={() => fetchBranchData(selectedBranchId, selectedMonthStr, branches)}
          branchId={selectedBranchId}
          branchName={selectedBranchName}
          history={financeHistory}
        />
      )}

      <AddExpenseModal
        isOpen={isAddExpenseModalOpen}
        onClose={() => setIsAddExpenseModalOpen(false)}
        onSuccess={() => fetchBranchData(selectedBranchId, selectedMonthStr, branches)}
        branches={branches}
        defaultBranchId={isAggregate ? '' : selectedBranchId}
        month={selectedMonthStr}
      />

      {/* Delete Expense Confirmation */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Expense</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Are you sure you want to delete this {EXPENSE_CATEGORY_LABELS[deletingExpense.category as keyof typeof EXPENSE_CATEGORY_LABELS] ?? deletingExpense.category} expense of{' '}
              <strong>₹{deletingExpense.amount.toLocaleString('en-IN')}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeletingExpense(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
