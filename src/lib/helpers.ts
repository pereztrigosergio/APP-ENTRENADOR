export type ClientRow = {
  link_id: string
  client_id: string
  name: string
  public_id: string
  status: 'pending' | 'accepted'
  birth_date: string | null
  height_cm: number | null
  goal: string | null
  experience: string | null
  injuries: string | null
}

export type RequestRow = { link_id: string; trainer_name: string; trainer_public_id: string }

export type Details = {
  user_id: string
  birth_date: string | null
  height_cm: number | null
  goal: string | null
  experience: string | null
  injuries: string | null
  share_birth_date: boolean
  share_height: boolean
  share_goal: boolean
  share_experience: boolean
  share_injuries: boolean
}

export const GOALS: Record<string, string> = {
  musculo: 'Ganar músculo',
  grasa: 'Perder grasa',
  fuerza: 'Ganar fuerza',
  salud: 'Salud y bienestar',
  rendimiento: 'Rendimiento deportivo'
}

export const EXPERIENCE: Record<string, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado'
}

/** Convierte lo que escribe la persona en un ID válido (#A7K29) o null si no lo es. */
export function normalizePublicId(input: string): string | null {
  const t = input.replace(/\s+/g, '').toUpperCase()
  const id = t.startsWith('#') ? t : '#' + t
  return /^#[A-HJKMNP-Z2-9]{5}$/.test(id) ? id : null
}

export type Exercise = { id: string; name: string; muscle_group: string | null }
export type Variant = { id: string; exercise_id: string }
export type Item = {
  id: string
  position: number
  exercise_id: string
  sets: number
  reps: string
  weight_kg: number | null
  note: string | null
  item_variants: Variant[]
}
export type Session = { id: string; position: number; title: string; program_items: Item[] }
export type Week = { id: string; week_number: number; program_sessions: Session[] }

export const MUSCLE_GROUPS: Record<string, string> = {
  pierna: 'Pierna',
  pecho: 'Pecho',
  espalda: 'Espalda',
  hombro: 'Hombro',
  brazo: 'Brazo',
  core: 'Core',
  cuerpo: 'Cuerpo completo',
  cardio: 'Cardio'
}

/** Repeticiones: «8» o un rango «8-10». Devuelve el texto limpio o null si no es válido. */
export function parseReps(input: string): string | null {
  const t = input.replace(/\s+/g, '').replace(/[–—]/g, '-')
  if (!/^\d{1,3}(-\d{1,3})?$/.test(t)) return null
  const [a, b] = t.split('-').map(Number)
  if (a < 1) return null
  if (b !== undefined && b < a) return null
  return t
}

export function describeItem(i: { sets: number; reps: string; weight_kg: number | null }): string {
  return i.sets + ' × ' + i.reps + (i.weight_kg !== null ? ' · ' + i.weight_kg + ' kg' : '')
}

const ERRORS: Record<string, string> = {
  cliente_no_existe: 'No hay ningún cliente con ese ID',
  ya_tiene_entrenador: 'Ese cliente ya tiene entrenador',
  ya_solicitado: 'Ya enviaste una solicitud a este cliente',
  solo_entrenadores: 'Solo los entrenadores pueden añadir clientes',
  solicitud_no_existe: 'Esa solicitud ya no existe',
  ya_tienes_entrenador: 'Ya tienes un entrenador. Déjalo antes de aceptar otro'
}

export function friendlyError(message: string): string {
  for (const key of Object.keys(ERRORS)) if (message.includes(key)) return ERRORS[key]
  if (message.includes('foreign key')) return 'Ese ejercicio está en uso en algún programa. Quítalo de los programas antes de borrarlo'
  if (message.includes('duplicate key')) return 'Eso ya existe'
  return 'Algo salió mal. Comprueba tu conexión e inténtalo de nuevo.'
}

export function ageFromBirthDate(birth: string, today: Date): number {
  const [y, m, d] = birth.split('-').map(Number)
  let age = today.getFullYear() - y
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--
  return age
}
