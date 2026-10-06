import { useEffect, useState } from 'react'
import Angel from './Angel'
import PriceInput, { formatPrice, parsePrice } from './PriceInput'
import { BANK_RATE, SERIES_BY_ID, euro } from '../data/collections'

export default function FigureModal({ figure, count, onList, onBank, onClose }) {
  const series = SERIES_BY_ID[figure.seriesId]
  const [price, setPrice] = useState(formatPrice(figure.value))
  const [busy, setBusy] = useState(false)
  const [confirmBank, setConfirmBank] = useState(false)
  const bankPrice = Math.round(figure.value * BANK_RATE * 100) / 100

  const bank = async () => {
    setBusy(true)
    await onBank()
    setBusy(false)
    setConfirmBank(false)
  }

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
        {count > 0 && (
          <div className="modal__sell">
            <p className="modal__sell-title">Or sell to the bank right away</p>
            {confirmBank ? (
              <div className="modal__actions">
                <span className="modal__note">Sell your {count === 1 ? 'only' : ''} {figure.name} for {euro(bankPrice)}?</span>
                <button className="btn btn--ghost btn--sm" onClick={() => setConfirmBank(false)}>
                  Keep it
                </button>
                <button className="btn btn--primary btn--sm" disabled={busy} onClick={bank}>
                  Sell
                </button>
              </div>
            ) : (
              <div className="modal__actions">
                <button className="btn btn--ghost" onClick={() => setConfirmBank(true)}>
                  Sell to bank · {euro(bankPrice)}
                </button>
              </div>
            )}
            <p className="modal__fine">The bank always buys, for {Math.round(BANK_RATE * 100)}% of the market value.</p>
          </div>
        )}
      </div>
    </div>
  )
}
