import { useState } from 'react'
import Angel from './Angel'
import { FIGURE_BY_ID, SERIES, euro, sellPrice } from '../data/collections'

export default function ShelfView({ inventory, stats, onFigure, onSell, onSellAll, onGoShop }) {
  const [confirming, setConfirming] = useState(false)

  const entries = Object.entries(inventory).filter(([, n]) => n > 0)
  const totalFigures = entries.reduce((s, [, n]) => s + n, 0)
  const collectionValue = entries.reduce((s, [id, n]) => s + FIGURE_BY_ID[id].value * n, 0)
  const dupes = entries.filter(([, n]) => n > 1)
  const dupeCount = dupes.reduce((s, [, n]) => s + n - 1, 0)
  const dupePayout = dupes.reduce((s, [id, n]) => s + sellPrice(FIGURE_BY_ID[id]) * (n - 1), 0)

  if (!entries.length) {
    return (
      <section className="shelf-empty">
        <Angel figure={SERIES[0].figures[0]} silhouette size={130} />
        <h2>Your shelf is still empty</h2>
        <p>Open your first blind box to welcome a Sonny Angel home.</p>
        <button className="btn btn--primary btn--lg" onClick={onGoShop}>
          Browse collections
        </button>
      </section>
    )
  }

  return (
    <section>
      <div className="stats">
        <Stat label="Figures" value={totalFigures} />
        <Stat label="Unique" value={entries.length} />
        <Stat label="Collection value" value={euro(collectionValue)} />
        <Stat label="Boxes opened" value={stats.opened} />
        <Stat label="Total spent" value={euro(stats.spent)} />
        <Stat label="Earned from sales" value={euro(stats.earned)} />
      </div>

      <div className="shelf-actions">
        <p>
          {dupeCount ? (
            <>
              You have <strong>{dupeCount}</strong> duplicate{dupeCount > 1 ? 's' : ''} worth{' '}
              <strong>{euro(dupePayout)}</strong> after fees.
            </>
          ) : (
            'No duplicates to sell — nice luck!'
          )}
        </p>
        {dupeCount > 0 &&
          (confirming ? (
            <span className="confirm">
              Sell all {dupeCount}?
              <button className="btn btn--primary btn--sm" onClick={() => { onSellAll(); setConfirming(false) }}>
                Yes, sell
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </span>
          ) : (
            <button className="btn btn--primary btn--sm" onClick={() => setConfirming(true)}>
              Sell all duplicates
            </button>
          ))}
      </div>

      {SERIES.map((s) => {
        const figs = [...s.figures, s.secret].filter((f) => inventory[f.id])
        if (!figs.length) return null
        return (
          <div key={s.id} className="shelf" style={{ '--theme': s.theme }}>
            <div className="shelf__label">
              {s.name}
              <span>
                {s.figures.filter((f) => inventory[f.id]).length}/{s.figures.length}
              </span>
            </div>
            <div className="shelf__row">
              {figs.map((f) => (
                <div key={f.id} className="shelf__item">
                  {inventory[f.id] > 1 && <span className="count">×{inventory[f.id]}</span>}
                  <button className="shelf__figure" onClick={() => onFigure(f.id)} title={`${f.name} — details`}>
                    <Angel figure={f} size={78} />
                    <span className="shelf__name">{f.name}</span>
                  </button>
                  {inventory[f.id] > 1 ? (
                    <button className="shelf__sell" onClick={() => onSell(f.id)} title="Sell one duplicate">
                      Sell {euro(sellPrice(f))}
                    </button>
                  ) : (
                    <button className="shelf__sell shelf__sell--muted" onClick={() => onFigure(f.id)}>
                      {euro(f.value)}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  )
}
