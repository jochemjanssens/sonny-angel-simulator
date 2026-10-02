import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// null when the project isn't configured yet (the app shows setup instructions).
export const supabase = url && key ? createClient(url, key) : null

// Calls a database function and throws its message as a readable error.
export async function rpc(fn, args = {}) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data
}
