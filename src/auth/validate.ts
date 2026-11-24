import type { Role } from '../lib/supabase'

export type Registration = { name: string; email: string; password: string; role: Role }

export function validateRegistration(i: Registration): string | null {
  if (i.name.trim() === '') return 'Escribe tu nombre'
  if (!/^\S+@\S+\.\S+$/.test(i.email.trim())) return 'Correo no válido'
  if (i.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
  return null
}
