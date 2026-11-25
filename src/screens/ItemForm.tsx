import { useState } from 'react'
import { parseReps, type Exercise, type Item } from '../lib/helpers'
import type { ItemInput } from '../lib/api'

type Props = {
  exercises: Exercise[]
  initial: Item | null
  onSave: (input: ItemInput) => Promise<void>
  onCreateExercise: (name: string) => Promise<Exercise>
  onCancel: () => void
}

export default function ItemForm({ exercises, initial, onSave, onCreateExercise, onCancel }: Props) {
  const [exerciseId, setExerciseId] = useState(initial?.exercise_id ?? '')
  const [newName, setNewName] = useState('')
  const [sets, setSets] = useState(String(initial?.sets ?? 4))
  const [reps, setReps] = useState(initial?.reps ?? '8')
  const [weight, setWeight] = useState(initial?.weight_kg !== null && initial?.weight_kg !== undefined ? String(initial.weight_kg) : '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [variants, setVariants] = useState<string[]>(initial?.item_variants.map(v => v.exercise_id) ?? [])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const nSets = Number(sets)
    if (!Number.isInteger(nSets) || nSets < 1 || nSets > 20) return setError('Las series deben ser un número entre 1 y 20')
    const cleanReps = parseReps(reps)
    if (!cleanReps) return setError('Las repeticiones son un número (8) o un rango (8-10)')
    const w = weight.trim() === '' ? null : Number(weight.replace(',', '.'))
    if (w !== null && (Number.isNaN(w) || w < 0 || w > 999)) return setError('Los kilos no son válidos')
    if (!exerciseId && newName.trim() === '') return setError('Elige un ejercicio o escribe uno nuevo')
    setBusy(true)
    try {
      let id = exerciseId
      if (newName.trim() !== '') {
        const found = exercises.find(x => x.name.toLowerCase() === newName.trim().toLowerCase())
        id = found ? found.id : (await onCreateExercise(newName)).id
      }
      await onSave({
        exercise_id: id,
        sets: nSets,
        reps: cleanReps,
        weight_kg: w,
        note: note.trim() === '' ? null : note.trim(),
        variant_ids: variants.filter(v => v !== id)
      })
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  const toggle = (id: string) => setVariants(variants.includes(id) ? variants.filter(v => v !== id) : [...variants, id])

  return (
    <form className="itemform" onSubmit={submit}>
      <label>Ejercicio
        <select value={exerciseId} onChange={e => setExerciseId(e.target.value)}>
          <option value="">Elige de tu biblioteca…</option>
          {exercises.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </label>
      <label>…o escribe uno nuevo
        <input value={newName} onChange={e => setNewName(e.target.value)} autoComplete="off" />
      </label>
      <div className="trio">
        <label>Series<input inputMode="numeric" value={sets} onChange={e => setSets(e.target.value)} /></label>
        <label>Repeticiones<input value={reps} onChange={e => setReps(e.target.value)} placeholder="8 o 8-10" /></label>
        <label>Kilos<input inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} placeholder="opcional" /></label>
      </div>
      <label>Nota para el cliente
        <textarea rows={2} maxLength={300} value={note} onChange={e => setNote(e.target.value)} />
      </label>
      {exercises.length > 1 && (
        <div>
          <p className="label">Variantes (el cliente podrá elegir)</p>
          <div className="choices">
            {exercises.filter(x => x.id !== exerciseId).map(x => (
              <button type="button" key={x.id} aria-pressed={variants.includes(x.id)} onClick={() => toggle(x.id)}>{x.name}</button>
            ))}
          </div>
        </div>
      )}
      {error && <p className="msg error" role="alert">{error}</p>}
      <div className="actions end">
        <button type="button" className="small" onClick={onCancel}>Cancelar</button>
        <button className="small primary" disabled={busy}>Guardar</button>
      </div>
    </form>
  )
}
