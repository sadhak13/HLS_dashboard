'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { STAFF_ROLES } from '@/constants/roles'

export async function login(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Check role to determine redirect
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  const requiresPasswordChange = data.user.user_metadata?.must_change_password === true

  revalidatePath('/', 'layout')

  const isStaff = !!profile?.role && STAFF_ROLES.includes(profile.role)

  let redirectTo = '/dashboard'
  if (isStaff && requiresPasswordChange) {
    redirectTo = '/change-password'
  } else if (isStaff) {
    redirectTo = '/coach-dashboard'
  }

  return { redirectTo }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
