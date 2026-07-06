import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

// This client uses the Service Role Key. 
// NEVER expose this to the client-side/browser. 
// It is used exclusively in Server Actions or API routes for administrative tasks.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock-project.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
