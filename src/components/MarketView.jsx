import { useMemo, useState } from 'react'
import Angel from './Angel'
import PriceInput, { formatPrice, parsePrice } from './PriceInput'
import { FIGURE_BY_ID, SERIES, SERIES_BY_ID, euro } from '../data/collections'

const STATUS_TEXT = {
  countered: 'countered',
  accepted: 'accepted',
  rejected: 'rejected',
  withdrawn: 'withdrawn',
  closed: 'closed',
}

export default function MarketView({ market, wallet, inventory, act }) {
  const [view, setView] = useState('browse')
  const sellingTurns = market.selling.filter((t) => t.myTurn).length
  const buyingTurns = market.buying.filter((t) => t.myTurn).length

  return (
    <section className="market">
      <div className="market__head">
        <div>
          <h1 className="hero__title">Market</h1>
          <p className="hero__text">Buy, sell and negotiate with real players. Listed figures leave your shelf until they sell or you cancel.</p>
        </div>
        <nav className="subtabs">
          <button className={view === 'browse' ? 'is-active' : ''} onClick={() => setView('browse')}>
            Browse
          </button>
          <button className={view === 'selling' ? 'is-active' : ''} onClick={() => setView('selling')}>
            My listings {sellingTurns > 0 && <span className="dot-badge">{sellingTurns}</span>}
          </button>
          <button className={view === 'buying' ? 'is-active' : ''} onClick={() => setView('buying')}>
            My offers {buyingTurns > 0 && <span className="dot-badge">{buyingTurns}</span>}
          </button>
        </nav>
      </div>

      {!market.loaded ? (
        <p className="market__empty">Loading the market…</p>
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

function FigureCell({ figureId, size = 64 }) {
  const fig = FIGURE_BY_ID[figureId]
  const series = SERIES_BY_ID[fig.seriesId]
  return (
    <div className="listing__figure" style={{ '--theme': series.theme }}>
      <Angel figure={fig} size={size} />
      <div>
        <strong>{fig.name}</strong>
        <span>{series.name}</span>
        <span className="listing__value">Market value {euro(fig.value)}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- browse

function Browse({ market, wallet, inventory, act, onGoOffers }) {
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
    const done = await act('make_offer', { p_listing: l.id, p_amount: p }, `Offer of ${euro(p)} sent to @${l.seller?.username}`)
    if (done) setOfferFor(null)
  }

  return (
    <>
      <div className="market__filters">
        <select className="text-input" value={seriesFilter} onChange={(e) => setSeriesFilter(e.target.value)} aria-label="Filter by series">
          <option value="all">All series</option>
          {SERIES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <label className="toggle">
          <input type="checkbox" checked={missingOnly} onChange={(e) => setMissingOnly(e.target.checked)} />
          <span>Only figures I don't have</span>
        </label>
        <span className="market__count">{listings.length} for sale</span>
      </div>

      {!listings.length ? (
        <p className="market__empty">
          {missingOnly ? "Nothing for sale that's missing from your shelf right now." : 'Nothing for sale here yet. List a figure from your shelf to get trading!'}
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
                  <span className="listing__seller">{own ? 'Your listing' : `by @${l.seller?.username}`}</span>
                  <span className="listing__price">{euro(l.price)}</span>
                </div>
                {own ? null : thread ? (
                  <button className="listing__thread" onClick={onGoOffers}>
                    {thread.myTurn
                      ? `@${l.seller?.username} countered: ${euro(thread.latest.amount)} — respond`
                      : `Your offer ${euro(thread.latest.amount)} is waiting`}
                  </button>
                ) : offerFor === l.id ? (
                  <div className="listing__actions">
                    <PriceInput value={amount} onChange={setAmount} autoFocus label="Your offer" />
                    <button className="btn btn--primary btn--sm" onClick={() => sendOffer(l)} disabled={!parsePrice(amount)}>
                      Send offer
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={() => setOfferFor(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="listing__actions">
                    <button
                      className="btn btn--primary btn--sm"
                      disabled={wallet < l.price}
                      title={wallet < l.price ? 'Not enough budget' : undefined}
                      onClick={() => act('buy_now', { p_listing: l.id }, `You bought ${FIGURE_BY_ID[l.figure_id].name} for ${euro(l.price)}!`)}
                    >
                      Buy now
                    </button>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => {
                        setOfferFor(l.id)
                        setAmount(formatPrice(Math.max(0.01, Math.round(l.price * 80) / 100)))
                      }}
                    >
                      Make offer
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
  const [editing, setEditing] = useState(null)
  const [price, setPrice] = useState('')
  const active = market.mine.filter((l) => l.status === 'active')
  const history = market.mine.filter((l) => l.status !== 'active')

  const savePrice = async (l) => {
    const p = parsePrice(price)
    if (!p) return
    if (await act('update_listing_price', { p_listing: l.id, p_price: p }, `Price changed to ${euro(p)}`)) setEditing(null)
  }

  return (
    <>
      {!active.length && <p className="market__empty">You have nothing listed. Open a figure on your shelf and choose "Put on market".</p>}
      {active.map((l) => {
        const threads = market.selling.filter((t) => t.listing?.id === l.id)
        return (
          <article key={l.id} className="listing listing--wide">
            <div className="listing__row">
              <FigureCell figureId={l.figure_id} />
              <div className="listing__side">
                {editing === l.id ? (
                  <div className="listing__actions">
                    <PriceInput value={price} onChange={setPrice} autoFocus label="New price" />
                    <button className="btn btn--primary btn--sm" onClick={() => savePrice(l)} disabled={!parsePrice(price)}>
                      Save
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={() => setEditing(null)}>
                      Cancel
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
                        Change price
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => act('cancel_listing', { p_listing: l.id }, `${FIGURE_BY_ID[l.figure_id].name} is back on your shelf`)}
                      >
                        Take off market
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            {threads.length ? (
              threads.map((t) => <Thread key={t.key} thread={t} act={act} />)
            ) : (
              <p className="listing__none">No offers yet.</p>
            )}
          </article>
        )
      })}

      {history.length > 0 && (
        <>
          <h2 className="section-title">History</h2>
          <ul className="history">
            {history.map((l) => (
              <li key={l.id}>
                <span>{FIGURE_BY_ID[l.figure_id].name}</span>
                <span className={`history__status history__status--${l.status}`}>
                  {l.status === 'sold' ? `Sold for ${euro(l.sold_price)}` : 'Taken off market'}
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
  const open = market.buying.filter((t) => t.open)
  const closed = market.buying.filter((t) => !t.open).reverse()
  if (!market.buying.length) return <p className="market__empty">You haven't made any offers yet. Find a figure in Browse and make an offer.</p>
  return (
    <>
      {open.map((t) => (
        <article key={t.key} className="listing listing--wide">
          <div className="listing__row">
            <FigureCell figureId={t.listing.figure_id} />
            <div className="listing__side">
              <span className="listing__seller">by @{t.listing.seller?.username}</span>
              <span className="listing__price">Asking {euro(t.listing.price)}</span>
            </div>
          </div>
          <Thread thread={t} act={act} />
        </article>
      ))}
      {closed.length > 0 && (
        <>
          <h2 className="section-title">Past negotiations</h2>
          {closed.map((t) => (
            <article key={t.key} className="listing listing--wide listing--closed">
              <div className="listing__row">
                <FigureCell figureId={t.listing.figure_id} size={48} />
              </div>
              <Thread thread={t} act={act} />
            </article>
          ))}
        </>
      )}
    </>
  )
}

// ---------------------------------------------------------------- negotiation thread

function Thread({ thread, act }) {
  const [countering, setCountering] = useState(false)
  const [amount, setAmount] = useState('')
  const { latest, role, myTurn, open, listing } = thread
  const other = role === 'buyer' ? listing.seller?.username : thread.buyer
  const fig = FIGURE_BY_ID[listing.figure_id]
  const who = (o) => (o.proposed_by === role ? 'You' : `@${other}`)

  const sendCounter = async () => {
    const p = parsePrice(amount)
    if (!p) return
    if (await act('counter_offer', { p_offer: latest.id, p_amount: p }, `Counter-offer of ${euro(p)} sent`)) setCountering(false)
  }

  let outcome = null
  if (!open) {
    if (latest.status === 'accepted') outcome = `Deal! ${fig.name} sold for ${euro(latest.amount)}`
    else if (latest.status === 'rejected') outcome = `${who(latest) === 'You' ? `@${other} declined` : 'You declined'} ${euro(latest.amount)}`
    else if (latest.status === 'withdrawn') outcome = 'Offer withdrawn'
    else outcome = listing.status === 'sold' ? 'Sold to someone else' : 'Listing closed'
  }

  return (
    <div className={`thread ${myTurn ? 'thread--turn' : ''}`}>
      <div className="thread__title">{role === 'seller' ? `Negotiation with @${other}` : `Your negotiation with @${other}`}</div>
      <ol className="thread__offers">
        {thread.offers.map((o) => (
          <li key={o.id} className={o.proposed_by === role ? 'is-mine' : ''}>
            <span className="thread__who">{who(o)}</span>
            <span className="thread__amount">{euro(o.amount)}</span>
            {o.status !== 'pending' && <span className="thread__status">{STATUS_TEXT[o.status]}</span>}
          </li>
        ))}
      </ol>
      {outcome ? (
        <p className="thread__outcome">{outcome}</p>
      ) : myTurn ? (
        countering ? (
          <div className="listing__actions">
            <PriceInput value={amount} onChange={setAmount} autoFocus label="Your counter-offer" />
            <button className="btn btn--primary btn--sm" onClick={sendCounter} disabled={!parsePrice(amount)}>
              Send
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => setCountering(false)}>
              Cancel
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
                  role === 'seller' ? `Sold to @${other} for ${euro(latest.amount)}!` : `You bought ${fig.name} for ${euro(latest.amount)}!`,
                )
              }
            >
              Accept {euro(latest.amount)}
            </button>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setCountering(true)
                setAmount(formatPrice(latest.amount))
              }}
            >
              Counter
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => act('reject_offer', { p_offer: latest.id }, 'Offer declined')}>
              Decline
            </button>
          </div>
        )
      ) : (
        <div className="listing__actions">
          <span className="thread__waiting">Waiting for @{other}…</span>
          <button className="btn btn--ghost btn--sm" onClick={() => act('withdraw_offer', { p_offer: latest.id }, 'Offer withdrawn')}>
            Withdraw
          </button>
        </div>
      )}
    </div>
  )
}
