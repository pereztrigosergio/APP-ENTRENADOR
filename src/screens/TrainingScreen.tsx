import { useCallback, useEffect, useState } from 'react'
import { myLogs, myProgram, upsertLog } from '../lib/api'
import { formatDay, todayIso, type ProgSession, type ProgWeek, type SessionLog } from '../lib/helpers'
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
  const today = todayIso()

  return (
    <>
      <h1 className="brand">Entrenos</h1>
      {error && <p className="msg error" role="alert">{error}</p>}
      {weeks && weeks.length === 0 && <p className="hint">Tu entrenador aún no te ha publicado ninguna semana.</p>}
      {weeks && weeks.length > 0 && (
        <div className="wk">
          {weeks.map(w => (
            <button key={w.id} aria-current={w.id === selected ? 'true' : undefined} onClick={() => setSelected(w.id)}>Semana {w.week_number}</button>
          ))}
        </div>
      )}
      {week?.sessions.map(s => {
        const log = logs.find(l => l.session_id === s.id)
        const date = log?.scheduled_date ?? null
        const isDone = log?.status === 'done'
        const dateInput = (
          <input type="date" aria-label={'Día de ' + s.title} value={date ?? ''} onChange={e => setDate(s, e.target.value)} />
        )
        return (
          <div className="srow" key={s.id}>
            <div>
              <button className="srow-title" onClick={() => setOpen(s)}>{s.title}</button>
              <div className="srow-meta">
                {s.items.length} ejercicio{s.items.length === 1 ? '' : 's'} ·{' '}
                {date === today && !isDone && <span className="today">Hoy</span>}{' '}
                <span className="datepick">{date ? formatDay(date) : 'Sin día'}{dateInput}</span>
              </div>
            </div>
            {isDone ? (
              <button className="btn" onClick={() => setOpen(s)}><span className="donetxt">Hecha</span></button>
            ) : date ? (
              <button className={'btn' + (date <= today ? ' btn-main' : '')} onClick={() => setOpen(s)}>Entrenar</button>
            ) : (
              <span className="datepick"><span className="btn">Elegir día</span>{dateInput}</span>
            )}
          </div>
        )
      })}
    </>
  )
}
