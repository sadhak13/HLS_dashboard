'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import type { Database } from '@/types/database.types'

type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
type ManagerInsert = Database['public']['Tables']['managers']['Insert']

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  const bytes = randomBytes(12)
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars[bytes[i] % chars.length]
  }
  return password
}

export async function resetManagerPassword(userId: string) {
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

export async function getManagerEmail(userId: string) {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.auth.admin.getUserById(userId)
  if (error || !data.user) return { email: '' }
  return { email: data.user.email || '' }
}

const managerEditSchema = z.object({
  managerId: z.string().uuid('Invalid manager ID'),
  fullName: z.string().min(3, 'Full name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().default(''),
  branchId: z.string().uuid('Invalid branch'),
})

export async function updateManagerDetails(formData: FormData) {
  const rl = rateLimit('update-manager', { maxRequests: 10, windowMs: 60_000 })
  if (!rl.success) return { error: rl.error }

  const raw: Record<string, unknown> = {}
  formData.forEach((value, key) => { raw[key] = value })
  const parsed = managerEditSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { managerId, fullName, email, phone, branchId } = parsed.data

  const adminClient = createAdminClient()

  const { data: manager, error: fetchError } = await (adminClient as any)
    .from('managers')
    .select('id, user_id')
    .eq('id', managerId)
    .single()

  if (fetchError || !manager) {
    return { error: 'Manager not found' }
  }

  const { error: emailError } = await adminClient.auth.admin.updateUserById(manager.user_id, {
    email: email,
  })

  if (emailError) {
    return { error: emailError.message }
  }

  const { error: profileError } = await (adminClient as any)
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', manager.user_id)

  if (profileError) {
    return { error: profileError.message }
  }

  const { error: managerError } = await (adminClient as any)
    .from('managers')
    .update({ phone: phone || null, branch_id: branchId })
    .eq('id', managerId)

  if (managerError) {
    return { error: managerError.message }
  }

  revalidatePath('/managers')
  return { success: true }
}

export async function deactivateManager(managerId: string) {
  const rl = rateLimit(`deactivate-manager:${managerId}`, { maxRequests: 3, windowMs: 60_000 })
  if (!rl.success) return { error: rl.error }

  const adminClient = createAdminClient()

  const { data: manager, error: fetchError } = await (adminClient as any)
    .from('managers')
    .select('user_id')
    .eq('id', managerId)
    .single()

  if (fetchError || !manager) {
    return { error: 'Manager not found' }
  }

  const { error: statusError } = await (adminClient as any)
    .from('managers')
    .update({ status: 'inactive' })
    .eq('id', managerId)

  if (statusError) {
    return { error: statusError.message }
  }

  const { error: authError } = await adminClient.auth.admin.updateUserById(manager.user_id, {
    ban_duration: '876000h', // ~100 years
  })

  if (authError) {
    return { error: authError.message }
  }

  revalidatePath('/managers')
  return { success: true }
}

export async function reactivateManager(managerId: string) {
  const rl = rateLimit(`reactivate-manager:${managerId}`, { maxRequests: 3, windowMs: 60_000 })
  if (!rl.success) return { error: rl.error }

  const adminClient = createAdminClient()

  const { data: manager, error: fetchError } = await (adminClient as any)
    .from('managers')
    .select('user_id')
    .eq('id', managerId)
    .single()

  if (fetchError || !manager) {
    return { error: 'Manager not found' }
  }

  const { error: statusError } = await (adminClient as any)
    .from('managers')
    .update({ status: 'active' })
    .eq('id', managerId)

  if (statusError) {
    return { error: statusError.message }
  }

  const { error: authError } = await adminClient.auth.admin.updateUserById(manager.user_id, {
    ban_duration: 'none',
  })

  if (authError) {
    return { error: authError.message }
  }

  revalidatePath('/managers')
  return { success: true }
}

export async function deleteManager(managerId: string) {
  const rl = rateLimit(`delete-manager:${managerId}`, { maxRequests: 3, windowMs: 60_000 })
  if (!rl.success) return { error: rl.error }

  const adminClient = createAdminClient()

  const { data: manager, error: fetchError } = await (adminClient as any)
    .from('managers')
    .select('user_id')
    .eq('id', managerId)
    .single()

  if (fetchError || !manager) {
    return { error: 'Manager not found' }
  }

  const { error: managerDeleteError } = await (adminClient as any)
    .from('managers')
    .delete()
    .eq('id', managerId)

  if (managerDeleteError) {
    return { error: managerDeleteError.message }
  }

  await (adminClient as any)
    .from('profiles')
    .delete()
    .eq('id', manager.user_id)

  const { error: authError } = await adminClient.auth.admin.deleteUser(manager.user_id)

  if (authError) {
    return { error: authError.message }
  }

  revalidatePath('/managers')
  return { success: true }
}

const managerFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(3, 'Full name must be at least 3 characters'),
  branchId: z.string().uuid('Invalid branch'),
  phone: z.string().optional().default(''),
})

export async function createManagerAccount(formData: FormData) {
  const rl = rateLimit('create-manager', { maxRequests: 5, windowMs: 60_000 })
  if (!rl.success) return { error: rl.error }

  const raw: Record<string, unknown> = {}
  formData.forEach((value, key) => { raw[key] = value })
  const parsed = managerFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { email, fullName, branchId, phone } = parsed.data

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
    role: 'MANAGER',
    full_name: fullName,
  }
  const { error: profileError } = await adminClient
    .from('profiles')
    .insert(profilePayload as any)

  if (profileError) {
    await adminClient.auth.admin.deleteUser(userId)
    return { error: profileError.message }
  }

  // 3. Create the manager record — no batch assignment, a manager oversees
  // every batch in their branch by definition (see lib/coach.ts)
  const managerPayload: ManagerInsert = { user_id: userId, branch_id: branchId, phone: phone || null }
  const { error: managerError } = await adminClient
    .from('managers')
    .insert(managerPayload as any)

  if (managerError) {
    await adminClient.auth.admin.deleteUser(userId)
    return { error: managerError.message }
  }

  revalidatePath('/managers')
  return { success: true, email, password }
}
