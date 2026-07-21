'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Creates a new player for coach's branch
 * Validates: name + phone globally unique
 */
export async function createCoachPlayer(formData: FormData) {
  const fullName = formData.get('fullName') as string
  const dob = formData.get('dob') as string
  const gender = formData.get('gender') as string || 'male'
  const parentName = formData.get('parentName') as string
  const parentPhone = formData.get('parentPhone') as string
  const branchId = formData.get('branchId') as string
  const batchId = formData.get('batchId') as string
  const enrolledDate = formData.get('enrolledDate') as string
  const aadharNumber = formData.get('aadharNumber') as string

  // Normalize: trim + collapse internal spaces to prevent whitespace-based duplicate bypass
  const cleanFullName = fullName?.trim().replace(/\s+/g, ' ')
  const cleanParentPhone = parentPhone?.trim()

  // Validation
  if (!cleanFullName) {
    return { error: 'Full name is required' }
  }
  if (!cleanParentPhone) {
    return { error: 'Parent phone is required' }
  }

  const supabase = createAdminClient()

  try {
    // Check for duplicate: same full_name + parent_phone combination globally
    const { data: existing } = await (supabase as any)
      .from('players')
      .select('id')
      .eq('full_name', cleanFullName)
      .eq('parent_phone', cleanParentPhone)
      .single()

    if (existing) {
      return { error: `Player "${cleanFullName}" with phone "${cleanParentPhone}" already exists in the system` }
    }

    // Create player
    const insertData: any = {
      branch_id: branchId,
      full_name: cleanFullName,
      date_of_birth: dob,
      gender: gender,
      parent_name: parentName.trim(),
      parent_phone: cleanParentPhone,
      enrolled_date: enrolledDate,
      status: 'active',
    }
    if (batchId) {
      insertData.batch_id = batchId
    }
    if (aadharNumber && aadharNumber.length === 12) {
      insertData.aadhar_number = `XXXX-XXXX-${aadharNumber.slice(-4)}`
    }

    const { data: newPlayer, error: insertError } = await (supabase as any)
      .from('players')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    // Auto-create a pending fee record for the enrollment month
    const date = new Date(enrolledDate)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    await (supabase as any).from('fees').insert({
      player_id: newPlayer.id,
      branch_id: branchId,
      month: month,
      amount: 2000,
      status: 'pending',
      mode_of_payment: null,
    })

    revalidatePath('/my-players')
    return { success: true, playerId: newPlayer.id, playerName: newPlayer.full_name }
  } catch (err: any) {
    return { error: err.message || 'Failed to create player' }
  }
}

/**
 * Updates player details (coach can edit players in their branch)
 */
export async function updateCoachPlayer(playerId: string, formData: FormData) {
  const fullName = formData.get('fullName') as string
  const dob = formData.get('dob') as string
  const gender = formData.get('gender') as string || 'male'
  const parentName = formData.get('parentName') as string
  const parentPhone = formData.get('parentPhone') as string
  const aadharNumber = formData.get('aadharNumber') as string
  const batchId = formData.get('batchId') as string

  const cleanFullName = fullName?.trim().replace(/\s+/g, ' ')
  const cleanParentPhone = parentPhone?.trim()

  if (!cleanFullName) return { error: 'Full name is required' }
  if (!cleanParentPhone) return { error: 'Parent phone is required' }

  const supabase = createAdminClient()

  try {
    const { data: existing } = await (supabase as any)
      .from('players')
      .select('id')
      .eq('full_name', cleanFullName)
      .eq('parent_phone', cleanParentPhone)
      .neq('id', playerId)
      .single()

    if (existing) {
      return { error: `Another player "${cleanFullName}" with phone "${cleanParentPhone}" already exists` }
    }

    const updateData: any = {
      full_name: cleanFullName,
      date_of_birth: dob || null,
      gender: gender,
      parent_name: parentName?.trim() || null,
      parent_phone: cleanParentPhone,
      batch_id: batchId || null,
      aadhar_number: (aadharNumber && aadharNumber.length === 12) ? `XXXX-XXXX-${aadharNumber.slice(-4)}` : null,
    }

    const { error: updateError } = await (supabase as any)
      .from('players')
      .update(updateData)
      .eq('id', playerId)

    if (updateError) throw updateError

    revalidatePath('/my-players')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to update player' }
  }
}

