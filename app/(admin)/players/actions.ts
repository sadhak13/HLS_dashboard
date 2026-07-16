'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createAdminPlayer(formData: FormData) {
  const fullName = formData.get('fullName') as string
  const dob = formData.get('dob') as string
  const gender = formData.get('gender') as string || 'male'
  const parentName = formData.get('parentName') as string
  const parentPhone = formData.get('parentPhone') as string
  const branchId = formData.get('branchId') as string
  const batchId = formData.get('batchId') as string
  const status = formData.get('status') as string || 'active'
  const enrolledDate = formData.get('enrolledDate') as string || new Date().toISOString().split('T')[0]
  const aadharNumber = formData.get('aadharNumber') as string

  const cleanFullName = fullName?.trim().replace(/\s+/g, ' ')
  const cleanParentPhone = parentPhone?.trim()

  if (!cleanFullName) return { error: 'Full name is required' }
  if (!cleanParentPhone) return { error: 'Parent phone is required' }
  if (!branchId) return { error: 'Branch is required' }

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
      insertData.aadhar_number = aadharNumber
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
  const fullName = formData.get('fullName') as string
  const dob = formData.get('dob') as string
  const gender = formData.get('gender') as string || 'male'
  const parentName = formData.get('parentName') as string
  const parentPhone = formData.get('parentPhone') as string
  const branchId = formData.get('branchId') as string
  const batchId = formData.get('batchId') as string
  const status = formData.get('status') as string
  const aadharNumber = formData.get('aadharNumber') as string

  const cleanFullName = fullName?.trim().replace(/\s+/g, ' ')
  const cleanParentPhone = parentPhone?.trim()

  if (!cleanFullName) return { error: 'Full name is required' }
  if (!cleanParentPhone) return { error: 'Parent phone is required' }
  if (!branchId) return { error: 'Branch is required' }

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
      aadhar_number: (aadharNumber && aadharNumber.length === 12) ? aadharNumber : null,
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
