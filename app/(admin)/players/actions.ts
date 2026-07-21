'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { playerSchema, parseFormData } from '@/lib/validations'

export async function createAdminPlayer(formData: FormData) {
  const parsed = parseFormData(playerSchema, formData)
  if ('error' in parsed) return parsed

  const { fullName: cleanFullName, parentPhone: cleanParentPhone, branchId, batchId, dob, gender, parentName, status, enrolledDate, aadharNumber } = parsed

  const supabase = createAdminClient()

  try {
    const { data: existing } = await (supabase as any)
      .from('players')
      .select('id')
      .eq('full_name', cleanFullName)
      .eq('parent_phone', cleanParentPhone)
      .single()

    if (existing) {
      return { error: `Player "${cleanFullName}" with phone "${cleanParentPhone}" already exists in the system` }
    }

    const insertData: any = {
      branch_id: branchId,
      full_name: cleanFullName,
      date_of_birth: dob,
      gender: gender,
      parent_name: parentName?.trim(),
      parent_phone: cleanParentPhone,
      enrolled_date: enrolledDate,
      status: status,
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

    if (insertError) throw insertError

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

    revalidatePath('/players')
    return { success: true, player: newPlayer }
  } catch (err: any) {
    return { error: err.message || 'Failed to create player' }
  }
}

export async function updateAdminPlayer(playerId: string, formData: FormData) {
  const parsed = parseFormData(playerSchema, formData)
  if ('error' in parsed) return parsed

  const { fullName: cleanFullName, parentPhone: cleanParentPhone, branchId, batchId, dob, gender, parentName, status, aadharNumber } = parsed

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
      return { error: `Another player "${cleanFullName}" with phone "${cleanParentPhone}" already exists in the system` }
    }

    const updateData: any = {
      branch_id: branchId,
      batch_id: batchId || null,
      full_name: cleanFullName,
      date_of_birth: dob,
      gender: gender,
      parent_name: parentName?.trim(),
      parent_phone: cleanParentPhone,
      status: status,
      aadhar_number: (aadharNumber && aadharNumber.length === 12) ? `XXXX-XXXX-${aadharNumber.slice(-4)}` : null,
    }

    const { error: updateError } = await (supabase as any)
      .from('players')
      .update(updateData)
      .eq('id', playerId)

    if (updateError) throw updateError

    revalidatePath('/players')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to update player' }
  }
}

export async function deleteAdminPlayer(playerId: string) {
  const supabase = createAdminClient()

  try {
    const { error } = await (supabase as any)
      .from('players')
      .update({ status: 'dropped' })
      .eq('id', playerId)

    if (error) throw error

    revalidatePath('/players')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to delete player' }
  }
}

export async function permanentDeleteAdminPlayer(playerId: string) {
  const supabase = createAdminClient()

  try {
    // Delete attendance records first (foreign key dependency)
    await (supabase as any)
      .from('attendance')
      .delete()
      .eq('player_id', playerId)

    // Delete fee records
    await (supabase as any)
      .from('fees')
      .delete()
      .eq('player_id', playerId)

    // Delete the player record
    const { error } = await (supabase as any)
      .from('players')
      .delete()
      .eq('id', playerId)

    if (error) throw error

    revalidatePath('/players')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to permanently delete player' }
  }
}
