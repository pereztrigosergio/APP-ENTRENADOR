import { useEffect, useState } from 'react'
import { supabase, type Profile } from '../lib/supabase'
import ProfileScreen from './ProfileScreen'
import ClientsScreen from './ClientsScreen'
import MyDataScreen from './MyDataScreen'
import ExercisesScreen from './ExercisesScreen'
import ProgramScreen from './ProgramScreen'

type Tab = 'inicio' | 'datos' | 'clientes' | 'ejercicios'

export default function Home({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab | null>(null)
  const [program, setProgram] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    supabase.from('profiles').select('id, role, public_id, name').eq('id', userId).single()
      .then(({ data, error: err }) => {
        if (err || !data) setError('No se pudo cargar tu perfil. Comprueba tu conexión.')
        else setProfile(data as Profile)
      })
  }, [userId])

  if (error) {
    return (
      <main className="screen">
        <p className="msg error" role="alert">{error}</p>
        <button className="link" onClick={() => supabase.auth.signOut()}>Salir</button>
      </main>
    )
  }
  if (!profile) return null

  const trainer = profile.role === 'trainer'
  const tabs: [Tab, string][] = trainer
    ? [['clientes', 'Clientes'], ['ejercicios', 'Ejercicios'], ['inicio', 'Perfil']]
    : [['inicio', 'Inicio'], ['datos', 'Mis datos']]
  const active: Tab = tab ?? tabs[0][0]

  return (
    <>
      <main className="screen with-tabs">
        {active === 'inicio' && <ProfileScreen profile={profile} />}
        {active === 'clientes' && !program && <ClientsScreen onProgram={setProgram} />}
        {active === 'clientes' && program && <ProgramScreen client={program} onBack={() => setProgram(null)} />}
        {active === 'ejercicios' && <ExercisesScreen />}
        {active === 'datos' && <MyDataScreen userId={profile.id} />}
      </main>
      <nav className="tabbar" aria-label="Secciones">
        {tabs.map(([key, label]) => (
          <button key={key} aria-current={active === key ? 'page' : undefined} onClick={() => { setTab(key); setProgram(null) }}>{label}</button>
        ))}
      </nav>
    </>
  )
}
