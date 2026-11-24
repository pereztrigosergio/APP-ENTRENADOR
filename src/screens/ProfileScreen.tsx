import { useState } from 'react'
import { supabase, type Profile } from '../lib/supabase'
import ClientLinks from './ClientLinks'

const ROLE_LABEL = { trainer: 'Entrenador', client: 'Cliente' } as const

export default function ProfileScreen({ profile }: { profile: Profile }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(profile.public_id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* si el navegador no permite copiar, el ID sigue visible */
    }
  }

  return (
    <>
      <h1 className="brand">Entrenos</h1>
      <section className="profile">
        <p className="hello">Hola, {profile.name}</p>
        <p className="role">{ROLE_LABEL[profile.role]}</p>
        <div className={`idcard ${profile.role}`}>
          <span className="idlabel">Tu ID</span>
          <span className="idvalue">{profile.public_id}</span>
          <button onClick={copy}>{copied ? 'Copiado' : 'Copiar ID'}</button>
        </div>
        <p className="hint">
          {profile.role === 'client'
            ? 'Pásale este ID a tu entrenador para que te añada.'
            : 'Para añadir a un cliente, pídele su ID y escríbelo en la pestaña Clientes.'}
        </p>
      </section>
      {profile.role === 'client' && <ClientLinks />}
      <button className="link" onClick={() => supabase.auth.signOut()}>Salir</button>
    </>
  )
}
