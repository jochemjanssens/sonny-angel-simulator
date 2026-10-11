import { useMemo, useState } from 'react'
import Angel from './Angel'
import PriceInput, { formatPrice, parsePrice } from './PriceInput'
import { FIGURE_BY_ID, SERIES, SERIES_BY_ID, euro } from '../data/collections'
import { useT } from '../i18n'
import { FigurePicker, OfferModeTabs, OfferValue, ownedBy, useShelf } from './Swap'

const STATUS_TEXT = {
  countered: 'countered',
  accepted: 'accepted',
  rejected: 'rejected',
  withdrawn: 'withdrawn',
  closed: 'closed',
}

export default function MarketView({ market, wallet, inventory, act, onProfile }) {
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
        <Browse market={market} wallet={wallet} inventory={inventory} act={act} onProfile={onProfile} onGoOffers={() => setView('buying')} />
      ) : view === 'selling' ? (
        <Selling market={market} act={act} inventory={inventory} onProfile={onProfile} />
      ) : (
        <Buying market={market} act={act} inventory={inventory} onProfile={onProfile} />
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

function Browse({ market, wallet, inventory, act, onGoOffers, onProfile }) {
  const { t } = useT()
  const [seriesFilter, setSeriesFilter] = useState('all')
  const [missingOnly, setMissingOnly] = useState(false)
  const [offerFor, setOfferFor] = useState(null)
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState('money')
  const [swapFig, setSwapFig] = useState(null)
  const offerListing = market.active.find((l) => l.id === offerFor)
  const sellerShelf = useShelf(offerListing?.seller_id)
  const myOwned = ownedBy(inventory, market.userId, market.active)
  const sellerOwned = ownedBy(sellerShelf, offerListing?.seller_id, market.active)
  // you can only swap for a figure you don't have yet
  const swapBlockedFor = (l) =>
    myOwned[l.figure_id] > 0 ? t('You already have {name}, so you can only offer money.', { name: FIGURE_BY_ID[l.figure_id].name }) : null

  const myThreadByListing = useMemo(() => new Map(market.buying.filter((t) => t.open).map((t) => [t.listing.id, t])), [market.buying])
  const listings = market.active.filter(
    (l) =>
      (seriesFilter === 'all' || FIGURE_BY_ID[l.figure_id].seriesId === seriesFilter) &&
      // "missing" = not on your shelf right now (figures you sold count as missing)
      (!missingOnly || !(inventory[l.figure_id] > 0)),
  )

  const sendOffer = async (l) => {
    let done
    if (mode === 'swap') {
      if (!swapFig) return
      done = await act('make_offer', { p_listing: l.id, p_figure: swapFig }, t('Swap offer sent to @{user}', { user: l.seller?.username }))
    } else {
      const p = parsePrice(amount)
      if (!p) return
      done = await act('make_offer', { p_listing: l.id, p_amount: p }, t('Offer of {amount} sent to @{user}', { amount: euro(p), user: l.seller?.username }))
    }
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
        <span className="market__count">{t('{n} for sale', { n: listings.length })}</span>
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
                  <span className="listing__seller">
                    {own ? (
                      t('Your listing')
                    ) : (
                      <button className="user-link" onClick={() => onProfile(l.seller_id)}>
                        {t('by @{user}', { user: l.seller?.username })}
                      </button>
                    )}
                  </span>
                  <span className="listing__price">{euro(l.price)}</span>
                </div>
                {own ? null : thread ? (
                  <button className="listing__thread" onClick={onGoOffers}>
                    {thread.latest.offered_figure
                      ? thread.myTurn
                        ? t('@{user} countered with a swap — respond', { user: l.seller?.username })
                        : t('Your swap offer is waiting')
                      : thread.myTurn
                        ? t('@{user} countered: {amount} — respond', { user: l.seller?.username, amount: euro(thread.latest.amount) })
                        : t('Your offer {amount} is waiting', { amount: euro(thread.latest.amount) })}
                  </button>
                ) : offerFor === l.id ? (
                  <div className="offer-form">
                    <OfferModeTabs mode={mode} onChange={setMode} swapBlocked={swapBlockedFor(l)} />
                    {mode === 'swap' && (
                      <FigurePicker
                        shelf={inventory}
                        receiver={{ name: l.seller?.username, shelf: sellerOwned }}
                        value={swapFig}
                        onChange={setSwapFig}
                      />
                    )}
                    <div className="listing__actions">
                      {mode === 'money' && <PriceInput value={amount} onChange={setAmount} autoFocus label={t('Your offer')} />}
                      <button
                        className="btn btn--primary btn--sm"
                        onClick={() => sendOffer(l)}
                        disabled={mode === 'swap' ? !swapFig : !parsePrice(amount)}
                      >
                        {mode === 'swap' ? t('Offer swap') : t('Send offer')}
                      </button>
                      <button className="btn btn--ghost btn--sm" onClick={() => setOfferFor(null)}>
                        {t('Cancel')}
                      </button>
                    </div>
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
                        setMode('money')
                        setSwapFig(null)
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

function Selling({ market, act, inventory, onProfile }) {
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
              threads.map((th) => <Thread key={th.key} thread={th} act={act} inventory={inventory} market={market} onProfile={onProfile} />)
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
                  {l.status === 'sold' ? (l.sold_figure ? t('Swapped for {name}', { name: FIGURE_BY_ID[l.sold_figure].name }) : t('Sold for {price}', { price: euro(l.sold_price) })) : t('Taken off market')}
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

function Buying({ market, act, inventory, onProfile }) {
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
              <button className="listing__seller user-link" onClick={() => onProfile(th.listing.seller_id)}>{t('by @{user}', { user: th.listing.seller?.username })}</button>
              <span className="listing__price">{t('Asking {price}', { price: euro(th.listing.price) })}</span>
            </div>
          </div>
          <Thread thread={th} act={act} inventory={inventory} market={market} onProfile={onProfile} />
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
              <Thread thread={th} act={act} inventory={inventory} market={market} onProfile={onProfile} />
            </article>
          ))}
        </>
      )}
    </>
  )
}

