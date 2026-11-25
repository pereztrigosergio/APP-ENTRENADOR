import { supabase } from './supabase'
import { friendlyError, type ClientRow, type Details, type RequestRow } from './helpers'

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(friendlyError(error.message))
  return data as T
}

export const requestClient = (publicId: string) => rpc<void>('request_client', { p_public_id: publicId })
export const myClients = () => rpc<ClientRow[]>('my_clients')
export const myPendingRequests = () => rpc<RequestRow[]>('my_pending_requests')
export const myTrainer = async () => (await rpc<RequestRow[]>('my_trainer'))[0] ?? null
export const respondRequest = (linkId: string, accept: boolean) =>
  rpc<void>('respond_request', { p_link: linkId, p_accept: accept })
export const removeLink = (linkId: string) => rpc<void>('remove_link', { p_link: linkId })

export async function loadDetails(userId: string): Promise<Details | null> {
  const { data, error } = await supabase.from('client_details').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(friendlyError(error.message))
  return data as Details | null
}

export async function saveDetails(d: Details): Promise<void> {
  const { error } = await supabase
    .from('client_details')
    .upsert({ ...d, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw new Error(friendlyError(error.message))
}

// ---------- Ejercicios y programación (entrenador) ----------
import type { Exercise, Item, Week } from './helpers'

type Res<T> = { data: T | null; error: { message: string } | null }

async function ok<T>(p: PromiseLike<Res<T>>): Promise<T> {
  const { data, error } = await p
  if (error) throw new Error(friendlyError(error.message))
  return data as T
}

async function done(p: PromiseLike<{ error: { message: string } | null }>): Promise<void> {
  const { error } = await p
  if (error) throw new Error(friendlyError(error.message))
}

export const listExercises = () =>
  ok<Exercise[]>(supabase.from('exercises').select('id, name, muscle_group').order('name'))

export async function createExercise(name: string, muscleGroup: string | null): Promise<Exercise> {
  return ok<Exercise>(
    supabase.from('exercises').insert({ name: name.trim(), muscle_group: muscleGroup }).select('id, name, muscle_group').single()
  )
}

export const deleteExercise = (id: string) => done(supabase.from('exercises').delete().eq('id', id))

export async function loadWeeks(clientId: string): Promise<Week[]> {
  const data = await ok<Week[]>(
    supabase
      .from('program_weeks')
      .select('id, week_number, program_sessions(id, position, title, program_items(id, position, exercise_id, sets, reps, weight_kg, note, item_variants(id, exercise_id)))')
      .eq('client_id', clientId)
      .order('week_number')
  )
  return data.map(w => ({
    ...w,
    program_sessions: [...w.program_sessions]
      .sort((a, b) => a.position - b.position)
      .map(s => ({ ...s, program_items: [...s.program_items].sort((a, b) => a.position - b.position) }))
  }))
}

export async function createWeek(clientId: string, weekNumber: number): Promise<string> {
  const row = await ok<{ id: string }>(
    supabase.from('program_weeks').insert({ client_id: clientId, week_number: weekNumber }).select('id').single()
  )
  return row.id
}

export const copyWeek = (weekId: string) => rpc<string>('copy_week', { p_week: weekId })
export const deleteWeek = (id: string) => done(supabase.from('program_weeks').delete().eq('id', id))

export const addSession = (weekId: string, position: number, title: string) =>
  done(supabase.from('program_sessions').insert({ week_id: weekId, position, title }))
export const renameSession = (id: string, title: string) =>
  done(supabase.from('program_sessions').update({ title }).eq('id', id))
export const deleteSession = (id: string) => done(supabase.from('program_sessions').delete().eq('id', id))

export type ItemInput = {
  exercise_id: string
  sets: number
  reps: string
  weight_kg: number | null
  note: string | null
  variant_ids: string[]
}

export async function saveItem(sessionId: string, position: number, input: ItemInput, existing: Item | null): Promise<void> {
  const { variant_ids, ...fields } = input
  let itemId: string
  if (existing) {
    await done(supabase.from('program_items').update(fields).eq('id', existing.id))
    await done(supabase.from('item_variants').delete().eq('item_id', existing.id))
    itemId = existing.id
  } else {
    const row = await ok<{ id: string }>(
      supabase.from('program_items').insert({ ...fields, session_id: sessionId, position }).select('id').single()
    )
    itemId = row.id
  }
  if (variant_ids.length > 0) {
    await done(supabase.from('item_variants').insert(variant_ids.map(exercise_id => ({ item_id: itemId, exercise_id }))))
  }
}

export const deleteItem = (id: string) => done(supabase.from('program_items').delete().eq('id', id))
