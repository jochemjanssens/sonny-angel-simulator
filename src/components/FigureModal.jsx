import { useEffect, useState } from 'react'
import Angel from './Angel'
import PriceInput, { parsePrice } from './PriceInput'
import { SERIES_BY_ID, euro } from '../data/collections'

export default function FigureModal({ figure, count, onList, onClose }) {
  const series = SERIES_BY_ID[figure.seriesId]
  const [price, setPrice] = useState(String(figure.value))
  const [busy, setBusy] = useState(false)

  const list = async () => {
    setBusy(true)
    await onList(parsePrice(price))
    setBusy(false)
  }

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal__card" style={{ '--theme': series.theme }} onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="modal__art">
          <Angel figure={figure} size={160} />
        </div>
        {figure.secret && <span className="badge badge--secret">★ Secret figure ★</span>}
        <h2>{figure.name}</h2>
        <p className="modal__series">{series.name}</p>
        <dl className="facts facts--compact">
          <div>
            <dt>Market value</dt>
            <dd>{euro(figure.value)}</dd>
          </div>
          <div>
            <dt>You own</dt>
            <dd>{count}</dd>
          </div>
        </dl>
        {count > 0 && (
          <div className="modal__sell">
            <p className="modal__sell-title">Sell to other players</p>
            <div className="modal__actions">
              <PriceInput value={price} onChange={setPrice} label="Asking price" />
              <button className="btn btn--primary" disabled={!parsePrice(price) || busy} onClick={list}>
                Put on market
              </button>
            </div>
            {count === 1 && <p className="modal__note">This is your only one: it leaves your shelf while it's listed.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
