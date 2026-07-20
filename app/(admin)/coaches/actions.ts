'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database.types'

type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
type CoachInsert = Database['public']['Tables']['coaches']['Insert']

export async function resetCoachPassword(userId: string) {
  const adminClient = createAdminClient()

  const newPassword = 'Welcome123!'

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
    user_metadata: { must_change_password: true },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, password: newPassword }
}

export async function createCoachAccount(formData: FormData) {
  const email = formData.get('email') as string
  const fullName = formData.get('fullName') as string
  const branchId = formData.get('branchId') as string
  const phone = formData.get('phone') as string
  const batchIdsJson = formData.get('batchIds') as string

  const password = 'Welcome123!'

  const adminClient = createAdminClient()

  // 1. Create the user in Supabase Auth
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: {
      must_change_password: true,
    },
  })

  if (authError) {
    return { error: authError.message }
  }

  const userId = authData.user.id

  // 2. Create the profile record
  const profilePayload: ProfileInsert = {
    id: userId,
    role: 'COACH',
    full_name: fullName,
  }
  const { error: profileError } = await adminClient
    .from('profiles')
    .insert(profilePayload as any)

  if (profileError) {
    await adminClient.auth.admin.deleteUser(userId)
    return { error: profileError.message }
  }

  // 3. Create the coach record (keeps branch_id for backwards compat)
  const coachPayload: CoachInsert = { user_id: userId, branch_id: branchId, phone: phone || null }
  const { data: coachData, error: coachError } = await adminClient
    .from('coaches')
    .insert(coachPayload as any)
    .select('id')
    .single()

  if (coachError) {
    await adminClient.auth.admin.deleteUser(userId)
    return { error: coachError.message }
  }

  // 4. Create coach_batches junction records
  if (batchIdsJson) {
    try {
      const batchIds: string[] = JSON.parse(batchIdsJson)
      if (batchIds.length > 0) {
        const junctionRecords = batchIds.map(batchId => ({
          coach_id: (coachData as any).id,
          batch_id: batchId,
        }))
        await (adminClient as any).from('coach_batches').insert(junctionRecords)
      }
    } catch {
      // Non-critical: coach is created, batch assignments can be added later
    }
  }

  revalidatePath('/coaches')
  return { success: true, email, password }
}