/**
 * Soft delete player - mark as DROPPED
 */
export async function deleteCoachPlayer(playerId: string) {
  const supabase = createAdminClient()

  try {
    const { error } = await (supabase as any)
      .from('players')
      .update({ status: 'dropped' })
      .eq('id', playerId)

    if (error) throw error

    revalidatePath('/my-players')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to delete player' }
  }
}

/**
 * Creates initial fee for a newly added player
 * Auto-populated with defaults
 */
export async function createInitialPlayerFee(
  playerId: string,
  branchId: string,
  startDate: string, // enrolled_date
  amount: number,
  modeOfPayment: 'cash' | 'online' | 'cash+online'
) {
  const supabase = createAdminClient()

  try {
    // Calculate month from enrolled date
    const date = new Date(startDate)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    // Check if fee already exists for this month (it should, due to auto-creation)
    const { data: existing } = await (supabase as any)
      .from('fees')
      .select('id')
      .eq('player_id', playerId)
      .eq('month', month)
      .single()

    if (existing) {
      // Update the auto-created fee
      const { error: updateError } = await (supabase as any)
        .from('fees')
        .update({
          amount,
          mode_of_payment: modeOfPayment,
          // Depending on the flow, we might keep it pending or mark it paid. 
          // Assuming it stays pending based on previous code.
        })
        .eq('id', existing.id)

      if (updateError) throw updateError
      
      revalidatePath('/my-fees')
      return { success: true, feeId: existing.id }
    } else {
      // Insert new if it somehow doesn't exist
      const { data: newFee, error: insertError } = await (supabase as any)
        .from('fees')
        .insert({
          player_id: playerId,
          branch_id: branchId,
          month,
          amount,
          status: 'pending',
          mode_of_payment: modeOfPayment,
        })
        .select()
        .single()

      if (insertError) throw insertError

      revalidatePath('/my-fees')
      return { success: true, feeId: newFee.id }
    }
  } catch (err: any) {
    return { error: err.message || 'Failed to create fee' }
  }
}

/**
 * Generates next month fees for all ACTIVE players in coach's branch
 */
export async function generateNextMonthFees(branchId: string) {
  const supabase = createAdminClient()

  try {
    // Get all active players in branch
    const { data: players, error: playersError } = await (supabase as any)
      .from('players')
      .select('id')
      .eq('branch_id', branchId)
      .eq('status', 'active')

    if (playersError) throw playersError
    if (!players || players.length === 0) {
      return { message: 'No active players found' }
    }

    // Calculate next month
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const monthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`

    // Check which players already have fees for next month
    const { data: existingFees } = await (supabase as any)
      .from('fees')
      .select('player_id')
      .eq('branch_id', branchId)
      .eq('month', monthStr)

    const existingPlayerIds = new Set(existingFees?.map((f: any) => f.player_id) || [])

    // Create fees for players without fees for next month
    const playersToCreateFeesFor = players.filter((p: any) => !existingPlayerIds.has(p.id))

    if (playersToCreateFeesFor.length === 0) {
      return { message: 'All players already have fees for next month' }
    }

    const feesToInsert = playersToCreateFeesFor.map((player: any) => ({
      player_id: player.id,
      branch_id: branchId,
      month: monthStr,
      amount: 2000, // Default amount
      status: 'pending',
      mode_of_payment: null, // Will be set when marking as paid
    }))

    const { error: insertError } = await (supabase as any)
      .from('fees')
      .insert(feesToInsert)

    if (insertError) throw insertError

    revalidatePath('/my-fees')
    return { success: true, createdCount: playersToCreateFeesFor.length }
  } catch (err: any) {
    return { error: err.message || 'Failed to generate fees' }
  }
}
