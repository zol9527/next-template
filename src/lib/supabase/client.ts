import { createClient } from '@supabase/supabase-js'
import { env } from '@/config'

/**
Function: createSupabaseClient

Description: 创建 Supabase Client（仅供 Repository 层调用，避免在 Service/UI 直接依赖 supabase-js）

Parameters:

Returns:
    client(object): Supabase Client 实例
*/
export function createSupabaseClient() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Supabase env is not configured')
  }

  return createClient(url, anonKey)
}

export function createSupabaseServiceRoleClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service role env is not configured')
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
}
