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
