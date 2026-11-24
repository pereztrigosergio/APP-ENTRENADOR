import { useCallback, useEffect, useState } from 'react'
import { myPendingRequests, myTrainer, removeLink, respondRequest } from '../lib/api'
import type { RequestRow } from '../lib/helpers'
import ConfirmDialog, { type Ask } from '../components/ConfirmDialog'

export default function ClientLinks() {
  const [pending, setPending] = useState<RequestRow[]>([])
  const [trainer, setTrainer] = useState<RequestRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ask, setAsk] = useState<Ask | null>(null)

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

  async function confirm() {
    if (!ask) return
    const current = ask
    setAsk(null)
    setError(null)
    try {
      await current.run()
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const askAccept = (r: RequestRow) => setAsk({
    title: '¿Aceptar entrenador?',
    text: r.trainer_name + ' (' + r.trainer_public_id + ') será tu entrenador y podrá ver los datos que compartas con él.',
    confirmLabel: 'Aceptar',
    run: () => respondRequest(r.link_id, true)
  })

  const askReject = (r: RequestRow) => setAsk({
    title: '¿Rechazar la solicitud?',
    text: 'Se borrará la solicitud de ' + r.trainer_name + '.',
    confirmLabel: 'Rechazar',
    danger: true,
    run: () => respondRequest(r.link_id, false)
  })

  const askLeave = (r: RequestRow) => setAsk({
    title: '¿Dejar a tu entrenador?',
    text: 'Dejarás de entrenar con ' + r.trainer_name + ' y dejará de ver tus datos.',
    confirmLabel: 'Dejar entrenador',
    danger: true,
    run: () => removeLink(r.link_id)
  })

  return (
    <section className="block">
      {error && <p className="msg error" role="alert">{error}</p>}
      {trainer && (
        <div className="card">
          <p className="card-title">Tu entrenador</p>
          <p className="card-main">{trainer.trainer_name} <span className="muted">{trainer.trainer_public_id}</span></p>
          <button className="small danger" onClick={() => askLeave(trainer)}>Dejar entrenador</button>
        </div>
      )}
      {pending.map(r => (
        <div className="card" key={r.link_id}>
          <p className="card-title">Solicitud de entrenador</p>
          <p className="card-main">{r.trainer_name} <span className="muted">{r.trainer_public_id}</span> quiere entrenarte.</p>
          <div className="actions">
            <button className="small primary" onClick={() => askAccept(r)}>Aceptar</button>
            <button className="small" onClick={() => askReject(r)}>Rechazar</button>
          </div>
        </div>
      ))}
      {!trainer && pending.length === 0 && <p className="hint">Todavía no tienes entrenador.</p>}
      {ask && <ConfirmDialog ask={ask} onConfirm={confirm} onCancel={() => setAsk(null)} />}
    </section>
  )
}
