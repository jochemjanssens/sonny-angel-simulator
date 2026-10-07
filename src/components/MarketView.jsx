import { useMemo, useState } from 'react'
import Angel from './Angel'
import PriceInput, { formatPrice, parsePrice } from './PriceInput'
import { FIGURE_BY_ID, SERIES, SERIES_BY_ID, euro } from '../data/collections'
import { useT } from '../i18n'

const STATUS_TEXT = {
  countered: 'countered',
  accepted: 'accepted',
  rejected: 'rejected',
  withdrawn: 'withdrawn',
  closed: 'closed',
}

export default function MarketView({ market, wallet, inventory, act }) {
  const { t } = useT()
  const [view, setView] = useState('browse')
  const sellingTurns = market.selling.filter((t) => t.myTurn).length
  const buyingTurns = market.buying.filter((t) => t.myTurn).length

  return (
    <section className="market">
      <div className="market__head">
        <div>
          <h1 className="hero__title">{t('Market')}</h1>
          <p className="hero__text">{t('Buy, sell and negotiate with real players. Listed figures leave your shelf until they sell or you cancel.')}</p>
        </div>
        <nav className="subtabs">
          <button className={view === 'browse' ? 'is-active' : ''} onClick={() => setView('browse')}>
            {t('Browse')}
          </button>
          <button className={view === 'selling' ? 'is-active' : ''} onClick={() => setView('selling')}>
            {t('My listings')} {sellingTurns > 0 && <span className="dot-badge">{sellingTurns}</span>}
          </button>
          <button className={view === 'buying' ? 'is-active' : ''} onClick={() => setView('buying')}>
            {t('My offers')} {buyingTurns > 0 && <span className="dot-badge">{buyingTurns}</span>}
          </button>
        </nav>
      </div>

      {!market.loaded ? (
        <p className="market__empty">{t('Loading the market…')}</p>
      ) : view === 'browse' ? (
        <Browse market={market} wallet={wallet} inventory={inventory} act={act} onGoOffers={() => setView('buying')} />
      ) : view === 'selling' ? (
        <Selling market={market} act={act} />
      ) : (
        <Buying market={market} act={act} />
      )}
    </section>
  )
}

// Negotiations waiting for your answer first, then other open ones, newest offer first.
const threadRank = (t) => (t.myTurn ? 0 : t.open ? 1 : 2)
const byUrgency = (a, b) => threadRank(a) - threadRank(b) || b.latest.created_at.localeCompare(a.latest.created_at)

