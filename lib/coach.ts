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
 * Module-level session cache for coach batch info.
 * Batch/branch assignments rarely change mid-session, so we cache the result
 * to avoid extra DB round-trips on every page navigation.
 */
const batchInfoCache = new Map<string, CoachBatchInfo>()

/** Call this when coach logs out or assignments change, to bust the cache. */
export function clearCoachBatchInfoCache(userId?: string) {
  if (userId) {
    batchInfoCache.delete(userId)
  } else {
    batchInfoCache.clear()
  }
}

/**
 * Returns the coach's own batch IDs and branch IDs.
 * Results are cached in memory for the duration of the browser session.
 * Use this to scope player/fee/attendance queries to the coach's specific batches.
 * Falls back to branch-level IDs only if the coach has no batch assignments.
 */
export async function getCoachBatchInfo(userId: string): Promise<CoachBatchInfo> {
  // Return cached result if available (avoids DB hit on every page revisit)
  if (batchInfoCache.has(userId)) {
    return batchInfoCache.get(userId)!
  }

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

  let result: CoachBatchInfo

  if (coachBatches && coachBatches.length > 0) {
    const batchIds = coachBatches.map((cb: any) => cb.batch_id).filter(Boolean)
    const branchSet = new Set<string>()
    for (const cb of coachBatches) {
      const branchId = cb.batches?.branch_id
      if (branchId) branchSet.add(branchId)
    }
    result = { batchIds, branchIds: Array.from(branchSet), isBranchFallback: false }
  } else {
    // Fallback: coach has no batch assignments — use branch-level access
    const branchIds = coachData.branch_id ? [coachData.branch_id] : []
    result = { batchIds: [], branchIds, isBranchFallback: true }
  }

  batchInfoCache.set(userId, result)
  return result
}
