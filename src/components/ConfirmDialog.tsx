import { useEffect } from 'react'

export type Ask = {
  title: string
  text: string
  confirmLabel: string
  danger?: boolean
  run: () => Promise<void>
}

export default function ConfirmDialog({ ask, onConfirm, onCancel }: { ask: Ask; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="overlay" onClick={onCancel}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title" onClick={e => e.stopPropagation()}>
        <h2 id="dlg-title">{ask.title}</h2>
        <p>{ask.text}</p>
        <div className="actions end">
          <button className="small" autoFocus onClick={onCancel}>Cancelar</button>
          <button className={'small ' + (ask.danger ? 'danger' : 'primary')} onClick={onConfirm}>{ask.confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
