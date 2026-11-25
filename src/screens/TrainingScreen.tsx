import { useCallback, useEffect, useState } from 'react'
import { myLogs, myProgram, upsertLog } from '../lib/api'
import type { ProgSession, ProgWeek, SessionLog } from '../lib/helpers'
import SessionScreen from './SessionScreen'

export default function TrainingScreen() {
  const [weeks, setWeeks] = useState<ProgWeek[] | null>(null)
  const [logs, setLogs] = useState<SessionLog[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [open, setOpen] = useState<ProgSession | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [w, l] = await Promise.all([myProgram(), myLogs()])
      setWeeks(w)
      setLogs(l)
      setSelected(prev => (w.some(x => x.id === prev) ? prev : (w[w.length - 1]?.id ?? null)))
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function setDate(s: ProgSession, date: string) {
    setError(null)
    try {
      const log = await upsertLog(s.id, { scheduled_date: date || null })
      setLogs(prev => [...prev.filter(l => l.session_id !== s.id), log])
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (open) {
    return <SessionScreen session={open} log={logs.find(l => l.session_id === open.id) ?? null}
      onBack={() => { setOpen(null); void load() }} />
  }

  const week = weeks?.find(w => w.id === selected) ?? null

  return (
    <>
      <h1 className="brand">Entrenos</h1>
      {error && <p className="msg error" role="alert">{error}</p>}
      {weeks && weeks.length === 0 && <p className="hint">Tu entrenador aún no te ha publicado ninguna semana.</p>}
      {weeks && weeks.length > 0 && (
        <div className="weekbar">
          {weeks.map(w => (
            <button key={w.id} aria-pressed={w.id === selected} onClick={() => setSelected(w.id)}>Semana {w.week_number}</button>
          ))}
        </div>
      )}
      {week && <p className="lead">Elige el día que quieras para cada sesión.</p>}
      {week?.sessions.map(s => {
        const log = logs.find(l => l.session_id === s.id)
        const isDone = log?.status === 'done'
        return (
          <div className="card" key={s.id}>
            <p className="card-main">{s.title} {isDone && <span className="chip">Hecha</span>}</p>
            <p className="small-text muted">{s.items.length} ejercicio{s.items.length === 1 ? '' : 's'}</p>
            <label className="datefield">Día
              <input type="date" value={log?.scheduled_date ?? ''} onChange={e => setDate(s, e.target.value)} />
            </label>
            <button className={'small ' + (isDone ? '' : 'primary')} onClick={() => setOpen(s)}>{isDone ? 'Ver' : 'Entrenar'}</button>
          </div>
        )
      })}
    </>
  )
}
