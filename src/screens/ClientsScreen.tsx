import { useCallback, useEffect, useState } from 'react'
import { myClients, removeLink, requestClient } from '../lib/api'
import { ageFromBirthDate, EXPERIENCE, GOALS, normalizePublicId, type ClientRow } from '../lib/helpers'

function SharedData({ r }: { r: ClientRow }) {
  const lines: [string, string][] = []
  if (r.birth_date) lines.push(['Edad', ageFromBirthDate(r.birth_date, new Date()) + ' años'])
  if (r.height_cm) lines.push(['Altura', r.height_cm + ' cm'])
  if (r.goal) lines.push(['Objetivo', GOALS[r.goal] ?? r.goal])
  if (r.experience) lines.push(['Experiencia', EXPERIENCE[r.experience] ?? r.experience])
  if (r.injuries) lines.push(['Lesiones', r.injuries])
  if (lines.length === 0) return <p className="hint">No comparte datos personales todavía.</p>
  return (
    <dl className="data">
      {lines.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v}</dd></div>))}
    </dl>
  )
}

export default function ClientsScreen() {
  const [rows, setRows] = useState<ClientRow[] | null>(null)
  const [idInput, setIdInput] = useState('')
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setRows(await myClients())
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message })
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    const id = normalizePublicId(idInput)
    if (!id) return setMsg({ kind: 'error', text: 'ID no válido. Tiene este formato: #A7K29' })
    setBusy(true)
    try {
      await requestClient(id)
      setIdInput('')
      setMsg({ kind: 'info', text: 'Solicitud enviada. El cliente tiene que aceptarla.' })
      await load()
    } catch (err) {
      setMsg({ kind: 'error', text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  async function remove(r: ClientRow) {
    const text = r.status === 'pending' ? '¿Cancelar la solicitud a ' : '¿Quitar a '
    if (!window.confirm(text + r.name + '?')) return
    try {
      await removeLink(r.link_id)
      await load()
    } catch (err) {
      setMsg({ kind: 'error', text: (err as Error).message })
    }
  }

  return (
    <>
      <h1 className="brand">Clientes</h1>
      <form onSubmit={send} className="addform">
        <label>ID del cliente
          <input value={idInput} onChange={e => setIdInput(e.target.value)} placeholder="#A7K29" autoCapitalize="characters" autoComplete="off" />
        </label>
        <button className="primary" disabled={busy}>Enviar solicitud</button>
      </form>
      {msg && <p className={'msg ' + msg.kind} role={msg.kind === 'error' ? 'alert' : undefined}>{msg.text}</p>}

      <section className="block">
        {rows && rows.length === 0 && <p className="hint">Aún no tienes clientes. Pídele a uno su ID y envíale una solicitud.</p>}
        {rows?.map(r => (
          <div className="card" key={r.link_id}>
            <p className="card-main">{r.name} <span className="muted">{r.public_id}</span></p>
            {r.status === 'pending' ? <p className="chip">Pendiente de aceptar</p> : <SharedData r={r} />}
            <button className="small danger" onClick={() => remove(r)}>{r.status === 'pending' ? 'Cancelar solicitud' : 'Quitar cliente'}</button>
          </div>
        ))}
      </section>
    </>
  )
}
