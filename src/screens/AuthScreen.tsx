import { useState } from 'react'
import { supabase, type Role } from '../lib/supabase'
import { validateRegistration } from '../auth/validate'

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [role, setRole] = useState<Role>('client')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'signup') {
        const problem = validateRegistration({ name, email, password, confirm, role })
        if (problem) return setError(problem)
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim(), role } }
        })
        if (err) {
          return setError(/already registered/i.test(err.message) ? 'Ese correo ya tiene cuenta' : 'No se pudo crear la cuenta: ' + err.message)
        }
        if (!data.session) setInfo('Cuenta creada. Revisa tu correo para confirmarla.')
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (err) setError(/invalid login/i.test(err.message) ? 'Correo o contraseña incorrectos' : 'No se pudo entrar: ' + err.message)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="screen">
      <h1 className="brand">Entrenos</h1>
      <p className="lead">Tu entrenamiento, conectado con tu entrenador.</p>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'login'} onClick={() => setMode('login')}>Entrar</button>
        <button role="tab" aria-selected={mode === 'signup'} onClick={() => setMode('signup')}>Crear cuenta</button>
      </div>

      <form onSubmit={submit} className="form">
        {mode === 'signup' && (
          <>
            <label>Nombre
              <input value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
            </label>
            <fieldset className="roles">
              <legend>Soy</legend>
              <button type="button" aria-pressed={role === 'client'} onClick={() => setRole('client')}>Cliente</button>
              <button type="button" aria-pressed={role === 'trainer'} onClick={() => setRole('trainer')}>Entrenador</button>
            </fieldset>
          </>
        )}
        <label>Correo
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label>Contraseña
          <span className="pwd">
            <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
            <button type="button" className="small" aria-pressed={show} onClick={() => setShow(!show)}>
              {show ? 'Ocultar' : 'Mostrar'}
            </button>
          </span>
        </label>
        {mode === 'signup' && (
          <label>Repite la contraseña
            <input type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
          </label>
        )}
        {error && <p className="msg error" role="alert">{error}</p>}
        {info && <p className="msg info">{info}</p>}
        <button className="primary" disabled={busy}>{mode === 'signup' ? 'Crear cuenta' : 'Entrar'}</button>
      </form>
    </main>
  )
}
