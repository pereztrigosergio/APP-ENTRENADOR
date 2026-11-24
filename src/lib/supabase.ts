import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_KEY } from '../config'

// La sesión se guarda en el dispositivo: se entra una vez y se sigue dentro hasta pulsar «Salir».
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
})

export type Role = 'trainer' | 'client'
export type Profile = { id: string; role: Role; public_id: string; name: string }
