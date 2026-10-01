import { useEffect, useState } from 'react'
import Angel from './Angel'
import { SELL_RATE, SERIES_BY_ID, euro, sellPrice } from '../data/collections'

export default function FigureModal({ figure, count, onSell, onClose }) {
  const series = SERIES_BY_ID[figure.seriesId]
  const dupes = count - 1
  const [confirmLast, setConfirmLast] = useState(false)

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
          <div>
            <dt>Sell price</dt>
            <dd>{euro(sellPrice(figure))}</dd>
          </div>
        </dl>
        {dupes > 0 ? (
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={() => onSell(1)}>
              Sell 1 · {euro(sellPrice(figure))}
            </button>
            {dupes > 1 && (
              <button className="btn btn--primary" onClick={() => onSell(dupes)}>
                Sell {dupes} duplicates · {euro(sellPrice(figure) * dupes)}
              </button>
            )}
          </div>
        ) : confirmLast ? (
          <div className="modal__actions">
            <p className="modal__note">This is your only {figure.name}. Sell it anyway?</p>
            <button className="btn btn--ghost" onClick={() => setConfirmLast(false)}>
              Keep it
            </button>
            <button className="btn btn--primary" onClick={() => onSell(1, true)}>
              Sell · {euro(sellPrice(figure))}
            </button>
          </div>
        ) : (
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={() => setConfirmLast(true)}>
              Sell my only one · {euro(sellPrice(figure))}
            </button>
          </div>
        )}
        <p className="modal__fine">You receive {Math.round(SELL_RATE * 100)}% of market value after marketplace fees.</p>
      </div>
    </div>
  )
}
