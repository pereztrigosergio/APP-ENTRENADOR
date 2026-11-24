import { useCallback, useEffect, useState } from 'react'
import { myPendingRequests, myTrainer, removeLink, respondRequest } from '../lib/api'
import type { RequestRow } from '../lib/helpers'

export default function ClientLinks() {
  const [pending, setPending] = useState<RequestRow[]>([])
  const [trainer, setTrainer] = useState<RequestRow | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([myPendingRequests(), myTrainer()])
      setPending(p)
      setTrainer(t)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function answer(r: RequestRow, accept: boolean) {
    setError(null)
    try {
      await respondRequest(r.link_id, accept)
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function leave(r: RequestRow) {
    if (!window.confirm('¿Dejar de entrenar con ' + r.trainer_name + '?')) return
    try {
      await removeLink(r.link_id)
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <section className="block">
      {error && <p className="msg error" role="alert">{error}</p>}
      {trainer && (
        <div className="card">
          <p className="card-title">Tu entrenador</p>
          <p className="card-main">{trainer.trainer_name} <span className="muted">{trainer.trainer_public_id}</span></p>
          <button className="small danger" onClick={() => leave(trainer)}>Dejar entrenador</button>
        </div>
      )}
      {pending.map(r => (
        <div className="card" key={r.link_id}>
          <p className="card-title">Solicitud de entrenador</p>
          <p className="card-main">{r.trainer_name} <span className="muted">{r.trainer_public_id}</span> quiere entrenarte.</p>
          <div className="actions">
            <button className="small primary" onClick={() => answer(r, true)}>Aceptar</button>
            <button className="small" onClick={() => answer(r, false)}>Rechazar</button>
          </div>
        </div>
      ))}
      {!trainer && pending.length === 0 && <p className="hint">Todavía no tienes entrenador.</p>}
    </section>
  )
}
