import { createClient } from '@/lib/supabase/client'

export interface CoachBranch {
  id: string
  name: string
}

export interface CoachBatchInfo {
  batchIds: string[]
  branchIds: string[]
  /** true when the coach has no batch assignments and falls back to branch-level access */
  isBranchFallback: boolean
}

/**
 * Returns the branches the coach is assigned to (via their batch assignments).
 * This is used for branch-level UI filters — not for data scoping.
 */
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

/**
 * Returns the coach's own batch IDs and branch IDs.
 * Use this to scope player/fee/attendance queries to the coach's specific batches.
 * Falls back to branch-level IDs only if the coach has no batch assignments.
 */
export async function getCoachBatchInfo(userId: string): Promise<CoachBatchInfo> {
  const supabase = createClient()

  const { data: coachData } = await (supabase as any)
    .from('coaches')
    .select('id, branch_id, branches (id, name)')
    .eq('user_id', userId)
    .maybeSingle()

  if (!coachData) return { batchIds: [], branchIds: [], isBranchFallback: false }

  const { data: coachBatches } = await (supabase as any)
    .from('coach_batches')
    .select('batch_id, batches (id, branch_id, branches (id, name))')
    .eq('coach_id', coachData.id)

  if (coachBatches && coachBatches.length > 0) {
    const batchIds = coachBatches.map((cb: any) => cb.batch_id).filter(Boolean)
    const branchSet = new Set<string>()
    for (const cb of coachBatches) {
      const branchId = cb.batches?.branch_id
      if (branchId) branchSet.add(branchId)
    }
    return { batchIds, branchIds: Array.from(branchSet), isBranchFallback: false }
  }

  // Fallback: coach has no batch assignments — use branch-level access
  const branchIds = coachData.branch_id ? [coachData.branch_id] : []
  return { batchIds: [], branchIds, isBranchFallback: true }
}
