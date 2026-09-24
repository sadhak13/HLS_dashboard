export type RentType = 'fixed' | 'percentage'

export interface BranchFinanceInput {
  revenue: number
  rentType: RentType
  rentValue: number
  standardFeePerStudent: number
  totalSalary: number
  miscExpense: number
}

export interface BranchFinanceSummary {
  rentExpense: number
  totalExpense: number
  netProfit: number
  breakEvenStudents: number | null
}

export function computeBranchFinanceSummary(input: BranchFinanceInput): BranchFinanceSummary {
  const { revenue, rentType, rentValue, standardFeePerStudent, totalSalary, miscExpense } = input

  const rentExpense = rentType === 'fixed' ? rentValue : revenue * (rentValue / 100)
  const totalExpense = rentExpense + totalSalary + miscExpense
  const netProfit = revenue - totalExpense

  let breakEvenStudents: number | null = null
  if (standardFeePerStudent > 0) {
    if (rentType === 'fixed') {
      breakEvenStudents = Math.ceil((rentValue + totalSalary + miscExpense) / standardFeePerStudent)
    } else if (rentValue < 100) {
      const effectiveFeePerStudent = standardFeePerStudent * (1 - rentValue / 100)
      breakEvenStudents = Math.ceil((totalSalary + miscExpense) / effectiveFeePerStudent)
    }
  }

  return { rentExpense, totalExpense, netProfit, breakEvenStudents }
}

export interface EffectiveDatedValue<T> {
  effectiveFrom: string // YYYY-MM
  value: T
}

/** Resolves the latest revision effective at or before `month`; null if none applies yet. */
export function resolveAsOf<T>(history: EffectiveDatedValue<T>[], month: string): T | null {
  const applicable = history
    .filter(h => h.effectiveFrom <= month)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
  return applicable.length > 0 ? applicable[0].value : null
}

/** True if a coach who joined in `createdAtMonth` (and left in `deactivatedAtMonth`, if ever) was employed during `month`. */
export function wasEmployedDuringMonth(createdAtMonth: string, deactivatedAtMonth: string | null, month: string): boolean {
  if (month < createdAtMonth) return false
  if (deactivatedAtMonth && month >= deactivatedAtMonth) return false
  return true
}
