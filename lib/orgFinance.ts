import { format } from 'date-fns'
import { computeBranchFinanceSummary, resolveAsOf, wasEmployedDuringMonth, type RentType } from './finance'

export interface BranchMonthFinance {
  branchId: string
  month: string // YYYY-MM
  revenue: number
  rentType: RentType
  rentValue: number
  standardFeePerStudent: number
  totalSalary: number
  miscExpense: number
  totalExpense: number
  netProfit: number
}

/**
 * Assembles per-branch, per-month revenue/expense/net-profit figures by resolving
 * each branch's rent and each coach's salary as of that specific month (not today's
 * values) — the same history-aware logic the Expenses page uses for a single branch,
 * generalized across branches/months for dashboard-level aggregation and (later) forecasting.
 */
export async function fetchBranchMonthFinances(
  supabase: any,
  branchIds: string[],
  months: string[]
): Promise<BranchMonthFinance[]> {
  if (branchIds.length === 0 || months.length === 0) return []

  const [coachesRes, revisionsRes, expensesRes, feesRes] = await Promise.all([
    supabase.from('coaches').select('id, branch_id, created_at, deactivated_at').in('branch_id', branchIds),
    supabase.from('branch_finance_revisions').select('*').in('branch_id', branchIds),
    supabase.from('expenses').select('branch_id, amount, month').in('branch_id', branchIds).in('month', months),
    supabase.from('fees').select('branch_id, amount, month').eq('status', 'paid').in('branch_id', branchIds).in('month', months),
  ])

  const coaches: { id: string; branch_id: string; created_at: string; deactivated_at: string | null }[] = coachesRes.data ?? []
  const revisions: { branch_id: string; rent_type: RentType; rent_value: number; standard_fee_per_student: number; effective_from: string }[] = revisionsRes.data ?? []
  const expenseRows: { branch_id: string; amount: number; month: string }[] = expensesRes.data ?? []
  const feeRows: { branch_id: string; amount: number; month: string }[] = feesRes.data ?? []

  const coachIds = coaches.map(c => c.id)
  const salaryHistoryRes = coachIds.length > 0
    ? await supabase.from('coach_salary_history').select('coach_id, monthly_salary, effective_from').in('coach_id', coachIds)
    : { data: [] }
  const salaryHistoryRows: { coach_id: string; monthly_salary: number; effective_from: string }[] = salaryHistoryRes.data ?? []

  const results: BranchMonthFinance[] = []

  for (const branchId of branchIds) {
    const branchCoaches = coaches.filter(c => c.branch_id === branchId)
    const branchRevisions = revisions
      .filter(r => r.branch_id === branchId)
      .map(r => ({
        effectiveFrom: r.effective_from,
        value: { rentType: r.rent_type, rentValue: r.rent_value, standardFeePerStudent: r.standard_fee_per_student },
      }))

    for (const month of months) {
      const revenue = feeRows
        .filter(f => f.branch_id === branchId && f.month === month)
        .reduce((sum, f) => sum + f.amount, 0)

      const totalSalary = branchCoaches
        .filter(c => wasEmployedDuringMonth(
          format(new Date(c.created_at), 'yyyy-MM'),
          c.deactivated_at ? format(new Date(c.deactivated_at), 'yyyy-MM') : null,
          month
        ))
        .reduce((sum, c) => {
          const history = salaryHistoryRows
            .filter(h => h.coach_id === c.id)
            .map(h => ({ effectiveFrom: h.effective_from, value: h.monthly_salary }))
          return sum + (resolveAsOf(history, month) ?? 0)
        }, 0)

      const miscExpense = expenseRows
        .filter(e => e.branch_id === branchId && e.month === month)
        .reduce((sum, e) => sum + e.amount, 0)

      const settings = resolveAsOf(branchRevisions, month)

      const summary = computeBranchFinanceSummary({
        revenue,
        rentType: settings?.rentType ?? 'fixed',
        rentValue: settings?.rentValue ?? 0,
        standardFeePerStudent: settings?.standardFeePerStudent ?? 0,
        totalSalary,
        miscExpense,
      })

      results.push({
        branchId,
        month,
        revenue,
        rentType: settings?.rentType ?? 'fixed',
        rentValue: settings?.rentValue ?? 0,
        standardFeePerStudent: settings?.standardFeePerStudent ?? 0,
        totalSalary,
        miscExpense,
        totalExpense: summary.totalExpense,
        netProfit: summary.netProfit,
      })
    }
  }

  return results
}
