import { createClient } from '@/lib/supabase/client'

export interface CoachBranch {
  id: string
  name: string
}

export async function getCoachBranches(userId: string): Promise<CoachBranch[]> {
  const supabase = createClient()

  const { data: coachData } = await (supabase as any)
    .from('coaches')
    .select('id, branch_id, branches (id, name)')
    .eq('user_id', userId)
    .maybeSingle()

  if (!coachData) return []

  const { data: coachBatches } = await (supabase as any)
    .from('coach_batches')
    .select('batch_id, batches (branch_id, branches (id, name))')
    .eq('coach_id', coachData.id)

  const branchMap = new Map<string, string>()

  if (coachBatches && coachBatches.length > 0) {
    for (const cb of coachBatches) {
      const branch = cb.batches?.branches
      if (branch) branchMap.set(branch.id, branch.name)
    }
  }

  if (branchMap.size === 0 && coachData.branches) {
    branchMap.set(coachData.branches.id, coachData.branches.name)
  }

  return Array.from(branchMap.entries()).map(([id, name]) => ({ id, name }))
}
