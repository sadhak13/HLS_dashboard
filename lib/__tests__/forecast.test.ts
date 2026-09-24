import { describe, it, expect } from 'vitest'
import { hasEnoughHistory, detectMonthlyRevenueGrowthRate, projectBranchFinances, findBreakEvenMonth } from '../forecast'
import type { BranchMonthFinance } from '../orgFinance'

function month(m: string, revenue: number, totalExpense: number): BranchMonthFinance {
  return {
    branchId: 'b1',
    month: m,
    revenue,
    rentType: 'fixed',
    rentValue: 0,
    standardFeePerStudent: 0,
    totalSalary: 0,
    miscExpense: 0,
    totalExpense,
    netProfit: revenue - totalExpense,
  }
}

describe('hasEnoughHistory', () => {
  it('is false with fewer than 3 real months', () => {
    const history = [month('2026-06', 50000, 40000), month('2026-07', 52000, 40000)]
    expect(hasEnoughHistory(history)).toBe(false)
  })

  it('is true at exactly 3 real months', () => {
    const history = [
      month('2026-06', 50000, 40000),
      month('2026-07', 52000, 40000),
      month('2026-08', 54000, 40000),
    ]
    expect(hasEnoughHistory(history)).toBe(true)
  })

  it('does not count all-zero months toward the threshold', () => {
    const history = [
      month('2026-05', 0, 0),
      month('2026-06', 50000, 40000),
      month('2026-07', 52000, 40000),
    ]
    expect(hasEnoughHistory(history)).toBe(false)
  })
})

describe('detectMonthlyRevenueGrowthRate', () => {
  it('returns 0 with fewer than 2 usable months', () => {
    expect(detectMonthlyRevenueGrowthRate([month('2026-06', 50000, 40000)])).toBe(0)
  })

  it('averages month-over-month growth across a known series', () => {
    // 100 -> 110 (+10%) -> 121 (+10%)
    const history = [month('2026-06', 100, 0), month('2026-07', 110, 0), month('2026-08', 121, 0)]
    expect(detectMonthlyRevenueGrowthRate(history)).toBeCloseTo(10, 5)
  })
})

describe('projectBranchFinances', () => {
  const baseline = {
    revenue: 100000,
    rentType: 'fixed' as const,
    rentValue: 100000,
    standardFeePerStudent: 2000,
    totalSalary: 20000,
    miscExpense: 5000,
  }

  it('compounds revenue monthly at the given growth rate', () => {
    const projection = projectBranchFinances(baseline, { monthlyRevenueGrowthPct: 10, annualRentGrowthPct: 0, annualSalaryGrowthPct: 0 }, '2026-10', 2)
    expect(projection[0].revenue).toBeCloseTo(110000, 2)
    expect(projection[1].revenue).toBeCloseTo(121000, 2)
    expect(projection.map(p => p.month)).toEqual(['2026-10', '2026-11'])
  })

  it('holds rent/salary flat within the first 12 months, then bumps annually', () => {
    const projection = projectBranchFinances(
      baseline,
      { monthlyRevenueGrowthPct: 0, annualRentGrowthPct: 10, annualSalaryGrowthPct: 5 },
      '2026-01',
      14
    )
    // Month index 11 (12th month) is still year 0 — no bump yet.
    expect(projection[11].totalExpense).toBeCloseTo(100000 + 20000 + 5000, 2)
    // Month index 12 (13th month) crosses into year 1 — rent and salary bump.
    expect(projection[12].totalExpense).toBeCloseTo(110000 + 21000 + 5000, 2)
  })

  it('holds misc expense flat across the whole projection', () => {
    const projection = projectBranchFinances(baseline, { monthlyRevenueGrowthPct: 5, annualRentGrowthPct: 0, annualSalaryGrowthPct: 0 }, '2026-01', 3)
    // rent/salary flat, so the only variable expense component would be misc — confirm it never changes.
    const rentPlusSalary = 100000 + 20000
    projection.forEach(p => {
      expect(p.totalExpense - rentPlusSalary).toBeCloseTo(5000, 2)
    })
  })
})

describe('findBreakEvenMonth', () => {
  it('finds the first month net profit crosses into positive', () => {
    const projection = [
      { month: '2026-01', revenue: 10, totalExpense: 20, netProfit: -10 },
      { month: '2026-02', revenue: 15, totalExpense: 20, netProfit: -5 },
      { month: '2026-03', revenue: 25, totalExpense: 20, netProfit: 5 },
    ]
    expect(findBreakEvenMonth(projection)).toBe('2026-03')
  })

  it('returns null when the projection never breaks even', () => {
    const projection = [
      { month: '2026-01', revenue: 10, totalExpense: 20, netProfit: -10 },
      { month: '2026-02', revenue: 12, totalExpense: 20, netProfit: -8 },
    ]
    expect(findBreakEvenMonth(projection)).toBeNull()
  })
})
