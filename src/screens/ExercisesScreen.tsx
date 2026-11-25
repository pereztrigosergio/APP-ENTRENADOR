import { useCallback, useEffect, useState } from 'react'
import { createExercise, deleteExercise, listExercises } from '../lib/api'
import { MUSCLE_GROUPS, type Exercise } from '../lib/helpers'
import ConfirmDialog, { type Ask } from '../components/ConfirmDialog'

export default function ExercisesScreen() {
  const [list, setList] = useState<Exercise[] | null>(null)
  const [name, setName] = useState('')
  const [group, setGroup] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ask, setAsk] = useState<Ask | null>(null)

  const load = useCallback(async () => {
    try { setList(await listExercises()) } catch (e) { setError((e as Error).message) }
  }, [])
  useEffect(() => { void load() }, [load])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (name.trim() === '') return setError('Escribe el nombre del ejercicio')
    try {
      await createExercise(name, group)
      setName('')
      await load()
    } catch (err) {
      setError((err as Error).message === 'Eso ya existe' ? 'Ya tienes un ejercicio con ese nombre' : (err as Error).message)
    }
  }

  async function confirm() {
    if (!ask) return
    const current = ask
    setAsk(null)
    try { await current.run(); await load() } catch (e) { setError((e as Error).message) }
  }

  return (
    <>
      <h1 className="brand">Ejercicios</h1>
      <p className="lead">Tu biblioteca. Aquí los creas una vez y los usas al programar.</p>
      <form onSubmit={add} className="addform">
        <label>Nombre
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Sentadilla" autoComplete="off" />
        </label>
        <div>
          <p className="label">Grupo muscular (opcional)</p>
          <div className="choices">
            {Object.entries(MUSCLE_GROUPS).map(([k, label]) => (
              <button type="button" key={k} aria-pressed={group === k} onClick={() => setGroup(group === k ? null : k)}>{label}</button>
            ))}
          </div>
        </div>
        <button className="primary">Añadir ejercicio</button>
      </form>
      {error && <p className="msg error" role="alert">{error}</p>}
      <section className="block">
        {list && list.length === 0 && <p className="hint">Todavía no tienes ejercicios.</p>}
        {list?.map(x => (
          <div className="card row" key={x.id}>
            <div>
              <p className="card-main">{x.name}</p>
              {x.muscle_group && <p className="muted small-text">{MUSCLE_GROUPS[x.muscle_group]}</p>}
            </div>
            <button className="small danger" onClick={() => setAsk({
              title: '¿Borrar ejercicio?',
              text: 'Se borrará «' + x.name + '» de tu biblioteca.',
              confirmLabel: 'Borrar',
              danger: true,
              run: () => deleteExercise(x.id)
            })}>Borrar</button>
          </div>
        ))}
      </section>
      {ask && <ConfirmDialog ask={ask} onConfirm={confirm} onCancel={() => setAsk(null)} />}
    </>
  )
}
