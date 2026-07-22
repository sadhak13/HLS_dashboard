'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import type { Database } from '@/types/database.types'

type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
type CoachInsert = Database['public']['Tables']['coaches']['Insert']

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  const bytes = randomBytes(12)
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars[bytes[i] % chars.length]
  }
  return password
}

export async function resetCoachPassword(userId: string) {
  const rl = rateLimit(`reset-password:${userId}`, { maxRequests: 3, windowMs: 300_000 })
  if (!rl.success) return { error: rl.error }

  const adminClient = createAdminClient()

  const newPassword = generateSecurePassword()

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
    user_metadata: { must_change_password: true },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, password: newPassword }
}

const coachEditSchema = z.object({
  coachId: z.string().uuid('Invalid coach ID'),
  fullName: z.string().min(3, 'Full name must be at least 3 characters'),
  phone: z.string().optional().default(''),
  batchIds: z.string().transform(s => {
    try { return JSON.parse(s) as string[] } catch { return [] }
  }),
})

export async function updateCoachDetails(formData: FormData) {
  const rl = rateLimit('update-coach', { maxRequests: 10, windowMs: 60_000 })
  if (!rl.success) return { error: rl.error }

  const raw: Record<string, unknown> = {}
  formData.forEach((value, key) => { raw[key] = value })
  const parsed = coachEditSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { coachId, fullName, phone, batchIds } = parsed.data

  if (batchIds.length === 0) {
    return { error: 'At least one batch must be assigned' }
  }

  const adminClient = createAdminClient()

  // Get the coach to find user_id
  const { data: coach, error: fetchError } = await (adminClient as any)
    .from('coaches')
    .select('id, user_id, branch_id')
    .eq('id', coachId)
    .single()

  if (fetchError || !coach) {
    return { error: 'Coach not found' }
  }

  // Update profile name
  const { error: profileError } = await (adminClient as any)
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', coach.user_id)

  if (profileError) {
    return { error: profileError.message }
  }

  // Update coach phone
  const { error: coachError } = await (adminClient as any)
    .from('coaches')
    .update({ phone: phone || null })
    .eq('id', coachId)

  if (coachError) {
    return { error: coachError.message }
  }

  // Replace batch assignments
  await (adminClient as any)
    .from('coach_batches')
    .delete()
    .eq('coach_id', coachId)

  const junctionRecords = batchIds.map(batchId => ({
    coach_id: coachId,
    batch_id: batchId,
  }))
  const { error: batchError } = await (adminClient as any)
    .from('coach_batches')
    .insert(junctionRecords)

  if (batchError) {
    return { error: batchError.message }
  }

  revalidatePath('/coaches')
  return { success: true }
}

export async function deactivateCoach(coachId: string) {
  const rl = rateLimit(`deactivate-coach:${coachId}`, { maxRequests: 3, windowMs: 60_000 })
  if (!rl.success) return { error: rl.error }

  const adminClient = createAdminClient()

  // Get coach user_id to disable auth
  const { data: coach, error: fetchError } = await (adminClient as any)
    .from('coaches')
    .select('user_id')
    .eq('id', coachId)
    .single()

  if (fetchError || !coach) {
    return { error: 'Coach not found' }
  }

  // Set coach status to inactive
  const { error: statusError } = await (adminClient as any)
    .from('coaches')
    .update({ status: 'inactive' })
    .eq('id', coachId)

  if (statusError) {
    return { error: statusError.message }
  }

  // Disable their auth account (ban)
  const { error: authError } = await adminClient.auth.admin.updateUserById(coach.user_id, {
    ban_duration: '876000h', // ~100 years
  })

  if (authError) {
    return { error: authError.message }
  }

  revalidatePath('/coaches')
  return { success: true }
}

export async function reactivateCoach(coachId: string) {
  const rl = rateLimit(`reactivate-coach:${coachId}`, { maxRequests: 3, windowMs: 60_000 })
  if (!rl.success) return { error: rl.error }

  const adminClient = createAdminClient()

  const { data: coach, error: fetchError } = await (adminClient as any)
    .from('coaches')
    .select('user_id')
    .eq('id', coachId)
    .single()

  if (fetchError || !coach) {
    return { error: 'Coach not found' }
  }

  const { error: statusError } = await (adminClient as any)
    .from('coaches')
    .update({ status: 'active' })
    .eq('id', coachId)

  if (statusError) {
    return { error: statusError.message }
  }

  // Unban their auth account
  const { error: authError } = await adminClient.auth.admin.updateUserById(coach.user_id, {
    ban_duration: 'none',
  })

  if (authError) {
    return { error: authError.message }
  }

  revalidatePath('/coaches')
  return { success: true }
}

