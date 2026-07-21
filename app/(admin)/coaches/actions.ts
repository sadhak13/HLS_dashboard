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