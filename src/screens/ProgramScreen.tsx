import { useCallback, useEffect, useState } from 'react'
import {
  addSession, copyWeek, createExercise, createWeek, deleteItem, deleteSession, deleteWeek,
  listExercises, loadWeeks, renameSession, saveItem
} from '../lib/api'
import { describeItem, type Exercise, type Item, type Week } from '../lib/helpers'
import ConfirmDialog, { type Ask } from '../components/ConfirmDialog'
import ItemForm from './ItemForm'

type Editing = { sessionId: string; item: Item | null } | null

export default function ProgramScreen({ client, onBack }: { client: { id: string; name: string }; onBack: () => void }) {
  const [weeks, setWeeks] = useState<Week[] | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<Editing>(null)
  const [error, setError] = useState<string | null>(null)
  const [ask, setAsk] = useState<Ask | null>(null)

  const reload = useCallback(async (pick?: string) => {
    try {
      const [w, ex] = await Promise.all([loadWeeks(client.id), listExercises()])
      setWeeks(w)
      setExercises(ex)
      setSelected(prev => {
        const want = pick ?? prev
        return w.some(x => x.id === want) ? want : (w[w.length - 1]?.id ?? null)
      })
    } catch (e) {
      setError((e as Error).message)
    }
  }, [client.id])

  useEffect(() => { void reload() }, [reload])

  async function act<T>(fn: () => Promise<T>, pick?: (r: T) => string | undefined) {
    setError(null)
    try {
      const r = await fn()
      await reload(pick?.(r))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function confirm() {
    if (!ask) return
    const current = ask
    setAsk(null)
    await act(current.run)
  }

  if (!weeks) return error ? <p className="msg error" role="alert">{error}</p> : null

  const week = weeks.find(w => w.id === selected) ?? null
  const idx = week ? weeks.indexOf(week) : -1
  const prev = idx > 0 ? weeks[idx - 1] : null
  const nextNumber = (weeks[weeks.length - 1]?.week_number ?? 0) + 1
  const nameOf = (id: string) => exercises.find(x => x.id === id)?.name ?? '—'

  return (
    <>
      <button className="link back" onClick={onBack}>← Clientes</button>
      <h1 className="brand">{client.name}</h1>
      <p className="lead">Programa de entrenamiento</p>

      <div className="weekbar">
        {weeks.map(w => (
          <button key={w.id} aria-pressed={w.id === selected} onClick={() => { setSelected(w.id); setEditing(null) }}>S{w.week_number}</button>
        ))}
        <button className="add" onClick={() => act(() => createWeek(client.id, nextNumber), r => r)}>+ Semana</button>
      </div>

      {error && <p className="msg error" role="alert">{error}</p>}
      {weeks.length === 0 && <p className="hint">Este cliente aún no tiene programa. Pulsa «+ Semana» para empezar.</p>}
      {exercises.length === 0 && weeks.length > 0 && <p className="hint">Consejo: crea tus ejercicios en la pestaña Ejercicios, o escríbelos al añadirlos.</p>}

      {week && (
        <>
          <div className="actions wrap">
            <button className="small" onClick={() => act(() => copyWeek(week.id), r => r)}>Copiar a semana {nextNumber}</button>
            <button className="small danger" onClick={() => setAsk({
              title: '¿Borrar la semana ' + week.week_number + '?',
              text: 'Se borrarán todas sus sesiones y ejercicios.',
              confirmLabel: 'Borrar semana',
              danger: true,
              run: () => deleteWeek(week.id)
            })}>Borrar semana</button>
          </div>

          {prev && (
            <details className="prev">
              <summary>Ver semana {prev.week_number} (para programar en base a ella)</summary>
              {prev.program_sessions.map(s => (
                <div key={s.id} className="prev-session">
                  <p className="card-main">{s.title}</p>
                  {s.program_items.map(i => <p key={i.id} className="small-text">{nameOf(i.exercise_id)} · {describeItem(i)}</p>)}
                </div>
              ))}
            </details>
          )}

          {week.program_sessions.map(s => (
            <section className="session" key={s.id}>
              <div className="session-head">
                <input
                  key={s.id + s.title}
                  defaultValue={s.title}
                  aria-label="Nombre de la sesión"
                  onBlur={e => {
                    const t = e.target.value.trim()
                    if (t !== '' && t !== s.title) void act(() => renameSession(s.id, t))
                  }}
                />
                <button className="small danger" onClick={() => setAsk({
                  title: '¿Borrar la sesión?',
                  text: 'Se borrará «' + s.title + '» con todos sus ejercicios.',
                  confirmLabel: 'Borrar sesión',
                  danger: true,
                  run: () => deleteSession(s.id)
                })}>Borrar</button>
              </div>

              {s.program_items.map(i => (
                editing?.item?.id === i.id ? (
                  <ItemForm key={i.id} exercises={exercises} initial={i}
                    onCancel={() => setEditing(null)}
                    onCreateExercise={n => createExercise(n, null)}
                    onSave={async input => { await saveItem(s.id, i.position, input, i); setEditing(null); await reload() }} />
                ) : (
                  <div className="item" key={i.id}>
                    <p className="card-main">{nameOf(i.exercise_id)} <span className="muted">{describeItem(i)}</span></p>
                    {i.note && <p className="note">{i.note}</p>}
                    {i.item_variants.length > 0 && (
                      <p className="small-text">Variantes: {i.item_variants.map(v => nameOf(v.exercise_id)).join(', ')}</p>
                    )}
                    <div className="actions">
                      <button className="small" onClick={() => setEditing({ sessionId: s.id, item: i })}>Editar</button>
                      <button className="small danger" onClick={() => setAsk({
                        title: '¿Quitar ejercicio?',
                        text: 'Se quitará «' + nameOf(i.exercise_id) + '» de esta sesión.',
                        confirmLabel: 'Quitar',
                        danger: true,
                        run: () => deleteItem(i.id)
                      })}>Quitar</button>
                    </div>
                  </div>
                )
              ))}

              {editing && editing.sessionId === s.id && editing.item === null ? (
                <ItemForm exercises={exercises} initial={null}
                  onCancel={() => setEditing(null)}
                  onCreateExercise={n => createExercise(n, null)}
                  onSave={async input => {
                    const pos = (s.program_items[s.program_items.length - 1]?.position ?? 0) + 1
                    await saveItem(s.id, pos, input, null)
                    setEditing(null)
                    await reload()
                  }} />
              ) : (
                <button className="small" onClick={() => setEditing({ sessionId: s.id, item: null })}>+ Añadir ejercicio</button>
              )}
            </section>
          ))}

          <button className="small primary" onClick={() => {
            const pos = (week.program_sessions[week.program_sessions.length - 1]?.position ?? 0) + 1
            void act(() => addSession(week.id, pos, 'Sesión ' + pos))
          }}>+ Añadir sesión</button>
        </>
      )}
      {ask && <ConfirmDialog ask={ask} onConfirm={confirm} onCancel={() => setAsk(null)} />}
    </>
  )
}
