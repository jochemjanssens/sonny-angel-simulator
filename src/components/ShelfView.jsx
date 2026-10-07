import Angel from './Angel'
import { FIGURE_BY_ID, SERIES, euro } from '../data/collections'
import { useT } from '../i18n'

export default function ShelfView({ inventory, stats, onFigure, onGoShop, onGoMarket }) {
  const { t } = useT()

  const entries = Object.entries(inventory).filter(([, n]) => n > 0)
  const totalFigures = entries.reduce((s, [, n]) => s + n, 0)
  const collectionValue = entries.reduce((s, [id, n]) => s + FIGURE_BY_ID[id].value * n, 0)
  const dupes = entries.filter(([, n]) => n > 1)
  const dupeCount = dupes.reduce((s, [, n]) => s + n - 1, 0)
  const dupePayout = dupes.reduce((s, [id, n]) => s + FIGURE_BY_ID[id].value * (n - 1), 0)

  if (!entries.length) {
    return (
      <section className="shelf-empty">
        <Angel figure={SERIES[0].figures[0]} silhouette size={130} />
        <h2>{t('Your shelf is still empty')}</h2>
        <p>{t('Open your first blind box to welcome a Sonny Angel home.')}</p>
        <button className="btn btn--primary btn--lg" onClick={onGoShop}>
          {t('Browse collections')}
        </button>
      </section>
    )
  }

  return (
    <section>
      <div className="stats">
        <Stat label={t('Figures')} value={totalFigures} />
        <Stat label={t('Unique')} value={entries.length} />
        <Stat label={t('Collection value')} value={euro(collectionValue)} />
        <Stat label={t('Boxes opened')} value={stats.opened} />
        <Stat label={t('Total spent')} value={euro(stats.spent)} />
        <Stat label={t('Earned from sales')} value={euro(stats.earned)} />
        <Stat label={t('Earned from puzzles')} value={euro(stats.puzzleEarned || 0)} />
      </div>

      <div className="shelf-actions">
        <p>
          {dupeCount ? (
            t(dupeCount > 1 ? 'You have {n} duplicates (market value {value}). Put them on the market to trade with other players.' : 'You have {n} duplicate (market value {value}). Put it on the market to trade with other players.', { n: dupeCount, value: euro(dupePayout) })
          ) : (
            t('No duplicates — nice luck! You can still put any figure on the market.')
          )}
        </p>
        <button className="btn btn--primary btn--sm" onClick={onGoMarket}>
          {t('Go to market')}
        </button>
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
                  <button className="shelf__figure" onClick={() => onFigure(f.id)} title={t('{name} — details', { name: f.name })}>
                    <Angel figure={f} size={78} />
                    <span className="shelf__name">{f.name}</span>
                  </button>
                  <button
                    className={`shelf__sell ${inventory[f.id] > 1 ? '' : 'shelf__sell--muted'}`}
                    onClick={() => onFigure(f.id)}
                    title={t('Put on the market')}
                  >
                    {inventory[f.id] > 1 ? t('Sell') : euro(f.value)}
                  </button>
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
