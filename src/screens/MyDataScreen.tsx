import { useEffect, useState } from 'react'
import { loadDetails, saveDetails } from '../lib/api'
import { EXPERIENCE, GOALS, type Details } from '../lib/helpers'

function Choices({ options, value, onChange }: { options: Record<string, string>; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div className="choices">
      {Object.entries(options).map(([key, label]) => (
        <button type="button" key={key} aria-pressed={value === key} onClick={() => onChange(value === key ? null : key)}>{label}</button>
      ))}
    </div>
  )
}

function Share({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="share">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      Compartir con mi entrenador
    </label>
  )
}

export default function MyDataScreen({ userId }: { userId: string }) {
  const [d, setD] = useState<Details | null>(null)
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    loadDetails(userId)
      .then(found => setD(found ?? {
        user_id: userId, birth_date: null, height_cm: null, goal: null, experience: null, injuries: null,
        share_birth_date: false, share_height: false, share_goal: false, share_experience: false, share_injuries: false
      }))
      .catch(e => setMsg({ kind: 'error', text: (e as Error).message }))
  }, [userId])

  if (!d) return msg ? <p className="msg error" role="alert">{msg.text}</p> : null

  const set = <K extends keyof Details>(key: K, value: Details[K]) => setD({ ...d, [key]: value })

  async function save() {
    if (!d) return
    setMsg(null)
    if (d.height_cm !== null && (d.height_cm < 100 || d.height_cm > 250)) {
      return setMsg({ kind: 'error', text: 'La altura debe estar entre 100 y 250 cm' })
    }
    if (d.birth_date && (d.birth_date < '1900-01-01' || d.birth_date > new Date().toISOString().slice(0, 10))) {
      return setMsg({ kind: 'error', text: 'La fecha de nacimiento no es válida' })
    }
    setBusy(true)
    try {
      await saveDetails(d)
      setMsg({ kind: 'info', text: 'Guardado' })
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h1 className="brand">Mis datos</h1>
      <p className="lead">Tu entrenador solo ve lo que actives con «Compartir».</p>

      <section className="field">
        <label>Fecha de nacimiento
          <input type="date" value={d.birth_date ?? ''} onChange={e => set('birth_date', e.target.value || null)} />
        </label>
        <Share checked={d.share_birth_date} onChange={v => set('share_birth_date', v)} />
      </section>

      <section className="field">
        <label>Altura (cm)
          <input type="number" inputMode="numeric" value={d.height_cm ?? ''} onChange={e => set('height_cm', e.target.value === '' ? null : Number(e.target.value))} />
        </label>
        <Share checked={d.share_height} onChange={v => set('share_height', v)} />
      </section>

      <section className="field">
        <p className="label">Objetivo</p>
        <Choices options={GOALS} value={d.goal} onChange={v => set('goal', v)} />
        <Share checked={d.share_goal} onChange={v => set('share_goal', v)} />
      </section>

      <section className="field">
        <p className="label">Experiencia entrenando</p>
        <Choices options={EXPERIENCE} value={d.experience} onChange={v => set('experience', v)} />
        <Share checked={d.share_experience} onChange={v => set('share_experience', v)} />
      </section>

      <section className="field">
        <label>Lesiones o molestias
          <textarea rows={3} maxLength={500} value={d.injuries ?? ''} onChange={e => set('injuries', e.target.value || null)} />
        </label>
        <Share checked={d.share_injuries} onChange={v => set('share_injuries', v)} />
      </section>

      {msg && <p className={'msg ' + msg.kind} role={msg.kind === 'error' ? 'alert' : undefined}>{msg.text}</p>}
      <button className="primary wide" disabled={busy} onClick={save}>Guardar</button>
    </>
  )
}
