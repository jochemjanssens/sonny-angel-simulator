import { useEffect, useState } from 'react'
import Angel from './Angel'
import PriceInput, { formatPrice, parsePrice } from './PriceInput'
import { BANK_RATE, SERIES_BY_ID, euro } from '../data/collections'
import { useT } from '../i18n'

export default function FigureModal({ figure, count, onList, onBank, onClose }) {
  const series = SERIES_BY_ID[figure.seriesId]
  const [price, setPrice] = useState(formatPrice(figure.value))
  const [busy, setBusy] = useState(false)
  const { t } = useT()
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
        <button className="modal__close" onClick={onClose} aria-label={t('Close')}>
          ×
        </button>
        <div className="modal__art">
          <Angel figure={figure} size={160} />
        </div>
        {figure.secret && <span className="badge badge--secret">{t('★ Secret figure ★')}</span>}
        <h2>{figure.name}</h2>
        <p className="modal__series">{series.name}</p>
        <dl className="facts facts--compact">
          <div>
            <dt>{t('Market value')}</dt>
            <dd>{euro(figure.value)}</dd>
          </div>
          <div>
            <dt>{t('You own')}</dt>
            <dd>{count}</dd>
          </div>
        </dl>
        {count > 0 && (
          <div className="modal__sell">
            <p className="modal__sell-title">{t('Sell to other players')}</p>
            <div className="modal__actions">
              <PriceInput value={price} onChange={setPrice} label={t('Asking price')} />
              <button className="btn btn--primary" disabled={!parsePrice(price) || busy} onClick={list}>
                {t('Put on market')}
              </button>
            </div>
            {count === 1 && <p className="modal__note">{t("This is your only one: it leaves your shelf while it's listed.")}</p>}
          </div>
        )}
        {count > 0 && (
          <div className="modal__sell">
            <p className="modal__sell-title">{t('Or sell to the bank right away')}</p>
            {confirmBank ? (
              <div className="modal__actions">
                <span className="modal__note">{t(count === 1 ? 'Sell your only {name} for {price}?' : 'Sell your {name} for {price}?', { name: figure.name, price: euro(bankPrice) })}</span>
                <button className="btn btn--ghost btn--sm" onClick={() => setConfirmBank(false)}>
                  {t('Keep it')}
                </button>
                <button className="btn btn--primary btn--sm" disabled={busy} onClick={bank}>
                  {t('Sell')}
                </button>
              </div>
            ) : (
              <div className="modal__actions">
                <button className="btn btn--ghost" onClick={() => setConfirmBank(true)}>
                  {t('Sell to bank · {price}', { price: euro(bankPrice) })}
                </button>
              </div>
            )}
            <p className="modal__fine">{t('The bank always buys, for {pct}% of the market value.', { pct: Math.round(BANK_RATE * 100) })}</p>
          </div>
        )}
      </div>
    </div>
  )
}
