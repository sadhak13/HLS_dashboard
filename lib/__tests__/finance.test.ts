import { describe, it, expect } from 'vitest'
import { computeBranchFinanceSummary, resolveAsOf, wasEmployedDuringMonth } from '../finance'

describe('computeBranchFinanceSummary', () => {
  it('computes break-even for a fixed rent branch (₹1,00,000 rent + ₹20,000 salary, ₹2,000/student → 60 students)', () => {
    const result = computeBranchFinanceSummary({
      revenue: 100000,
      rentType: 'fixed',
      rentValue: 100000,
      standardFeePerStudent: 2000,
      totalSalary: 20000,
      miscExpense: 0,
    })
    expect(result.rentExpense).toBe(100000)
    expect(result.totalExpense).toBe(120000)
    expect(result.breakEvenStudents).toBe(60)
    expect(result.netProfit).toBe(-20000)
  })

  it('computes break-even for a percentage rent branch (40% to ground, ₹20,000 salary, ₹2,000/student)', () => {
    const result = computeBranchFinanceSummary({
      revenue: 100000,
      rentType: 'percentage',
      rentValue: 40,
      standardFeePerStudent: 2000,
      totalSalary: 20000,
      miscExpense: 0,
    })
    expect(result.rentExpense).toBe(40000)
    // effective fee per student after the ground's cut: 2000 * 0.6 = 1200
    expect(result.breakEvenStudents).toBe(Math.ceil(20000 / 1200))
  })

  it('returns null break-even when no standard fee has been configured yet', () => {
    const result = computeBranchFinanceSummary({
      revenue: 50000,
      rentType: 'fixed',
      rentValue: 30000,
      standardFeePerStudent: 0,
      totalSalary: 10000,
      miscExpense: 0,
    })
    expect(result.breakEvenStudents).toBeNull()
  })

  it('returns null break-even when percentage rent is 100% or more (no margin left)', () => {
    const result = computeBranchFinanceSummary({
      revenue: 50000,
      rentType: 'percentage',
      rentValue: 100,
      standardFeePerStudent: 2000,
      totalSalary: 10000,
      miscExpense: 0,
    })
    expect(result.breakEvenStudents).toBeNull()
  })

  it('includes misc expenses in the break-even and net profit calculation', () => {
    const result = computeBranchFinanceSummary({
      revenue: 150000,
      rentType: 'fixed',
      rentValue: 100000,
      standardFeePerStudent: 2000,
      totalSalary: 20000,
      miscExpense: 5000,
    })
    expect(result.totalExpense).toBe(125000)
    expect(result.netProfit).toBe(25000)
    expect(result.breakEvenStudents).toBe(Math.ceil(125000 / 2000))
  })
})

describe('resolveAsOf', () => {
  const vijaysSalaryHistory = [
    { effectiveFrom: '2026-01', value: 10000 },
    { effectiveFrom: '2026-07', value: 12000 },
  ]

  it("resolves a month before any raise to the original salary (Vijay's ₹10,000 in month 3)", () => {
    expect(resolveAsOf(vijaysSalaryHistory, '2026-03')).toBe(10000)
  })

  it('resolves the exact month of a raise to the new salary', () => {
    expect(resolveAsOf(vijaysSalaryHistory, '2026-07')).toBe(12000)
  })

  it('resolves a month after a raise to the new salary', () => {
    expect(resolveAsOf(vijaysSalaryHistory, '2026-09')).toBe(12000)
  })

  it('returns null for a month before any revision exists', () => {
    expect(resolveAsOf(vijaysSalaryHistory, '2025-12')).toBeNull()
  })
})

describe('wasEmployedDuringMonth', () => {
  it('is false for a month before the coach joined', () => {
    expect(wasEmployedDuringMonth('2026-03', null, '2026-01')).toBe(false)
  })

  it('is true for a month after joining, while still active', () => {
    expect(wasEmployedDuringMonth('2026-03', null, '2026-06')).toBe(true)
  })

  it('is true for the exact month a coach left (still on payroll that month)', () => {
    expect(wasEmployedDuringMonth('2026-01', '2026-07', '2026-06')).toBe(true)
  })

  it('is false for a month at or after the coach left', () => {
    expect(wasEmployedDuringMonth('2026-01', '2026-07', '2026-07')).toBe(false)
    expect(wasEmployedDuringMonth('2026-01', '2026-07', '2026-09')).toBe(false)
  })
})
