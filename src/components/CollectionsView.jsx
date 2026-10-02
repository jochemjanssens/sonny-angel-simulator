import Angel from './Angel'
import BoxArt from './BoxArt'
import { SERIES, euro } from '../data/collections'

export function SeriesGrid({ inventory, onSelect }) {
  return (
    <section>
      <div className="hero">
        <div>
          <h1 className="hero__title">Who will you meet today?</h1>
          <p className="hero__text">
            Every blind box hides one of the figures in a series — and with a little luck, a rare secret
            figure. You get a small allowance every day, so choose your box wisely!
          </p>
        </div>
      </div>
      <div className="series-grid">
        {SERIES.map((s) => {
          const owned = s.figures.filter((f) => inventory[f.id]).length
          const secret = !!inventory[s.secret.id]
          const pct = Math.round((owned / s.figures.length) * 100)
          return (
            <button key={s.id} className="series-card" style={{ '--theme': s.theme }} onClick={() => onSelect(s.id)}>
              <div className="series-card__art">
                <BoxArt series={s} size="sm" />
              </div>
              <div className="series-card__body">
                <h3>{s.name}</h3>
                <p className="series-card__tagline">{s.tagline}</p>
                <div className="progress" aria-label={`${owned} of ${s.figures.length} collected`}>
                  <div className="progress__bar" style={{ width: `${pct}%` }} />
                </div>
                <div className="series-card__meta">
                  <span>
                    {owned}/{s.figures.length} collected {secret && <span className="star">★</span>}
                  </span>
                  <span className="price">{euro(s.price)}</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function SeriesDetail({ series, inventory, seen = {}, listed = new Set(), wallet, onBack, onBuy, onFigure }) {
  const owned = series.figures.filter((f) => inventory[f.id]).length
  const canAfford = wallet >= series.price
  // Values stay a mystery until you've pulled that figure at least once.
  const isSeen = (f) => !!(seen[f.id] || inventory[f.id])
  const secretOwned = !!inventory[series.secret.id]
  const secretSeen = isSeen(series.secret)

  return (
    <section className="detail" style={{ '--theme': series.theme }}>
      <button className="link-back" onClick={onBack}>
        ← All collections
      </button>
      <div className="detail__head">
        <div className="detail__art">
          <BoxArt series={series} size="lg" className="boxart--float" />
        </div>
        <div className="detail__info">
          {series.limited && <span className="badge badge--limited">Limited edition</span>}
          <h1>{series.name}</h1>
          <p className="detail__tagline">{series.tagline}</p>
          <dl className="facts">
            <div>
              <dt>Box price</dt>
              <dd>{euro(series.price)}</dd>
            </div>
            <div>
              <dt>Collected</dt>
              <dd>
                {owned}/{series.figures.length}
              </dd>
            </div>
            <div>
              <dt>Secret odds</dt>
              <dd>1 in {series.odds}</dd>
            </div>
          </dl>
          <button className="btn btn--primary btn--lg" onClick={onBuy} disabled={!canAfford}>
            Buy a blind box · {euro(series.price)}
          </button>
          {!canAfford && (
            <p className="detail__warn">Not enough budget — come back tomorrow or sell some duplicates.</p>
          )}
        </div>
      </div>

      <h2 className="section-title">The line-up</h2>
      <div className="lineup">
        {series.figures.map((f) => {
          const count = inventory[f.id] || 0
          const sold = !count && isSeen(f)
          const tag = listed.has(f.id) ? 'Listed' : 'Sold'
          return (
            <button
              key={f.id}
              className={`lineup__item ${count ? 'is-owned' : ''} ${sold ? 'is-sold' : ''}`}
              onClick={() => count && onFigure(f.id)}
              title={sold ? (tag === 'Listed' ? "It's on the market right now" : 'You had this one but sold it') : undefined}
            >
              {count > 1 && <span className="count">×{count}</span>}
              {sold && <span className="sold-tag">{tag}</span>}
              <Angel figure={f} silhouette={!count && !sold} size={84} />
              <span className="lineup__name">{f.name}</span>
              <span className="lineup__value">{isSeen(f) ? euro(f.value) : '€ ?'}</span>
            </button>
          )
        })}
        <button
          className={`lineup__item lineup__item--secret ${secretOwned ? 'is-owned' : ''} ${secretSeen && !secretOwned ? 'is-sold' : ''}`}
          onClick={() => secretOwned && onFigure(series.secret.id)}
          title={secretSeen && !secretOwned ? 'You had this one but sold it' : undefined}
        >
          {inventory[series.secret.id] > 1 && <span className="count">×{inventory[series.secret.id]}</span>}
          {secretSeen && !secretOwned && <span className="sold-tag">{listed.has(series.secret.id) ? 'Listed' : 'Sold'}</span>}
          <Angel figure={series.secret} silhouette={!secretSeen} size={84} />
          <span className="lineup__name">{secretSeen ? series.secret.name : 'Secret'}</span>
          <span className="lineup__value">{secretSeen ? euro(series.secret.value) : '€ ?'}</span>
        </button>
      </div>
    </section>
  )
}
