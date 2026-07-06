'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

/**
 * Creates a new player from the admin dashboard
 * Validates: name + phone globally unique
 */
export async function createAdminPlayer(formData: FormData) {
  const fullName = formData.get('fullName') as string
  const dob = formData.get('dob') as string
  const parentName = formData.get('parentName') as string
  const parentPhone = formData.get('parentPhone') as string
  const branchId = formData.get('branchId') as string
  const status = formData.get('status') as string || 'active'
  const enrolledDate = formData.get('enrolledDate') as string || new Date().toISOString().split('T')[0]

  const cleanFullName = fullName?.trim().replace(/\s+/g, ' ')
  const cleanParentPhone = parentPhone?.trim()

  // Validation
  if (!cleanFullName) return { error: 'Full name is required' }
  if (!cleanParentPhone) return { error: 'Parent phone is required' }
  if (!branchId) return { error: 'Branch is required' }

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
    const { data: newPlayer, error: insertError } = await (supabase as any)
      .from('players')
      .insert({
        branch_id: branchId,
        full_name: cleanFullName,
        date_of_birth: dob,
        parent_name: parentName?.trim(),
        parent_phone: cleanParentPhone,
        enrolled_date: enrolledDate,
        status: status,
      })
      .select()
      .single()

    if (insertError) throw insertError
    
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

    revalidatePath('/players')
    return { success: true, player: newPlayer }
  } catch (err: any) {
    return { error: err.message || 'Failed to create player' }
  }
}

/**
 * Updates an existing player
 */
export async function updateAdminPlayer(playerId: string, formData: FormData) {
  const fullName = formData.get('fullName') as string
  const dob = formData.get('dob') as string
  const parentName = formData.get('parentName') as string
  const parentPhone = formData.get('parentPhone') as string
  const branchId = formData.get('branchId') as string
  const status = formData.get('status') as string

  const cleanFullName = fullName?.trim().replace(/\s+/g, ' ')
  const cleanParentPhone = parentPhone?.trim()

  if (!cleanFullName) return { error: 'Full name is required' }
  if (!cleanParentPhone) return { error: 'Parent phone is required' }
  if (!branchId) return { error: 'Branch is required' }

  const supabase = createAdminClient()

  try {
    // Check for duplicate when updating (excluding the current player)
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

    const { error: updateError } = await (supabase as any)
      .from('players')
      .update({
        branch_id: branchId,
        full_name: cleanFullName,
        date_of_birth: dob,
        parent_name: parentName?.trim(),
        parent_phone: cleanParentPhone,
        status: status,
      })
      .eq('id', playerId)

    if (updateError) throw updateError

    revalidatePath('/players')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to update player' }
  }
}

/**
 * Soft delete player - mark as DROPPED
 */
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