// ---------------------------------------------------------------- negotiation thread

function Thread({ thread, act, inventory, market, onProfile }) {
  const { t } = useT()
  const [countering, setCountering] = useState(false)
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState('money')
  const [swapFig, setSwapFig] = useState(null)
  const { latest, role, myTurn, open, listing } = thread
  const other = role === 'buyer' ? listing.seller?.username : thread.buyer
  const otherId = role === 'buyer' ? listing.seller_id : thread.buyerId
  const fig = FIGURE_BY_ID[listing.figure_id]
  const who = (o) => (o.proposed_by === role ? t('You') : `@${other}`)
  // swapped figures always go to the seller: show whether they already have them
  const sellerShelf = useShelf(role === 'buyer' && open ? listing.seller_id : null)
  // a swap always uses a figure from the buyer's shelf
  const buyerShelf = useShelf(role === 'seller' && open ? thread.buyerId : null)
  const pickFrom = role === 'buyer' ? inventory : buyerShelf
  // swaps only between figures both players don't have yet (shelf + own listings)
  const sellerOwned = role === 'seller' ? ownedBy(inventory, market.userId, market.active) : ownedBy(sellerShelf, listing.seller_id, market.active)
  const buyerOwned = role === 'buyer' ? ownedBy(inventory, market.userId, market.active) : ownedBy(buyerShelf, thread.buyerId, market.active)
  const receiver = role === 'seller' ? { isMe: true, shelf: sellerOwned, from: other } : { name: other, shelf: sellerOwned }
  const swapBlocked = !(buyerOwned?.[listing.figure_id] > 0)
    ? null
    : role === 'buyer'
      ? t('You already have {name}, so you can only offer money.', { name: fig.name })
      : t('@{user} already has {name}, so only money offers are possible.', { user: other, name: fig.name })
  const acceptBlocked = latest.offered_figure && (swapBlocked || sellerOwned?.[latest.offered_figure] > 0)
  const offerText = (o) => (o.offered_figure ? FIGURE_BY_ID[o.offered_figure].name : euro(o.amount))

  const sendCounter = async () => {
    let ok
    if (mode === 'swap') {
      if (!swapFig) return
      ok = await act('counter_offer', { p_offer: latest.id, p_figure: swapFig }, t('Swap counter-offer sent'))
    } else {
      const p = parsePrice(amount)
      if (!p) return
      ok = await act('counter_offer', { p_offer: latest.id, p_amount: p }, t('Counter-offer of {amount} sent', { amount: euro(p) }))
    }
    if (ok) setCountering(false)
  }

  let outcome = null
  if (!open) {
    if (latest.status === 'accepted')
      outcome = latest.offered_figure
        ? t('Deal! {name} swapped for {other}', { name: fig.name, other: FIGURE_BY_ID[latest.offered_figure].name })
        : t('Deal! {name} sold for {amount}', { name: fig.name, amount: euro(latest.amount) })
    else if (latest.status === 'rejected')
      outcome = latest.proposed_by === role ? t('@{user} declined {amount}', { user: other, amount: offerText(latest) }) : t('You declined {amount}', { amount: offerText(latest) })
    else if (latest.status === 'withdrawn') outcome = t('Offer withdrawn')
    else outcome = listing.status === 'sold' ? t('Sold to someone else') : t('Listing closed')
  }

  const acceptMsg = latest.offered_figure
    ? t('Swapped! You got {name}', { name: role === 'seller' ? FIGURE_BY_ID[latest.offered_figure].name : fig.name })
    : role === 'seller'
      ? t('Sold to @{user} for {amount}!', { user: other, amount: euro(latest.amount) })
      : t('You bought {name} for {price}!', { name: fig.name, price: euro(latest.amount) })

  return (
    <div className={`thread ${myTurn ? 'thread--turn' : ''}`}>
      <div className="thread__title">
        {role === 'seller' ? t('Negotiation with') : t('Your negotiation with')}{' '}
        <button className="user-link" onClick={() => onProfile(otherId)}>
          @{other}
        </button>
      </div>
      <ol className="thread__offers">
        {thread.offers.map((o) => (
          <li key={o.id} className={o.proposed_by === role ? 'is-mine' : ''}>
            <span className="thread__who">{who(o)}</span>
            <OfferValue offer={o} receiver={receiver} />
            {o.status !== 'pending' && <span className="thread__status">{t(STATUS_TEXT[o.status])}</span>}
          </li>
        ))}
      </ol>
      {outcome ? (
        <p className="thread__outcome">{outcome}</p>
      ) : myTurn ? (
        countering ? (
          <div className="offer-form">
            <OfferModeTabs mode={mode} onChange={setMode} swapBlocked={swapBlocked} />
            {mode === 'swap' && (
              <>
                <p className="offer-form__note">
                  {role === 'seller' ? t('Pick a figure from @{user}’s shelf that you would like instead:', { user: other }) : t('Pick a figure from your shelf to offer:')}
                </p>
                <FigurePicker shelf={pickFrom} receiver={receiver} value={swapFig} onChange={setSwapFig} />
              </>
            )}
            <div className="listing__actions">
              {mode === 'money' && <PriceInput value={amount} onChange={setAmount} autoFocus label={t('Your counter-offer')} />}
              <button className="btn btn--primary btn--sm" onClick={sendCounter} disabled={mode === 'swap' ? !swapFig : !parsePrice(amount)}>
                {t('Send')}
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => setCountering(false)}>
                {t('Cancel')}
              </button>
            </div>
          </div>
        ) : (
          <>
            {acceptBlocked && (
              <p className="offer-form__note">{t('This swap is no longer possible: one of you already has the figure. Make a counter-offer instead.')}</p>
            )}
            <div className="listing__actions">
              <button className="btn btn--primary btn--sm" disabled={!!acceptBlocked} onClick={() => act('accept_offer', { p_offer: latest.id }, acceptMsg)}>
                {latest.offered_figure ? t('Accept swap') : t('Accept {amount}', { amount: euro(latest.amount) })}
              </button>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setCountering(true)
                  setMode(latest.offered_figure && !swapBlocked ? 'swap' : 'money')
                  setSwapFig(null)
                  setAmount(latest.amount ? formatPrice(latest.amount) : formatPrice(listing.price))
                }}
              >
                {t('Counter')}
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => act('reject_offer', { p_offer: latest.id }, t('Offer declined'))}>
                {t('Decline')}
              </button>
            </div>
          </>
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
