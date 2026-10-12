import { useEffect, useState } from 'react'
import Angel from './Angel'
import { FIGURE_BY_ID, SERIES, euro } from '../data/collections'
import { supabase } from '../lib/supabase'
import { useT } from '../i18n'

// Another player's shelf as { figureId: count }, or null while loading.
export function useShelf(userId) {
  const [shelf, setShelf] = useState(null)
  useEffect(() => {
    if (!userId) return setShelf(null)
    let alive = true
    supabase.rpc('public_shelf', { p_user: userId }).then(({ data, error }) => {
      if (alive) setShelf(error ? {} : Object.fromEntries(data.map((r) => [r.figure_id, r.count])))
    })
    return () => {
      alive = false
    }
  }, [userId])
  return shelf
}

// Everything a player has: their shelf plus what they have listed on the market.
// Swaps only happen between figures both players don't have yet.
export function ownedBy(shelf, userId, active) {
  if (!shelf) return null
  const out = { ...shelf }
  for (const l of active) if (l.seller_id === userId) out[l.figure_id] = (out[l.figure_id] || 0) + 1
  return out
}

// "Does the person who would receive this figure already have it?"
// receiver: { name, shelf, isMe }
export function HaveBadge({ figureId, receiver }) {
  const { t } = useT()
  if (!receiver?.shelf) return null
  const n = receiver.shelf[figureId] || 0
  const label = receiver.isMe
    ? n
      ? t('You have {n} already', { n })
      : t('New for you!')
    : n
      ? t('@{user} has {n} already', { user: receiver.name, n })
      : t('New for @{user}!', { user: receiver.name })
  return <span className={`have ${n ? 'have--yes' : 'have--no'}`}>{label}</span>
}

// Pick one figure from a shelf to offer in a swap: only duplicates (the giver keeps one)
// that the receiver doesn't have yet.
export function FigurePicker({ shelf, receiver, value, onChange }) {
  const { t } = useT()
  if (!shelf || !receiver?.shelf) return <p className="picker__empty">{t('Loading shelf…')}</p>
  const order = SERIES.flatMap((s) => [...s.figures, s.secret].map((f) => f.id))
  const ids = order.filter((id) => shelf[id] >= 2 && !(receiver.shelf[id] > 0))
  if (!ids.length)
    return (
      <p className="picker__empty">
        {receiver.isMe
          ? t('@{user} has no duplicates that you don’t have yet.', { user: receiver.from })
          : t('You have no duplicates that @{user} doesn’t have yet. Only figures you have twice or more can be swapped.', { user: receiver.name })}
      </p>
    )
  return (
    <div className="picker" role="radiogroup" aria-label={t('Choose a figure to swap')}>
      {ids.map((id) => {
        const f = FIGURE_BY_ID[id]
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value === id}
            className={`picker__item ${value === id ? 'is-active' : ''}`}
            onClick={() => onChange(id)}
          >
            <Angel figure={f} size={44} />
            <span className="picker__name">{f.name}</span>
            <span className="picker__value">
              {euro(f.value)} · ×{shelf[id]}
            </span>
            <HaveBadge figureId={id} receiver={receiver} />
          </button>
        )
      })}
    </div>
  )
}

// What an offer is worth: an amount, or a figure (with the "already has it?" badge).
export function OfferValue({ offer, receiver }) {
  const { t } = useT()
  if (!offer.offered_figure) return <span className="thread__amount">{euro(offer.amount)}</span>
  const f = FIGURE_BY_ID[offer.offered_figure]
  return (
    <span className="swap-chip" title={t('Swap for {name}', { name: f.name })}>
      <span aria-hidden>🔁</span>
      <Angel figure={f} size={26} />
      <span className="swap-chip__name">{f.name}</span>
      <HaveBadge figureId={f.id} receiver={receiver} />
    </span>
  )
}

// Money or swap, used by the offer and counter-offer forms. `swapBlocked` explains why swapping isn't possible.
export function OfferModeTabs({ mode, onChange, swapBlocked }) {
  const { t } = useT()
  return (
    <>
      <div className="mode-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'money'} className={mode === 'money' ? 'is-active' : ''} onClick={() => onChange('money')}>
          💶 {t('Money')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'swap'}
          className={mode === 'swap' ? 'is-active' : ''}
          onClick={() => onChange('swap')}
          disabled={!!swapBlocked}
          title={swapBlocked || undefined}
        >
          🔁 {t('Swap')}
        </button>
      </div>
      {swapBlocked && <p className="offer-form__note">{swapBlocked}</p>}
    </>
  )
}
