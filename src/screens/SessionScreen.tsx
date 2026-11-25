import { useEffect, useState } from 'react'
import { deleteSetLog, loadHistory, loadSetLogs, saveSetLogs, upsertLog } from '../lib/api'
import {
  buildSetRows, describeLast, FEELINGS, fromUi, pickLast, toUi, todayIso,
  type LastMap, type ProgSession, type SessionLog, type UiRow
} from '../lib/helpers'

type Row = UiRow & { id?: string }

const Check = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
)
const Chevron = ({ up }: { up: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={up ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} /></svg>
)

export default function SessionScreen({ session, log: initialLog, onBack }: { session: ProgSession; log: SessionLog | null; onBack: () => void }) {
  const [log, setLog] = useState<SessionLog | null>(initialLog)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [last, setLast] = useState<LastMap>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [feeling, setFeeling] = useState<number | null>(initialLog?.feeling ?? null)
  const [feelingNote, setFeelingNote] = useState(initialLog?.feeling_note ?? '')

  const fail = (e: unknown) => setMsg({ kind: 'error', text: (e as Error).message })
  const toRows = (saved: Awaited<ReturnType<typeof loadSetLogs>>): Row[] => saved.map(x => ({ ...toUi(x), id: x.id }))

  useEffect(() => {
    const ids = Array.from(new Set(session.items.flatMap(i => [i.exercise_id, ...i.variants.map(v => v.exercise_id)])))
    Promise.all([initialLog ? loadSetLogs(initialLog.id) : Promise.resolve([]), loadHistory(ids)])
      .then(([saved, hist]) => {
        const r = toRows(saved)
        setLast(pickLast(hist, initialLog?.id))
        setRows(r)
        const firstPending = session.items.find(i => r.some(x => x.item_id === i.id && !x.done))
        setOpenId((firstPending ?? session.items[0])?.id ?? null)
      })
      .catch(fail)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLog?.id, session.id])

  async function start() {
    setBusy(true); setMsg(null)
    try {
      const l = log ?? await upsertLog(session.id, { scheduled_date: todayIso() })
      setLog(l)
      await saveSetLogs(l.id, buildSetRows(session.items, last))
      setRows(toRows(await loadSetLogs(l.id)))
    } catch (e) { fail(e) } finally { setBusy(false) }
  }

  async function persist(): Promise<boolean> {
    if (!log || !rows) return false
    try {
      await saveSetLogs(log.id, rows.map(fromUi))
      setRows(toRows(await loadSetLogs(log.id)))
      return true
    } catch (e) { fail(e); return false }
  }

  async function goBack() {
    if (log && rows && rows.length > 0) {
      setBusy(true)
      const ok = await persist()
      setBusy(false)
      if (!ok) return
    }
    onBack()
  }

  async function finish() {
    if (!log) return
    if (feeling === null) return setMsg({ kind: 'error', text: 'Elige cómo te has sentido' })
    setBusy(true); setMsg(null)
    try {
      if (!(await persist())) return
      await upsertLog(session.id, { status: 'done', feeling, feeling_note: feelingNote.trim() || null, completed_at: new Date().toISOString() })
      onBack()
    } catch (e) { fail(e) } finally { setBusy(false) }
  }

  const update = (r: Row, patch: Partial<Row>) => setRows(rows => rows && rows.map(x => (x === r ? { ...x, ...patch } : x)))

  function chooseExercise(itemId: string, exerciseId: string) {
    setRows(rows => rows && rows.map(x => {
      if (x.item_id !== itemId) return x
      const l = last[exerciseId]?.[x.set_number]
      const fill = !x.done && l && l.reps !== null
        ? { repsStr: String(l.reps), weightStr: l.weight === null ? '' : String(l.weight) } : {}
      return { ...x, exercise_id: exerciseId, ...fill }
    }))
  }

  function addExtra(itemId: string) {
    setRows(rows => {
      if (!rows) return rows
      const lastRow = rows.filter(x => x.item_id === itemId).slice(-1)[0]
      const extra: Row = toUi({
        item_id: itemId, exercise_id: lastRow.exercise_id, set_number: lastRow.set_number + 1,
        prescribed_reps: null, prescribed_weight: null, reps_done: lastRow.reps_done, weight_done: lastRow.weight_done, done: false
      })
      const idx = rows.lastIndexOf(lastRow)
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
    <div className="sv">
      <div className="sv-inner">
        <div className="sv-top">
          <button className="iconbtn" aria-label="Volver" disabled={busy} onClick={goBack}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <h1>{session.title}</h1>
          {started && !finishing ? <button className="textbtn" onClick={() => setFinishing(true)}>{isDone ? 'Sensaciones' : 'Terminar'}</button> : <span style={{ width: 44 }} />}
        </div>

        {msg && <p className={'msg ' + msg.kind} style={{ margin: 16 }} role={msg.kind === 'error' ? 'alert' : undefined}>{msg.text}</p>}

        {rows !== null && !started && (
          <div className="ex-info" style={{ paddingTop: 16 }}>
            {session.items.map(i => (
              <div className="srow" style={{ margin: 0, padding: 0, minHeight: 56 }} key={i.id}>
                <div>
                  <div className="ex-name">{i.exercise_name}</div>
                  <div className="ex-meta">{i.sets} × {i.reps}{i.weight_kg !== null ? ' · ' + i.weight_kg + ' kg' : ''}</div>
                </div>
              </div>
            ))}
            <button className="btn btn-main" style={{ height: 48 }} disabled={busy} onClick={start}>Empezar entrenamiento</button>
          </div>
        )}

        {started && !finishing && session.items.map(item => {
          const itemRows = rows!.filter(r => r.item_id === item.id)
          const chosen = itemRows[0]?.exercise_id ?? item.exercise_id
          const options = [{ exercise_id: item.exercise_id, name: item.exercise_name }, ...item.variants]
          const name = options.find(o => o.exercise_id === chosen)?.name ?? item.exercise_name
          const isOpen = openId === item.id
          const doneCount = itemRows.filter(r => r.done).length
          const pauta = item.sets + ' × ' + item.reps + (item.weight_kg !== null ? ' · ' + item.weight_kg + ' kg' : '')
          return (
            <section className="ex" key={item.id}>
              <button className="ex-head" aria-expanded={isOpen} onClick={() => setOpenId(isOpen ? null : item.id)}>
                <span>
                  <span className="ex-name">{name}</span>
                  <span className="ex-meta">{isOpen ? 'Pauta ' + pauta : doneCount + '/' + itemRows.length + ' series · ' + pauta}</span>
                </span>
                <Chevron up={isOpen} />
              </button>
              {isOpen && (
                <div className="ex-body">
                  <div className="ex-info">
                    {item.variants.length > 0 && (
                      <div className="vbar" role="group" aria-label="Variante">
                        {options.map(o => (
                          <button type="button" key={o.exercise_id} aria-pressed={chosen === o.exercise_id} onClick={() => chooseExercise(item.id, o.exercise_id)}>{o.name}</button>
                        ))}
                      </div>
                    )}
                    {item.note && <div className="nota"><b>Nota de tu entrenador · </b>{item.note}</div>}
                  </div>
                  <div className="sets-head"><span>SERIE</span><span>ÚLTIMA VEZ</span><span>REPS</span><span>KG</span><span /></div>
                  {itemRows.map(r => (
                    <div className={'set' + (r.done ? ' done' : '')} key={r.set_number}>
                      <span className="setn">{r.set_number}</span>
                      {r.prescribed_reps === null
                        ? <button className="linkbtn" onClick={() => removeExtra(r)}>Quitar</button>
                        : <span className="last">{describeLast(last[r.exercise_id]?.[r.set_number])}</span>}
                      <input inputMode="numeric" aria-label={'Repeticiones serie ' + r.set_number} value={r.repsStr} onChange={e => update(r, { repsStr: e.target.value })} />
                      <input inputMode="decimal" aria-label={'Kilos serie ' + r.set_number} value={r.weightStr} onChange={e => update(r, { weightStr: e.target.value })} />
                      <button className="chk" aria-pressed={r.done} aria-label={'Confirmar serie ' + r.set_number} onClick={() => update(r, { done: !r.done })}><Check /></button>
                    </div>
                  ))}
                  <p className="hintline">Los campos vienen con la última vez. Toca ✓ para confirmarla.</p>
                  <button className="addset" onClick={() => addExtra(item.id)}>+ Añadir serie</button>
                </div>
              )}
            </section>
          )
        })}

        {started && finishing && (
          <section className="ex-info" style={{ paddingTop: 16 }}>
            <p className="ex-name" style={{ color: 'var(--ink)' }}>¿Cómo te has sentido?</p>
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
            <div className="actions end">
              <button className="btn" onClick={() => setFinishing(false)}>Volver</button>
              <button className="btn btn-main" disabled={busy} onClick={finish}>Guardar y terminar</button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
