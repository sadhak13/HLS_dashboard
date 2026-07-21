'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format')

export async function generateNextMonthFeesForAllBranches(targetMonth: string) {
  const rl = rateLimit('generate-fees-all', { maxRequests: 3, windowMs: 60_000 })
  if (!rl.success) return { error: rl.error }

  const validated = monthSchema.safeParse(targetMonth)
  if (!validated.success) return { error: validated.error.issues[0].message }
  const supabase = createAdminClient()

  try {
    // Get all active players
    const { data: players, error: playersError } = await (supabase as any)
      .from('players')
      .select('id, branch_id')
      .eq('status', 'active')

    if (playersError) throw playersError
    if (!players || players.length === 0) {
      return { message: 'No active players found' }
    }

    // Use provided targetMonth (format YYYY-MM)
    const monthStr = targetMonth

    // Check which players already have fees for next month
    const { data: existingFees } = await (supabase as any)
      .from('fees')
      .select('player_id')
      .eq('month', monthStr)

    const existingPlayerIds = new Set(existingFees?.map((f: any) => f.player_id) || [])

    // Filter players without fees for next month
    const playersToCreateFeesFor = players.filter((p: any) => !existingPlayerIds.has(p.id))

    if (playersToCreateFeesFor.length === 0) {
      return { message: `All active players already have fees for ${monthStr}` }
    }

    // Create fees for each player
    const feesToInsert = playersToCreateFeesFor.map((player: any) => ({
      player_id: player.id,
      branch_id: player.branch_id,
      month: monthStr,
      amount: 2000, // Default amount
      status: 'pending',
      mode_of_payment: null, // Will be set when marking as paid
    }))

    const { error: insertError } = await (supabase as any)
      .from('fees')
      .insert(feesToInsert)

    if (insertError) throw insertError

    revalidatePath('/fees')
    return { success: true, createdCount: playersToCreateFeesFor.length }
  } catch (err: any) {
    return { error: err.message || 'Failed to generate fees' }
  }
}

/**
 * Generates next month fees for all ACTIVE players in a specific branch
 */
export async function generateNextMonthFeesForBranch(branchId: string, targetMonth: string) {
  const validatedMonth = monthSchema.safeParse(targetMonth)
  if (!validatedMonth.success) return { error: validatedMonth.error.issues[0].message }

  const validatedBranch = z.string().uuid().safeParse(branchId)
  if (!validatedBranch.success) return { error: 'Invalid branch ID' }

  const supabase = createAdminClient()

  try {
    const { data: players, error: playersError } = await (supabase as any)
      .from('players')
      .select('id')
      .eq('branch_id', branchId)
      .eq('status', 'active')

    if (playersError) throw playersError
    if (!players || players.length === 0) {
      return { message: 'No active players found in this branch' }
    }

    const monthStr = targetMonth

    const { data: existingFees } = await (supabase as any)
      .from('fees')
      .select('player_id')
      .eq('branch_id', branchId)
      .eq('month', monthStr)

    const existingPlayerIds = new Set(existingFees?.map((f: any) => f.player_id) || [])
    const playersToCreateFeesFor = players.filter((p: any) => !existingPlayerIds.has(p.id))

    if (playersToCreateFeesFor.length === 0) {
      return { message: `All active players in this branch already have fees for ${monthStr}` }
    }

    const feesToInsert = playersToCreateFeesFor.map((player: any) => ({
      player_id: player.id,
      branch_id: branchId,
      month: monthStr,
      amount: 2000,
      status: 'pending',
      mode_of_payment: null,
    }))

    const { error: insertError } = await (supabase as any)
      .from('fees')
      .insert(feesToInsert)

    if (insertError) throw insertError

    revalidatePath('/fees')
    return { success: true, createdCount: playersToCreateFeesFor.length }
  } catch (err: any) {
    return { error: err.message || 'Failed to generate fees' }
  }
}

export async function generateFeesForBranches(branchIds: string[], targetMonth: string) {
  const validatedMonth = monthSchema.safeParse(targetMonth)
  if (!validatedMonth.success) return { error: validatedMonth.error.issues[0].message }

  if (!branchIds.length) return { error: 'No branches provided' }

  const rl = rateLimit('generate-fees-branches', { maxRequests: 3, windowMs: 60_000 })
  if (!rl.success) return { error: rl.error }

  const supabase = createAdminClient()

  try {
    const { data: players, error: playersError } = await (supabase as any)
      .from('players')
      .select('id, branch_id')
      .in('branch_id', branchIds)
      .eq('status', 'active')

    if (playersError) throw playersError
    if (!players || players.length === 0) {
      return { message: 'No active players found' }
    }

    const { data: existingFees } = await (supabase as any)
      .from('fees')
      .select('player_id')
      .in('branch_id', branchIds)
      .eq('month', targetMonth)

    const existingPlayerIds = new Set(existingFees?.map((f: any) => f.player_id) || [])
    const playersToCreateFeesFor = players.filter((p: any) => !existingPlayerIds.has(p.id))

    if (playersToCreateFeesFor.length === 0) {
      return { message: 'All players already have fees for this month' }
    }

    const feesToInsert = playersToCreateFeesFor.map((player: any) => ({
      player_id: player.id,
      branch_id: player.branch_id,
      month: targetMonth,
      amount: 2000,
      status: 'pending',
      mode_of_payment: null,
    }))

    const { error: insertError } = await (supabase as any)
      .from('fees')
      .insert(feesToInsert)

    if (insertError) throw insertError

    revalidatePath('/my-fees')
    revalidatePath('/fees')
    return { success: true, createdCount: playersToCreateFeesFor.length }
  } catch (err: any) {
    return { error: err.message || 'Failed to generate fees' }
  }
}
