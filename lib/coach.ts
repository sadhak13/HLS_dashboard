import { createClient } from '@/lib/supabase/client'
import { ROLES, type Role } from '@/constants/roles'

export interface CoachBranch {
  id: string
  name: string
}

export interface CoachBatchInfo {
  batchIds: string[]
  branchIds: string[]
  /** true when there are no specific batch assignments and access falls back to branch-level */
  isBranchFallback: boolean
}

/**
 * Returns the branches the given staff member (coach or manager) is assigned to.
 * A coach's branches come from their batch assignments (or their home branch,
 * if unassigned); a manager's is always just their single home branch.
 * This is used for branch-level UI filters — not for data scoping.
 */
export async function getCoachBranches(userId: string, role: Role = ROLES.COACH): Promise<CoachBranch[]> {
  const supabase = createClient()

  if (role === ROLES.MANAGER) {
    const { data: managerData } = await (supabase as any)
      .from('managers')
      .select('branch_id, branches (id, name)')
      .eq('user_id', userId)
      .maybeSingle()

    if (!managerData?.branches) return []
    return [{ id: managerData.branches.id, name: managerData.branches.name }]
  }

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
 * Returns the staff member's own batch IDs and branch IDs, used to scope
 * player/fee/attendance queries.
 * Results are cached in memory for the duration of the browser session.
 * A coach falls back to branch-level IDs only if they have no batch
 * assignments; a manager is always branch-level (isBranchFallback: true),
 * since managers oversee an entire branch rather than specific batches.
 */
export async function getCoachBatchInfo(userId: string, role: Role = ROLES.COACH): Promise<CoachBatchInfo> {
  // Return cached result if available (avoids DB hit on every page revisit)
  if (batchInfoCache.has(userId)) {
    return batchInfoCache.get(userId)!
  }

  const supabase = createClient()

  if (role === ROLES.MANAGER) {
    const { data: managerData } = await (supabase as any)
      .from('managers')
      .select('branch_id')
      .eq('user_id', userId)
      .maybeSingle()

    const result: CoachBatchInfo = managerData?.branch_id
      ? { batchIds: [], branchIds: [managerData.branch_id], isBranchFallback: true }
      : { batchIds: [], branchIds: [], isBranchFallback: false }

    batchInfoCache.set(userId, result)
    return result
  }

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
