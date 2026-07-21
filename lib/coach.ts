import { createClient } from '@/lib/supabase/client'

export interface CoachBranch {
  id: string
  name: string
}

export async function getCoachBranches(userId: string): Promise<CoachBranch[]> {
  const supabase = createClient()

  const { data: coachData } = await (supabase as any)
    .from('coaches')
    .select('id, branch_id, branches (id, name), coach_batches (batches (branch_id, branches (id, name)))')
    .eq('user_id', userId)
    .maybeSingle()

  if (!coachData) return []

  const branchMap = new Map<string, string>()

  if (coachData.coach_batches && coachData.coach_batches.length > 0) {
    for (const cb of coachData.coach_batches) {
      const branch = cb.batches?.branches
      if (branch) branchMap.set(branch.id, branch.name)
    }
  }

  if (branchMap.size === 0 && coachData.branches) {
    branchMap.set(coachData.branches.id, coachData.branches.name)
  }

  return Array.from(branchMap.entries()).map(([id, name]) => ({ id, name }))
}