export async function transferBatches(fromCoachId: string, toCoachId: string) {
  const rl = rateLimit('transfer-batches', { maxRequests: 5, windowMs: 60_000 })
  if (!rl.success) return { error: rl.error }

  if (!fromCoachId || !toCoachId) {
    return { error: 'Both source and target coach are required' }
  }

  if (fromCoachId === toCoachId) {
    return { error: 'Cannot transfer batches to the same coach' }
  }

  const adminClient = createAdminClient()

  // Get batches from source coach
  const { data: sourceBatches, error: fetchError } = await (adminClient as any)
    .from('coach_batches')
    .select('batch_id')
    .eq('coach_id', fromCoachId)

  if (fetchError) {
    return { error: fetchError.message }
  }

  if (!sourceBatches || sourceBatches.length === 0) {
    return { error: 'Source coach has no batches to transfer' }
  }

  // Get existing batches for target to avoid duplicates
  const { data: targetBatches } = await (adminClient as any)
    .from('coach_batches')
    .select('batch_id')
    .eq('coach_id', toCoachId)

  const existingBatchIds = new Set((targetBatches || []).map((b: any) => b.batch_id))
  const newBatches = sourceBatches
    .filter((b: any) => !existingBatchIds.has(b.batch_id))
    .map((b: any) => ({ coach_id: toCoachId, batch_id: b.batch_id }))

  if (newBatches.length > 0) {
    const { error: insertError } = await (adminClient as any)
      .from('coach_batches')
      .insert(newBatches)

    if (insertError) {
      return { error: insertError.message }
    }
  }

  // Remove batches from source coach
  await (adminClient as any)
    .from('coach_batches')
    .delete()
    .eq('coach_id', fromCoachId)

  revalidatePath('/coaches')
  return { success: true, transferred: sourceBatches.length }
}

export async function deleteCoach(coachId: string) {
  const rl = rateLimit(`delete-coach:${coachId}`, { maxRequests: 3, windowMs: 60_000 })
  if (!rl.success) return { error: rl.error }

  const adminClient = createAdminClient()

  // Get coach user_id
  const { data: coach, error: fetchError } = await (adminClient as any)
    .from('coaches')
    .select('user_id')
    .eq('id', coachId)
    .single()

  if (fetchError || !coach) {
    return { error: 'Coach not found' }
  }

  // Delete coach_batches
  await (adminClient as any)
    .from('coach_batches')
    .delete()
    .eq('coach_id', coachId)

  // Delete coach record
  const { error: coachDeleteError } = await (adminClient as any)
    .from('coaches')
    .delete()
    .eq('id', coachId)

  if (coachDeleteError) {
    return { error: coachDeleteError.message }
  }

  // Delete profile
  await (adminClient as any)
    .from('profiles')
    .delete()
    .eq('id', coach.user_id)

  // Delete auth user
  const { error: authError } = await adminClient.auth.admin.deleteUser(coach.user_id)

  if (authError) {
    return { error: authError.message }
  }

  revalidatePath('/coaches')
  return { success: true }
}

const coachFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(3, 'Full name must be at least 3 characters'),
  branchId: z.string().uuid('Invalid branch'),
  phone: z.string().optional().default(''),
  batchIds: z.string().transform(s => {
    try { return JSON.parse(s) as string[] } catch { return [] }
  }),
})

export async function createCoachAccount(formData: FormData) {
  const rl = rateLimit('create-coach', { maxRequests: 5, windowMs: 60_000 })
  if (!rl.success) return { error: rl.error }

  const raw: Record<string, unknown> = {}
  formData.forEach((value, key) => { raw[key] = value })
  const parsed = coachFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { email, fullName, branchId, phone, batchIds } = parsed.data

  if (batchIds.length === 0) {
    return { error: 'At least one batch must be assigned' }
  }

  const password = generateSecurePassword()

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
  if (batchIds.length > 0) {
    const junctionRecords = batchIds.map(batchId => ({
      coach_id: (coachData as any).id,
      batch_id: batchId,
    }))
    await (adminClient as any).from('coach_batches').insert(junctionRecords)
  }

  revalidatePath('/coaches')
  return { success: true, email, password }
}