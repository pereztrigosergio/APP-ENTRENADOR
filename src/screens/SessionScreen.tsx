import { useEffect, useState } from 'react'
import { deleteSetLog, loadSetLogs, saveSetLogs, upsertLog } from '../lib/api'
import { buildSetRows, FEELINGS, fromUi, toUi, type ProgSession, type SessionLog, type UiRow } from '../lib/helpers'

type Row = UiRow & { id?: string }

export default function SessionScreen({ session, log: initialLog, onBack }: { session: ProgSession; log: SessionLog | null; onBack: () => void }) {
  const [log, setLog] = useState<SessionLog | null>(initialLog)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [feeling, setFeeling] = useState<number | null>(initialLog?.feeling ?? null)
  const [feelingNote, setFeelingNote] = useState(initialLog?.feeling_note ?? '')

  useEffect(() => {
    if (!initialLog) { setRows([]); return }
    loadSetLogs(initialLog.id)
      .then(r => setRows(r.map(x => ({ ...toUi(x), id: x.id }))))
      .catch(e => setMsg({ kind: 'error', text: (e as Error).message }))
  }, [initialLog])

  const fail = (e: unknown) => setMsg({ kind: 'error', text: (e as Error).message })

  async function start() {
    setBusy(true)
    setMsg(null)
    try {
      const l = log ?? await upsertLog(session.id, { scheduled_date: new Date().toISOString().slice(0, 10) })
      setLog(l)
      await saveSetLogs(l.id, buildSetRows(session.items))
      const saved = await loadSetLogs(l.id)
      setRows(saved.map(x => ({ ...toUi(x), id: x.id })))
    } catch (e) { fail(e) } finally { setBusy(false) }
  }

  async function persist(): Promise<boolean> {
    if (!log || !rows) return false
    try {
      await saveSetLogs(log.id, rows.map(fromUi))
      const saved = await loadSetLogs(log.id)
      setRows(saved.map(x => ({ ...toUi(x), id: x.id })))
      return true
    } catch (e) { fail(e); return false }
  }

  async function save() {
    setBusy(true); setMsg(null)
    if (await persist()) setMsg({ kind: 'info', text: 'Guardado' })
    setBusy(false)
  }

  async function finish() {
    if (!log) return
    if (feeling === null) return setMsg({ kind: 'error', text: 'Elige cómo te has sentido' })
    setBusy(true); setMsg(null)
    try {
      if (!(await persist())) return
      await upsertLog(session.id, {
        status: 'done', feeling, feeling_note: feelingNote.trim() || null, completed_at: new Date().toISOString()
      })
      onBack()
    } catch (e) { fail(e) } finally { setBusy(false) }
  }

  const update = (r: Row, patch: Partial<Row>) =>
    setRows(rows => rows && rows.map(x => (x === r ? { ...x, ...patch } : x)))

  const chooseExercise = (itemId: string, exerciseId: string) =>
    setRows(rows => rows && rows.map(x => (x.item_id === itemId ? { ...x, exercise_id: exerciseId } : x)))

  function addExtra(itemId: string) {
    setRows(rows => {
      if (!rows) return rows
      const mine = rows.filter(x => x.item_id === itemId)
      const last = mine[mine.length - 1]
      const extra: Row = toUi({
        item_id: itemId, exercise_id: last.exercise_id, set_number: last.set_number + 1,
        prescribed_reps: null, prescribed_weight: null,
        reps_done: last.reps_done, weight_done: last.weight_done, done: false
      })
      const idx = rows.lastIndexOf(last)
      return [...rows.slice(0, idx + 1), extra, ...rows.slice(idx + 1)]
    })
  }

  async function removeExtra(r: Row) {
    if (r.id) { try { await deleteSetLog(r.id) } catch (e) { return fail(e) } }
    setRows(rows => rows && rows.filter(x => x !== r))
  }

  const isDone = log?.status === 'done'
  const started = rows !== null && rows.length > 0

  return (
    <>
      <button className="link back" onClick={onBack}>← Entrenos</button>
      <h1 className="brand">{session.title}</h1>
      {isDone && <p className="chip">Sesión hecha</p>}
      {msg && <p className={'msg ' + msg.kind} role={msg.kind === 'error' ? 'alert' : undefined}>{msg.text}</p>}

      {rows !== null && !started && (
        <>
          {session.items.map(i => (
            <div className="card" key={i.id}>
              <p className="card-main">{i.exercise_name} <span className="muted">{i.sets} × {i.reps}{i.weight_kg !== null ? ' · ' + i.weight_kg + ' kg' : ''}</span></p>
              {i.note && <p className="note">{i.note}</p>}
            </div>
          ))}
          <button className="primary wide" disabled={busy} onClick={start}>Empezar entrenamiento</button>
        </>
      )}

      {started && session.items.map(item => {
        const itemRows = rows!.filter(r => r.item_id === item.id)
        const chosen = itemRows[0]?.exercise_id ?? item.exercise_id
        const options = [{ exercise_id: item.exercise_id, name: item.exercise_name }, ...item.variants]
        return (
          <section className="session" key={item.id}>
            <p className="card-main">{options.find(o => o.exercise_id === chosen)?.name ?? item.exercise_name}</p>
            {item.note && <p className="note">{item.note}</p>}
            {item.variants.length > 0 && (
              <div className="choices">
                {options.map(o => (
                  <button type="button" key={o.exercise_id} aria-pressed={chosen === o.exercise_id}
                    onClick={() => chooseExercise(item.id, o.exercise_id)}>{o.name}</button>
                ))}
              </div>
            )}
            <div className="setgrid">
              <span className="muted small-text">Serie</span>
              <span className="muted small-text">Reps</span>
              <span className="muted small-text">Kg</span>
              <span className="muted small-text">Hecha</span>
              {itemRows.map(r => (
                <div className="setrow" key={r.set_number}>
                  <span className="setnum">
                    {r.set_number}
                    {r.prescribed_reps && <small>{r.prescribed_reps}{r.prescribed_weight !== null ? '×' + r.prescribed_weight : ''}</small>}
                  </span>
                  <input inputMode="numeric" aria-label={'Repeticiones serie ' + r.set_number} value={r.repsStr} onChange={e => update(r, { repsStr: e.target.value })} />
                  <input inputMode="decimal" aria-label={'Kilos serie ' + r.set_number} value={r.weightStr} onChange={e => update(r, { weightStr: e.target.value })} />
                  <input type="checkbox" aria-label={'Serie ' + r.set_number + ' hecha'} checked={r.done} onChange={e => update(r, { done: e.target.checked })} />
                  {r.prescribed_reps === null && <button className="small danger" onClick={() => removeExtra(r)}>Quitar</button>}
                </div>
              ))}
            </div>
            <button className="small" onClick={() => addExtra(item.id)}>+ Serie extra</button>
          </section>
        )
      })}

      {started && !finishing && (
        <div className="actions wrap">
          <button className="small" disabled={busy} onClick={save}>Guardar</button>
          <button className="small primary" disabled={busy} onClick={() => setFinishing(true)}>{isDone ? 'Editar sensaciones' : 'Terminar sesión'}</button>
        </div>
      )}

      {started && finishing && (
        <section className="session">
          <p className="card-main">¿Cómo te has sentido?</p>
          <div className="faces">
            {FEELINGS.map(([n, face, label]) => (
              <button type="button" key={n} aria-pressed={feeling === n} onClick={() => setFeeling(n)}>
                <span className="face">{face}</span><span className="small-text">{label}</span>
              </button>
            ))}
          </div>
          <label>Comentario (opcional)
            <textarea rows={3} maxLength={500} value={feelingNote} onChange={e => setFeelingNote(e.target.value)} />
          </label>
          <div className="actions wrap">
            <button className="small" onClick={() => setFinishing(false)}>Volver</button>
            <button className="small primary" disabled={busy} onClick={finish}>Guardar y terminar</button>
          </div>
        </section>
      )}
    </>
  )
}
