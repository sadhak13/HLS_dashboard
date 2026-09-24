'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { branchFinanceRevisionSchema, expenseSchema, parseFormData } from '@/lib/validations'
import { rateLimit } from '@/lib/rate-limit'

export async function recordBranchFinanceRevision(formData: FormData) {
  const rl = rateLimit('record-branch-finance-revision', { maxRequests: 10, windowMs: 60_000 })
  if (!rl.success) return { error: rl.error }

  const parsed = parseFormData(branchFinanceRevisionSchema, formData)
  if ('error' in parsed) return parsed

  const { branchId, rentType, rentValue, standardFeePerStudent, effectiveFrom } = parsed
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('branch_finance_revisions')
    .upsert(
      {
        branch_id: branchId,
        rent_type: rentType,
        rent_value: rentValue,
        standard_fee_per_student: standardFeePerStudent,
        effective_from: effectiveFrom,
      },
      { onConflict: 'branch_id,effective_from' }
    )

  if (error) return { error: error.message }

  revalidatePath('/expenses')
  return { success: true }
}

export async function addExpense(formData: FormData) {
  const rl = rateLimit('add-expense', { maxRequests: 10, windowMs: 60_000 })
  if (!rl.success) return { error: rl.error }

  const parsed = parseFormData(expenseSchema, formData)
  if ('error' in parsed) return parsed

  const { branchId, category, amount, month, description } = parsed
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('expenses')
    .insert({ branch_id: branchId || null, category, amount, month, description })

  if (error) return { error: error.message }

  revalidatePath('/expenses')
  return { success: true }
}

export async function deleteExpense(expenseId: string) {
  const rl = rateLimit(`delete-expense:${expenseId}`, { maxRequests: 10, windowMs: 60_000 })
  if (!rl.success) return { error: rl.error }

  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('expenses')
    .delete()
    .eq('id', expenseId)

  if (error) return { error: error.message }

  revalidatePath('/expenses')
  return { success: true }
}
