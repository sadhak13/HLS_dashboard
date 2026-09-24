'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { forecastAssumptionsSchema, parseFormData } from '@/lib/validations'
import { rateLimit } from '@/lib/rate-limit'

export async function saveForecastAssumptions(formData: FormData) {
  const rl = rateLimit('save-forecast-assumptions', { maxRequests: 10, windowMs: 60_000 })
  if (!rl.success) return { error: rl.error }

  const parsed = parseFormData(forecastAssumptionsSchema, formData)
  if ('error' in parsed) return parsed

  const { branchId, monthlyRevenueGrowthPct, annualRentGrowthPct, annualSalaryGrowthPct } = parsed
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('forecast_assumptions')
    .upsert(
      {
        branch_id: branchId,
        monthly_revenue_growth_pct: monthlyRevenueGrowthPct,
        annual_rent_growth_pct: annualRentGrowthPct,
        annual_salary_growth_pct: annualSalaryGrowthPct,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'branch_id' }
    )

  if (error) return { error: error.message }

  revalidatePath('/expenses/forecast')
  return { success: true }
}