function FigureCell({ figureId, size = 64 }) {
  const { t } = useT()
  const fig = FIGURE_BY_ID[figureId]
  const series = SERIES_BY_ID[fig.seriesId]
  return (
    <div className="listing__figure" style={{ '--theme': series.theme }}>
      <Angel figure={fig} size={size} />
      <div>
        <strong>{fig.name}</strong>
        <span>{series.name}</span>
        <span className="listing__value">{t('Market value {value}', { value: euro(fig.value) })}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- browse

function Browse({ market, wallet, inventory, act, onGoOffers }) {
  const { t } = useT()
  const [seriesFilter, setSeriesFilter] = useState('all')
  const [missingOnly, setMissingOnly] = useState(false)
  const [offerFor, setOfferFor] = useState(null)
  const [amount, setAmount] = useState('')

  const myThreadByListing = useMemo(() => new Map(market.buying.filter((t) => t.open).map((t) => [t.listing.id, t])), [market.buying])
  const listings = market.active.filter(
    (l) =>
      (seriesFilter === 'all' || FIGURE_BY_ID[l.figure_id].seriesId === seriesFilter) &&
      // "missing" = not on your shelf right now (figures you sold count as missing)
      (!missingOnly || !(inventory[l.figure_id] > 0)),
  )

  const sendOffer = async (l) => {
    const p = parsePrice(amount)
    if (!p) return
    const done = await act('make_offer', { p_listing: l.id, p_amount: p }, t('Offer of {amount} sent to @{user}', { amount: euro(p), user: l.seller?.username }))
    if (done) setOfferFor(null)
  }

  return (
    <>
      <div className="market__filters">
        <select className="text-input" value={seriesFilter} onChange={(e) => setSeriesFilter(e.target.value)} aria-label={t('Filter by series')}>
          <option value="all">{t('All series')}</option>
          {SERIES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <label className="toggle">
          <input type="checkbox" checked={missingOnly} onChange={(e) => setMissingOnly(e.target.checked)} />
          <span>{t("Only figures I don't have")}</span>
        </label>
        <span className="market__count">{listings.length} for sale</span>
      </div>

      {!listings.length ? (
        <p className="market__empty">
          {missingOnly ? t("Nothing for sale that's missing from your shelf right now.") : t('Nothing for sale here yet. List a figure from your shelf to get trading!')}
        </p>
      ) : (
        <div className="listing-grid">
          {listings.map((l) => {
            const own = l.seller_id === market.userId
            const thread = myThreadByListing.get(l.id)
            return (
              <article key={l.id} className={`listing ${own ? 'listing--own' : ''}`}>
                <FigureCell figureId={l.figure_id} />
                <div className="listing__meta">
                  <span className="listing__seller">{own ? t('Your listing') : t('by @{user}', { user: l.seller?.username })}</span>
                  <span className="listing__price">{euro(l.price)}</span>
                </div>
                {own ? null : thread ? (
                  <button className="listing__thread" onClick={onGoOffers}>
                    {thread.myTurn
                      ? t('@{user} countered: {amount} — respond', { user: l.seller?.username, amount: euro(thread.latest.amount) })
                      : t('Your offer {amount} is waiting', { amount: euro(thread.latest.amount) })}
                  </button>
                ) : offerFor === l.id ? (
                  <div className="listing__actions">
                    <PriceInput value={amount} onChange={setAmount} autoFocus label={t('Your offer')} />
                    <button className="btn btn--primary btn--sm" onClick={() => sendOffer(l)} disabled={!parsePrice(amount)}>
                      {t('Send offer')}
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={() => setOfferFor(null)}>
                      {t('Cancel')}
                    </button>
                  </div>
                ) : (
                  <div className="listing__actions">
                    <button
                      className="btn btn--primary btn--sm"
                      disabled={wallet < l.price}
                      title={wallet < l.price ? t('Not enough budget') : undefined}
                      onClick={() => act('buy_now', { p_listing: l.id }, t('You bought {name} for {price}!', { name: FIGURE_BY_ID[l.figure_id].name, price: euro(l.price) }))}
                    >
                      {t('Buy now')}
                    </button>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => {
                        setOfferFor(l.id)
                        setAmount(formatPrice(Math.max(0.01, Math.round(l.price * 80) / 100)))
                      }}
                    >
                      {t('Make offer')}
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------- my listings

function Selling({ market, act }) {
  const { t } = useT()
  const [editing, setEditing] = useState(null)
  const [price, setPrice] = useState('')
  // listings with a fresh offer for you float to the top, newest offer first
  const threadsFor = (id) => market.selling.filter((t) => t.listing?.id === id).sort(byUrgency)
  const active = market.mine
    .filter((l) => l.status === 'active')
    .map((l) => ({ l, threads: threadsFor(l.id) }))
    .sort((a, b) => {
      const ta = a.threads[0]
      const tb = b.threads[0]
      const ra = ta ? threadRank(ta) : 3
      const rb = tb ? threadRank(tb) : 3
      if (ra !== rb) return ra - rb
      const la = ta?.latest.created_at || a.l.created_at
      const lb = tb?.latest.created_at || b.l.created_at
      return lb.localeCompare(la)
    })
  const history = market.mine.filter((l) => l.status !== 'active')

  const savePrice = async (l) => {
    const p = parsePrice(price)
    if (!p) return
    if (await act('update_listing_price', { p_listing: l.id, p_price: p }, t('Price changed to {price}', { price: euro(p) }))) setEditing(null)
  }

  return (
    <>
      {!active.length && <p className="market__empty">{t('You have nothing listed. Open a figure on your shelf and choose "Put on market".')}</p>}
      {active.map(({ l, threads }) => {
        return (
          <article key={l.id} className="listing listing--wide">
            <div className="listing__row">
              <FigureCell figureId={l.figure_id} />
              <div className="listing__side">
                {editing === l.id ? (
                  <div className="listing__actions">
                    <PriceInput value={price} onChange={setPrice} autoFocus label={t('New price')} />
                    <button className="btn btn--primary btn--sm" onClick={() => savePrice(l)} disabled={!parsePrice(price)}>
                      {t('Save')}
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={() => setEditing(null)}>
                      {t('Cancel')}
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="listing__price">{euro(l.price)}</span>
                    <div className="listing__actions">
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => {
                          setEditing(l.id)
                          setPrice(formatPrice(l.price))
                        }}
                      >
                        {t('Change price')}
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => act('cancel_listing', { p_listing: l.id }, t('{name} is back on your shelf', { name: FIGURE_BY_ID[l.figure_id].name }))}
                      >
                        {t('Take off market')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            {threads.length ? (
              threads.map((t) => <Thread key={t.key} thread={t} act={act} />)
            ) : (
              <p className="listing__none">{t('No offers yet.')}</p>
            )}
          </article>
        )
      })}

      {history.length > 0 && (
        <>
          <h2 className="section-title">{t('History')}</h2>
          <ul className="history">
            {history.map((l) => (
              <li key={l.id}>
                <span>{FIGURE_BY_ID[l.figure_id].name}</span>
                <span className={`history__status history__status--${l.status}`}>
                  {l.status === 'sold' ? t('Sold for {price}', { price: euro(l.sold_price) }) : t('Taken off market')}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

// ---------------------------------------------------------------- my offers

function Buying({ market, act }) {
  const { t } = useT()
  const open = market.buying.filter((th) => th.open).sort(byUrgency)
  const closed = market.buying.filter((th) => !th.open).reverse()
  if (!market.buying.length) return <p className="market__empty">{t("You haven't made any offers yet. Find a figure in Browse and make an offer.")}</p>
  return (
    <>
      {open.map((th) => (
        <article key={th.key} className="listing listing--wide">
          <div className="listing__row">
            <FigureCell figureId={th.listing.figure_id} />
            <div className="listing__side">
              <span className="listing__seller">{t('by @{user}', { user: th.listing.seller?.username })}</span>
              <span className="listing__price">{t('Asking {price}', { price: euro(th.listing.price) })}</span>
            </div>
          </div>
          <Thread thread={th} act={act} />
        </article>
      ))}
      {closed.length > 0 && (
        <>
          <h2 className="section-title">{t('Past negotiations')}</h2>
          {closed.map((th) => (
            <article key={th.key} className="listing listing--wide listing--closed">
              <div className="listing__row">
                <FigureCell figureId={th.listing.figure_id} size={48} />
              </div>
              <Thread thread={th} act={act} />
            </article>
          ))}
        </>
      )}
    </>
  )
}

// ---------------------------------------------------------------- negotiation thread

function Thread({ thread, act }) {
  const { t } = useT()
  const [countering, setCountering] = useState(false)
  const [amount, setAmount] = useState('')
  const { latest, role, myTurn, open, listing } = thread
  const other = role === 'buyer' ? listing.seller?.username : thread.buyer
  const fig = FIGURE_BY_ID[listing.figure_id]
  const who = (o) => (o.proposed_by === role ? t('You') : `@${other}`)

  const sendCounter = async () => {
    const p = parsePrice(amount)
    if (!p) return
    if (await act('counter_offer', { p_offer: latest.id, p_amount: p }, t('Counter-offer of {amount} sent', { amount: euro(p) }))) setCountering(false)
  }

  let outcome = null
  if (!open) {
    if (latest.status === 'accepted') outcome = t('Deal! {name} sold for {amount}', { name: fig.name, amount: euro(latest.amount) })
    else if (latest.status === 'rejected') outcome = latest.proposed_by === role ? t('@{user} declined {amount}', { user: other, amount: euro(latest.amount) }) : t('You declined {amount}', { amount: euro(latest.amount) })
    else if (latest.status === 'withdrawn') outcome = t('Offer withdrawn')
    else outcome = listing.status === 'sold' ? t('Sold to someone else') : t('Listing closed')
  }

  return (
    <div className={`thread ${myTurn ? 'thread--turn' : ''}`}>
      <div className="thread__title">{role === 'seller' ? t('Negotiation with @{user}', { user: other }) : t('Your negotiation with @{user}', { user: other })}</div>
      <ol className="thread__offers">
        {thread.offers.map((o) => (
          <li key={o.id} className={o.proposed_by === role ? 'is-mine' : ''}>
            <span className="thread__who">{who(o)}</span>
            <span className="thread__amount">{euro(o.amount)}</span>
            {o.status !== 'pending' && <span className="thread__status">{t(STATUS_TEXT[o.status])}</span>}
          </li>
        ))}
      </ol>
      {outcome ? (
        <p className="thread__outcome">{outcome}</p>
      ) : myTurn ? (
        countering ? (
          <div className="listing__actions">
            <PriceInput value={amount} onChange={setAmount} autoFocus label={t('Your counter-offer')} />
            <button className="btn btn--primary btn--sm" onClick={sendCounter} disabled={!parsePrice(amount)}>
              {t('Send')}
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => setCountering(false)}>
              {t('Cancel')}
            </button>
          </div>
        ) : (
          <div className="listing__actions">
            <button
              className="btn btn--primary btn--sm"
              onClick={() =>
                act(
                  'accept_offer',
                  { p_offer: latest.id },
                  role === 'seller' ? t('Sold to @{user} for {amount}!', { user: other, amount: euro(latest.amount) }) : t('You bought {name} for {price}!', { name: fig.name, price: euro(latest.amount) }),
                )
              }
            >
              {t('Accept {amount}', { amount: euro(latest.amount) })}
            </button>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setCountering(true)
                setAmount(formatPrice(latest.amount))
              }}
            >
              {t('Counter')}
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => act('reject_offer', { p_offer: latest.id }, t('Offer declined'))}>
              {t('Decline')}
            </button>
          </div>
        )
      ) : (
        <div className="listing__actions">
          <span className="thread__waiting">{t('Waiting for @{user}…', { user: other })}</span>
          <button className="btn btn--ghost btn--sm" onClick={() => act('withdraw_offer', { p_offer: latest.id }, t('Offer withdrawn'))}>
            {t('Withdraw')}
          </button>
        </div>
      )}
    </div>
  )
}
