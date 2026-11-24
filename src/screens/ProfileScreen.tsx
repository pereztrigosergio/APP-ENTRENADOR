import { useEffect, useState } from 'react'
import { supabase, type Profile } from '../lib/supabase'

const ROLE_LABEL = { trainer: 'Entrenador', client: 'Cliente' } as const

export default function ProfileScreen({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.from('profiles').select('id, role, public_id, name').eq('id', userId).single()
      .then(({ data, error: err }) => {
        if (err || !data) setError('No se pudo cargar tu perfil. Comprueba tu conexión.')
        else setProfile(data as Profile)
      })
  }, [userId])

  async function copy() {
    if (!profile) return
    try {
      await navigator.clipboard.writeText(profile.public_id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* si el navegador no permite copiar, el ID sigue visible */
    }
  }

  return (
    <main className="screen">
      <h1 className="brand">Entrenos</h1>
      {error && <p className="msg error" role="alert">{error}</p>}
      {profile && (
        <section className="profile">
          <p className="hello">Hola, {profile.name}</p>
          <p className="role">{ROLE_LABEL[profile.role]}</p>
          <div className="idcard">
            <span className="idlabel">Tu ID</span>
            <span className="idvalue">{profile.public_id}</span>
            <button onClick={copy}>{copied ? 'Copiado' : 'Copiar ID'}</button>
          </div>
          <p className="hint">
            {profile.role === 'client'
              ? 'Pásale este ID a tu entrenador para que te añada.'
              : 'Tus clientes te añadirán con tu ID, y tú a ellos con el suyo.'}
          </p>
        </section>
      )}
      <button className="link" onClick={() => supabase.auth.signOut()}>Salir</button>
    </main>
  )
}
