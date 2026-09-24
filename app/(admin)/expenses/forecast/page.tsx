"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchBranchMonthFinances, type BranchMonthFinance } from '@/lib/orgFinance';
import {
  hasEnoughHistory, detectMonthlyRevenueGrowthRate, projectBranchFinances, findBreakEvenMonth,
  type ForecastAssumptions, type ForecastMonth,
} from '@/lib/forecast';
import { saveForecastAssumptions } from '@/app/(admin)/expenses/forecast/actions';
import { ExpensesTabs } from '@/components/admin/ExpensesTabs';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import Spinner from '@/components/ui/Spinner';
import { IndianRupee, TrendingDown, Wallet, TrendingUp, AlertCircle } from 'lucide-react';
import { format, addMonths, subMonths, endOfYear, differenceInCalendarMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '@/context/ThemeContext';

const ALL_BRANCHES = 'all';
type Horizon = 'next_month' | 'this_year' | '3_years';
type ChartEntry = { name: string; netProfit: number; isProjected: boolean };

const HORIZONS: { key: Horizon; label: string }[] = [
  { key: 'next_month', label: 'Next Month' },
  { key: 'this_year', label: 'This Year' },
  { key: '3_years', label: 'Next 3 Years' },
];

interface AggregateForecastResult {
  projection: ForecastMonth[];
  trailingActualChart: ChartEntry[];
  qualifyingBranchCount: number;
  totalBranchCount: number;
  skippedBranchNames: string[];
}

function getDisplayMonths(horizon: Horizon): string[] {
  const nextMonthDate = addMonths(new Date(), 1);
  if (horizon === 'next_month') return [format(nextMonthDate, 'yyyy-MM')];
  if (horizon === '3_years') return Array.from({ length: 36 }, (_, i) => format(addMonths(nextMonthDate, i), 'yyyy-MM'));
  const count = Math.max(1, differenceInCalendarMonths(endOfYear(new Date()), nextMonthDate) + 1);
  return Array.from({ length: count }, (_, i) => format(addMonths(nextMonthDate, i), 'yyyy-MM'));
}

export default function ForecastPage() {
  const { theme } = useTheme();
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const isAggregate = selectedBranchId === ALL_BRANCHES;
  const [horizon, setHorizon] = useState<Horizon>('next_month');

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Single-branch state
  const [history, setHistory] = useState<BranchMonthFinance[]>([]);
  const [monthlyRevenueGrowthPct, setMonthlyRevenueGrowthPct] = useState('0');
  const [annualRentGrowthPct, setAnnualRentGrowthPct] = useState('0');
  const [annualSalaryGrowthPct, setAnnualSalaryGrowthPct] = useState('0');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Aggregate ("All Branches") state
  const [aggregateResult, setAggregateResult] = useState<AggregateForecastResult | null>(null);

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

  const fetchAggregateForecast = useCallback(async (branchList: { id: string; name: string }[], selectedHorizon: Horizon) => {
    const allBranchIds = branchList.map(b => b.id);
    if (allBranchIds.length === 0) {
      setAggregateResult(null);
      return;
    }

    const now = new Date();
    const trailingMonths = Array.from({ length: 12 }, (_, i) => format(subMonths(now, 11 - i), 'yyyy-MM'));

    const [historyData, assumptionsRes, wholeAcademyRes] = await Promise.all([
      fetchBranchMonthFinances(supabase, allBranchIds, trailingMonths),
      (supabase as any).from('forecast_assumptions').select('*').in('branch_id', allBranchIds),
      (supabase as any).from('expenses').select('month, amount').is('branch_id', null).in('month', trailingMonths),
    ]);
    if (assumptionsRes.error) throw new Error(assumptionsRes.error.message || 'Failed to load forecast assumptions');
    if (wholeAcademyRes.error) throw new Error(wholeAcademyRes.error.message || 'Failed to load whole-academy expenses');

    const savedAssumptionsByBranch = new Map<string, any>((assumptionsRes.data ?? []).map((a: any) => [a.branch_id, a]));

    // Whole-academy overhead isn't predictable per branch — hold the trailing average flat across every projected month.
    const wholeAcademyByMonth = new Map<string, number>();
    (wholeAcademyRes.data ?? []).forEach((e: any) => {
      wholeAcademyByMonth.set(e.month, (wholeAcademyByMonth.get(e.month) ?? 0) + e.amount);
    });
    const wholeAcademyMonthsWithSpend = trailingMonths.filter(m => (wholeAcademyByMonth.get(m) ?? 0) > 0);
    const wholeAcademyMonthlyAvg = wholeAcademyMonthsWithSpend.length > 0
      ? wholeAcademyMonthsWithSpend.reduce((sum, m) => sum + (wholeAcademyByMonth.get(m) ?? 0), 0) / wholeAcademyMonthsWithSpend.length
      : 0;

    const displayMonths = getDisplayMonths(selectedHorizon);
    const displayMonthSet = new Set(displayMonths);
    const combined = new Map<string, { revenue: number; totalExpense: number; netProfit: number }>();
    displayMonths.forEach(m => combined.set(m, { revenue: 0, totalExpense: 0, netProfit: 0 }));

    let qualifyingBranchCount = 0;
    const skippedBranchNames: string[] = [];
    const displayEndDate = new Date(`${displayMonths[displayMonths.length - 1]}-01`);

    for (const branch of branchList) {
      const branchHistory = historyData.filter(h => h.branchId === branch.id);
      const realBranchMonths = branchHistory
        .filter(h => h.revenue > 0 || h.totalExpense > 0)
        .sort((a, b) => a.month.localeCompare(b.month));
      const baseline = realBranchMonths[realBranchMonths.length - 1];

      if (!hasEnoughHistory(branchHistory) || !baseline) {
        skippedBranchNames.push(branch.name);
        continue;
      }

      const saved = savedAssumptionsByBranch.get(branch.id);
      const branchAssumptions: ForecastAssumptions = saved
        ? {
          monthlyRevenueGrowthPct: saved.monthly_revenue_growth_pct,
          annualRentGrowthPct: saved.annual_rent_growth_pct,
          annualSalaryGrowthPct: saved.annual_salary_growth_pct,
        }
        : {
          monthlyRevenueGrowthPct: detectMonthlyRevenueGrowthRate(branchHistory),
          annualRentGrowthPct: 0,
          annualSalaryGrowthPct: 0,
        };

      const branchStartMonth = format(addMonths(new Date(`${baseline.month}-01`), 1), 'yyyy-MM');
      const branchStartDate = new Date(`${branchStartMonth}-01`);
      const monthsNeeded = Math.max(0, differenceInCalendarMonths(displayEndDate, branchStartDate) + 1);
      if (monthsNeeded === 0) {
        skippedBranchNames.push(branch.name);
        continue;
      }

      qualifyingBranchCount++;

      const branchProjection = projectBranchFinances(
        {
          revenue: baseline.revenue,
          rentType: baseline.rentType,
          rentValue: baseline.rentValue,
          standardFeePerStudent: baseline.standardFeePerStudent,
          totalSalary: baseline.totalSalary,
          miscExpense: baseline.miscExpense,
        },
        branchAssumptions,
        branchStartMonth,
        monthsNeeded
      );

      branchProjection.forEach((p) => {
        if (displayMonthSet.has(p.month)) {
          const bucket = combined.get(p.month)!;
          bucket.revenue += p.revenue;
          bucket.totalExpense += p.totalExpense;
          bucket.netProfit += p.netProfit;
        }
      });
    }

    if (wholeAcademyMonthlyAvg > 0) {
      combined.forEach((bucket) => {
        bucket.totalExpense += wholeAcademyMonthlyAvg;
        bucket.netProfit -= wholeAcademyMonthlyAvg;
      });
    }

    const combinedProjection: ForecastMonth[] = displayMonths.map(m => ({ month: m, ...combined.get(m)! }));

    const monthlyActualMap = new Map<string, number>();
    trailingMonths.forEach(m => monthlyActualMap.set(m, 0));
    historyData.forEach(h => monthlyActualMap.set(h.month, (monthlyActualMap.get(h.month) ?? 0) + h.netProfit));
    wholeAcademyByMonth.forEach((amount, month) => {
      monthlyActualMap.set(month, (monthlyActualMap.get(month) ?? 0) - amount);
    });
    const trailingActualChart: ChartEntry[] = trailingMonths.slice(-6).map(m => ({
      name: format(new Date(`${m}-01`), 'MMM yy'),
      netProfit: monthlyActualMap.get(m) ?? 0,
      isProjected: false,
    }));

    setAggregateResult({
      projection: combinedProjection,
      trailingActualChart,
      qualifyingBranchCount,
      totalBranchCount: branchList.length,
      skippedBranchNames,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchForecastData = useCallback(async (branchId: string, branchList: { id: string; name: string }[], selectedHorizon: Horizon) => {
    if (!branchId) return;
    setIsLoading(true);
    setLoadError('');

    try {
      if (branchId === ALL_BRANCHES) {
        setHistory([]);
        await fetchAggregateForecast(branchList, selectedHorizon);
      } else {
        setAggregateResult(null);

        const now = new Date();
        const months = Array.from({ length: 12 }, (_, i) => format(subMonths(now, 11 - i), 'yyyy-MM'));

        const [historyData, assumptionsRes] = await Promise.all([
          fetchBranchMonthFinances(supabase, [branchId], months),
          (supabase as any).from('forecast_assumptions').select('*').eq('branch_id', branchId).maybeSingle(),
        ]);

        if (assumptionsRes.error) throw new Error(assumptionsRes.error.message || 'Failed to load forecast assumptions');

        setHistory(historyData);

        const saved = assumptionsRes.data;
        if (saved) {
          setMonthlyRevenueGrowthPct(String(saved.monthly_revenue_growth_pct));
          setAnnualRentGrowthPct(String(saved.annual_rent_growth_pct));
          setAnnualSalaryGrowthPct(String(saved.annual_salary_growth_pct));
        } else {
          setMonthlyRevenueGrowthPct(detectMonthlyRevenueGrowthRate(historyData).toFixed(1));
          setAnnualRentGrowthPct('0');
          setAnnualSalaryGrowthPct('0');
        }
      }
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load forecast data');
    } finally {
      setIsLoading(false);
    }
  }, [fetchAggregateForecast]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchForecastData(selectedBranchId, branches, horizon);
  }, [fetchForecastData, selectedBranchId, branches, horizon]);

  const realMonths = useMemo(
    () => [...history].filter(h => h.revenue > 0 || h.totalExpense > 0).sort((a, b) => a.month.localeCompare(b.month)),
    [history]
  );
  const baselineEntry = realMonths[realMonths.length - 1] ?? null;
  const hasHistory = hasEnoughHistory(history);
  const selectedBranchName = isAggregate ? 'All Branches' : (branches.find(b => b.id === selectedBranchId)?.name ?? '');

  const assumptions: ForecastAssumptions = {
    monthlyRevenueGrowthPct: parseFloat(monthlyRevenueGrowthPct) || 0,
    annualRentGrowthPct: parseFloat(annualRentGrowthPct) || 0,
    annualSalaryGrowthPct: parseFloat(annualSalaryGrowthPct) || 0,
  };

  const startMonth = baselineEntry ? format(addMonths(new Date(`${baselineEntry.month}-01`), 1), 'yyyy-MM') : '';

  const monthsAhead = useMemo(() => {
    if (!baselineEntry) return 0;
    if (horizon === 'next_month') return 1;
    if (horizon === '3_years') return 36;
    const startDate = addMonths(new Date(`${baselineEntry.month}-01`), 1);
    const diff = differenceInCalendarMonths(endOfYear(new Date()), startDate) + 1;
    return Math.max(1, diff);
  }, [horizon, baselineEntry]);

  const singleBranchProjection = useMemo(() => {
    if (!baselineEntry || monthsAhead === 0) return [];
    return projectBranchFinances(
      {
        revenue: baselineEntry.revenue,
        rentType: baselineEntry.rentType,
        rentValue: baselineEntry.rentValue,
        standardFeePerStudent: baselineEntry.standardFeePerStudent,
        totalSalary: baselineEntry.totalSalary,
        miscExpense: baselineEntry.miscExpense,
      },
      assumptions,
      startMonth,
      monthsAhead
    );
  }, [baselineEntry, assumptions, startMonth, monthsAhead]);

  const projection = isAggregate ? (aggregateResult?.projection ?? []) : singleBranchProjection;
  const projectedRevenue = projection.reduce((sum, p) => sum + p.revenue, 0);
  const projectedExpense = projection.reduce((sum, p) => sum + p.totalExpense, 0);
  const projectedNetProfit = projection.reduce((sum, p) => sum + p.netProfit, 0);
  const breakEvenMonth = !isAggregate && baselineEntry && baselineEntry.netProfit < 0 ? findBreakEvenMonth(projection) : null;

  const chartData = useMemo((): ChartEntry[] => {
    if (isAggregate) {
      if (!aggregateResult) return [];
      const actualTotal = aggregateResult.trailingActualChart.reduce((sum, m) => sum + m.netProfit, 0);
      if (horizon === '3_years') {
        const years = [0, 1, 2].map((y) => ({
          name: `Year ${y + 1}`,
          netProfit: projection.slice(y * 12, y * 12 + 12).reduce((sum, p) => sum + p.netProfit, 0),
          isProjected: true,
        }));
        return [{ name: 'Last 12 Months', netProfit: actualTotal, isProjected: false }, ...years];
      }
      const projected: ChartEntry[] = projection.map(p => ({
        name: format(new Date(`${p.month}-01`), 'MMM yy'),
        netProfit: p.netProfit,
        isProjected: true,
      }));
      return [...aggregateResult.trailingActualChart, ...projected];
    }

    if (!baselineEntry) return [];
    if (horizon === '3_years') {
      const last12 = realMonths.slice(-12);
      const actualTotal = last12.reduce((sum, m) => sum + m.netProfit, 0);
      const years = [0, 1, 2].map((y) => ({
        name: `Year ${y + 1}`,
        netProfit: projection.slice(y * 12, y * 12 + 12).reduce((sum, p) => sum + p.netProfit, 0),
        isProjected: true,
      }));
      return [{ name: 'Last 12 Months', netProfit: actualTotal, isProjected: false }, ...years];
    }
    const trailingActual: ChartEntry[] = realMonths.slice(-6).map(m => ({
      name: format(new Date(`${m.month}-01`), 'MMM yy'),
      netProfit: m.netProfit,
      isProjected: false,
    }));
    const projected: ChartEntry[] = projection.map(p => ({
      name: format(new Date(`${p.month}-01`), 'MMM yy'),
      netProfit: p.netProfit,
      isProjected: true,
    }));
    return [...trailingActual, ...projected];
  }, [isAggregate, aggregateResult, horizon, baselineEntry, realMonths, projection]);

  const handleSaveAssumptions = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');

    const formData = new FormData();
    formData.append('branchId', selectedBranchId);
    formData.append('monthlyRevenueGrowthPct', monthlyRevenueGrowthPct || '0');
    formData.append('annualRentGrowthPct', annualRentGrowthPct || '0');
    formData.append('annualSalaryGrowthPct', annualSalaryGrowthPct || '0');

    const result = await saveForecastAssumptions(formData);
    setSaveMessage(result.error ? `Error: ${result.error}` : 'Assumptions saved.');
    setIsSaving(false);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const noDataAtAll = isAggregate
    ? (aggregateResult?.qualifyingBranchCount ?? 0) === 0
    : !hasHistory || !baselineEntry;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Forecast</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
            Project revenue, expenses, and net profit forward — adjust the assumptions to model your own scenario.
          </p>
        </div>

        <ExpensesTabs />

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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

          <div className="flex gap-2 flex-wrap">
            {HORIZONS.map((h) => (
              <button
                key={h.key}
                onClick={() => setHorizon(h.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${horizon === h.key
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadError ? (
        <EmptyState
          icon={<AlertCircle className="w-6 h-6 text-red-500" />}
          title="Couldn't load forecast data"
          description={loadError}
          action={<Button onClick={() => fetchForecastData(selectedBranchId, branches, horizon)}>Retry</Button>}
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Spinner />
        </div>
      ) : noDataAtAll ? (
        <EmptyState
          icon={<TrendingUp className="w-6 h-6" />}
          title="Not enough data yet"
          description={
            isAggregate
              ? "None of your branches have at least 3 tracked months yet — keep logging fees and expenses on the Overview tab and check back."
              : `Need at least 3 tracked months for ${selectedBranchName} to forecast reliably — you have ${realMonths.length} so far. Keep logging fees and expenses on the Overview tab and check back.`
          }
        />
      ) : (
        <>
          {isAggregate && aggregateResult && aggregateResult.skippedBranchNames.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-500/20">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                  {aggregateResult.qualifyingBranchCount} of {aggregateResult.totalBranchCount} branches included in this combined forecast
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-0.5">
                  {aggregateResult.skippedBranchNames.join(', ')} {aggregateResult.skippedBranchNames.length > 1 ? "don't" : "doesn't"} have enough tracked history yet.
                </p>
              </div>
            </div>
          )}

          {isAggregate ? (
            <Card>
              <CardHeader>
                <CardTitle>Assumptions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This combined forecast uses each branch&apos;s own saved (or auto-detected) growth assumptions. Switch to a specific branch above to view or adjust its assumptions.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Assumptions — {selectedBranchName}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveAssumptions} className="space-y-4">
                  {saveMessage && (
                    <div className={`p-3 text-sm rounded-md ${saveMessage.startsWith('Error')
                      ? 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
                      : 'text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400'
                      }`}>
                      {saveMessage}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      type="number"
                      step="0.1"
                      label="Monthly Revenue Growth (%)"
                      value={monthlyRevenueGrowthPct}
                      onChange={(e) => setMonthlyRevenueGrowthPct(e.target.value)}
                    />
                    <Input
                      type="number"
                      step="0.1"
                      label="Annual Rent Growth (%)"
                      value={annualRentGrowthPct}
                      onChange={(e) => setAnnualRentGrowthPct(e.target.value)}
                    />
                    <Input
                      type="number"
                      step="0.1"
                      label="Annual Salary Growth (%)"
                      value={annualSalaryGrowthPct}
                      onChange={(e) => setAnnualSalaryGrowthPct(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Revenue growth is auto-detected from your last few tracked months by default — override any of these to model your own scenario (optimistic, conservative, or a planned rent/salary change).
                  </p>
                  <div className="flex justify-end">
                    <Button type="submit" isLoading={isSaving}>Save Assumptions</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className={`grid grid-cols-2 sm:grid-cols-2 ${breakEvenMonth ? 'xl:grid-cols-4' : 'xl:grid-cols-3'} gap-4`}>
            <StatCard
              title="Projected Revenue"
              value={`₹${Math.round(projectedRevenue).toLocaleString('en-IN')}`}
              icon={IndianRupee}
              iconColor="text-green-500"
            />
            <StatCard
              title="Projected Expenses"
              value={`₹${Math.round(projectedExpense).toLocaleString('en-IN')}`}
              icon={TrendingDown}
              iconColor="text-red-500"
            />
            <StatCard
              title="Projected Net Profit"
              value={`₹${Math.round(projectedNetProfit).toLocaleString('en-IN')}`}
              icon={Wallet}
              iconColor={projectedNetProfit >= 0 ? 'text-green-500' : 'text-red-500'}
            />
            {breakEvenMonth && (
              <StatCard
                title="Projected Break-Even Month"
                value={format(new Date(`${breakEvenMonth}-01`), 'MMM yyyy')}
                icon={TrendingUp}
                iconColor="text-blue-500"
              />
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Net Profit — Actual vs. Projected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 sm:h-72 md:h-80 w-full -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
                      tickFormatter={(val) => `₹${Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <Tooltip
                      cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                      contentStyle={{
                        borderRadius: '12px',
                        border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb',
                        backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.9)' : '#ffffff',
                        color: theme === 'dark' ? '#fff' : '#1a1a2e',
                      }}
                      formatter={(value: any) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, 'Net Profit']}
                    />
                    <Bar dataKey="netProfit" radius={[6, 6, 0, 0]} barSize={32}>
                      {chartData.map((entry, index) => {
                        const positive = entry.netProfit >= 0;
                        const color = positive
                          ? (entry.isProjected ? 'rgba(16,185,129,0.4)' : '#10b981')
                          : (entry.isProjected ? 'rgba(239,68,68,0.4)' : '#ef4444');
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Solid bars are actual months, lighter bars are projected. Equipment/misc expenses are assumed to stay flat at recent levels in the projection.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
