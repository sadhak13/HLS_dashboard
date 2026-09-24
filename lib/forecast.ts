import { addMonths, format } from 'date-fns'
import { computeBranchFinanceSummary, type RentType } from './finance'
import type { BranchMonthFinance } from './orgFinance'

export interface ForecastAssumptions {
  monthlyRevenueGrowthPct: number
  annualRentGrowthPct: number
  annualSalaryGrowthPct: number
}

export interface ForecastMonth {
  month: string // YYYY-MM
  revenue: number
  totalExpense: number
  netProfit: number
}

export interface ForecastBaseline {
  revenue: number
  rentType: RentType
  rentValue: number
  standardFeePerStudent: number
  totalSalary: number
  miscExpense: number
}

/** True once at least `minMonths` months have real tracked activity (revenue or expenses > 0). */
export function hasEnoughHistory(history: BranchMonthFinance[], minMonths = 3): boolean {
  const realMonths = history.filter(h => h.revenue > 0 || h.totalExpense > 0)
  return realMonths.length >= minMonths
}

/** Average month-over-month revenue growth % across trailing real (revenue > 0) months; 0 if fewer than 2 usable points. */
export function detectMonthlyRevenueGrowthRate(history: BranchMonthFinance[]): number {
  const realMonths = [...history]
    .filter(h => h.revenue > 0)
    .sort((a, b) => a.month.localeCompare(b.month))

  if (realMonths.length < 2) return 0

  const growthRates: number[] = []
  for (let i = 1; i < realMonths.length; i++) {
    const prev = realMonths[i - 1].revenue
    const curr = realMonths[i].revenue
    growthRates.push(((curr - prev) / prev) * 100)
  }

  return growthRates.reduce((sum, r) => sum + r, 0) / growthRates.length
}

/**
 * Projects `monthsAhead` months forward from a baseline month's actuals: revenue compounds monthly,
 * rent and salary compound once per 12 projected months (annual bump), misc/equipment expenses are
 * held flat at the baseline (they're one-off by nature — no growth driver was asked for them).
 */
export function projectBranchFinances(
  baseline: ForecastBaseline,
  assumptions: ForecastAssumptions,
  startMonth: string,
  monthsAhead: number
): ForecastMonth[] {
  const { monthlyRevenueGrowthPct, annualRentGrowthPct, annualSalaryGrowthPct } = assumptions
  const startDate = new Date(`${startMonth}-01`)

  const projection: ForecastMonth[] = []

  for (let i = 0; i < monthsAhead; i++) {
    const yearsElapsed = Math.floor(i / 12)
    const revenue = baseline.revenue * Math.pow(1 + monthlyRevenueGrowthPct / 100, i + 1)
    const rentValue = baseline.rentValue * Math.pow(1 + annualRentGrowthPct / 100, yearsElapsed)
    const totalSalary = baseline.totalSalary * Math.pow(1 + annualSalaryGrowthPct / 100, yearsElapsed)

    const summary = computeBranchFinanceSummary({
      revenue,
      rentType: baseline.rentType,
      rentValue,
      standardFeePerStudent: baseline.standardFeePerStudent,
      totalSalary,
      miscExpense: baseline.miscExpense,
    })

    projection.push({
      month: format(addMonths(startDate, i), 'yyyy-MM'),
      revenue,
      totalExpense: summary.totalExpense,
      netProfit: summary.netProfit,
    })
  }

  return projection
}

/** First projected month with netProfit >= 0; null if the projection never crosses into profit. */
export function findBreakEvenMonth(projection: ForecastMonth[]): string | null {
  const month = projection.find(p => p.netProfit >= 0)
  return month ? month.month : null
}
