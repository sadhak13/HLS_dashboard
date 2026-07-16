import { createClient } from '@/lib/supabase/client'

export interface CoachBranch {
  id: string
  name: string
}

/**
 * Resolves all branches a coach is assigned to via coach_batches → batches → branches.
 * Falls back to the single coaches.branch_id if no coach_batches exist.
 */
export async function getCoachBranches(userId: string): Promise<CoachBranch[]> {
  const supabase = createClient()

  const { data: coachData } = await (supabase as any)
    .from('coaches')
    .select('id, branch_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!coachData) return []

  const { data: coachBatches } = await (supabase as any)
    .from('coach_batches')
    .select('batch_id, batches (branch_id, branches (id, name))')
    .eq('coach_id', coachData.id)

  if (coachBatches && coachBatches.length > 0) {
    const branchMap = new Map<string, string>()
    for (const cb of coachBatches) {
      const branch = cb.batches?.branches
      if (branch && !branchMap.has(branch.id)) {
        branchMap.set(branch.id, branch.name)
      }
    }
    if (branchMap.size > 0) {
      return Array.from(branchMap.entries()).map(([id, name]) => ({ id, name }))
    }
  }

  // Fallback: use the single branch_id from coaches table
  if (coachData.branch_id) {
    const { data: branchData } = await (supabase as any)
      .from('branches')
      .select('id, name')
      .eq('id', coachData.branch_id)
      .single()
    if (branchData) return [branchData]
  }

  return []
}
