import { useCallback, useEffect, useRef, useState } from 'react'
import Header from './components/Header'
import { SeriesDetail, SeriesGrid } from './components/CollectionsView'
import ShelfView from './components/ShelfView'
import MarketView from './components/MarketView'
import PuzzlesView from './components/puzzles/PuzzlesView'
import BlindBoxOpener from './components/BlindBoxOpener'
import FigureModal from './components/FigureModal'
import LuckyWheel from './components/LuckyWheel'
import { LoginScreen, SetupNeeded, UsernameScreen } from './components/AuthScreens'
import { DAILY_ALLOWANCE, FIGURES, FIGURE_BY_ID, SERIES_BY_ID, euro } from './data/collections'
import { rpc, supabase } from './lib/supabase'
import { readLocalSave } from './lib/localSave'
import { useOnlineGame, utcTodayKey } from './hooks/useOnlineGame'
import { useMarket } from './hooks/useMarket'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabase) return <SetupNeeded />
  if (session === undefined) return <div className="boot">Loading…</div>
  if (!session) return <LoginScreen />
  return <Game key={session.user.id} userId={session.user.id} />
}

function Game({ userId }) {
  const game = useOnlineGame(userId)
  const market = useMarket(userId)
  const [tab, setTab] = useState('collections')
  const [seriesId, setSeriesId] = useState(null)
  const [opening, setOpening] = useState(null)
  const [figureId, setFigureId] = useState(null)
  const [toast, setToast] = useState(null)
  const [localSave] = useState(readLocalSave)
  const [gift, setGift] = useState(null)
  const [wheelOpen, setWheelOpen] = useState(false)
  const giftAsked = useRef(false)

  const notify = useCallback((msg) => {
    const id = Date.now()
    setToast({ msg, id })
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3200)
  }, [])

  // Runs a database action, then refreshes everything; returns true on success.
  const act = useCallback(
    async (fn, args, successMsg) => {
      try {
        await rpc(fn, args)
        if (successMsg) notify(successMsg)
        await Promise.all([game.refresh(), market.refresh()])
        return true
      } catch (err) {
        notify(err.message)
        return false
      }
    },
    [game, market, notify],
  )

  // One-time welcome gift: claimed on the first login once a username is set.
  const needsGift = game.state?.username && !game.state.welcomeBonus
  useEffect(() => {
    if (!needsGift || giftAsked.current) return
    giftAsked.current = true
    rpc('claim_welcome_bonus')
      .then((amount) => {
        if (amount) setGift(Number(amount))
        game.refresh()
      })
      .catch(() => {})
  }, [needsGift, game])

  const state = game.state
  if (!state) return <div className="boot">{game.error ? `Couldn't load your game: ${game.error}` : 'Loading your shelf…'}</div>
  if (!state.username) {
    return <UsernameScreen localSave={localSave} canImport={!state.imported && state.stats.opened === 0} onDone={game.refresh} />
  }

  const buy = async (series) => {
    if (state.wallet < series.price) return notify('Not enough budget for this box.')
    try {
      const data = await rpc('open_box', { p_series: series.id })
      const row = Array.isArray(data) ? data[0] : data
      setOpening({ seriesId: series.id, figureId: row.fig_id, isNew: row.is_new, key: Date.now() })
      game.refresh()
    } catch (err) {
      notify(err.message)
    }
  }

  const claim = () => act('claim_daily', {}, `+${euro(DAILY_ALLOWANCE)} daily allowance added!`)

  const list = async (id, price) => {
    if (!price) return
    const ok = await act('create_listing', { p_fig: id, p_price: price }, `${FIGURE_BY_ID[id].name} is on the market for ${euro(price)}`)
    if (ok && (state.inventory[id] || 0) <= 1) setFigureId(null)
  }

  const sellToBank = async (id) => {
    const fig = FIGURE_BY_ID[id]
    const ok = await act('sell_to_bank', { p_fig: id }, `Sold ${fig.name} to the bank`)
    if (ok && (state.inventory[id] || 0) <= 1) setFigureId(null)
  }

  const ownedUnique = FIGURES.filter((f) => !f.secret && state.inventory[f.id]).length
  const totalUnique = FIGURES.filter((f) => !f.secret).length
  const series = seriesId && SERIES_BY_ID[seriesId]

  return (
    <div className="app">
      <Header
        tab={tab}
        setTab={(t) => {
          setTab(t)
          setSeriesId(null)
        }}
        wallet={state.wallet}
        canClaim={state.lastClaim !== utcTodayKey()}
        onClaim={claim}
        canSpin={state.lastSpin !== utcTodayKey()}
        onWheel={() => setWheelOpen(true)}
        ownedUnique={ownedUnique}
        totalUnique={totalUnique}
        marketBadge={market.actionCount}
        username={state.username}
        onLogout={() => supabase.auth.signOut()}
      />

      <main className="main">
        {tab === 'collections' &&
          (series ? (
            <SeriesDetail
              series={series}
              inventory={state.inventory}
              seen={state.firstSeen}
              listed={market.listedFigureIds}
              wallet={state.wallet}
              onBack={() => setSeriesId(null)}
              onBuy={() => buy(series)}
              onFigure={setFigureId}
            />
          ) : (
            <SeriesGrid inventory={state.inventory} onSelect={setSeriesId} />
          ))}
        {tab === 'shelf' && (
          <ShelfView
            inventory={state.inventory}
            stats={state.stats}
            onFigure={setFigureId}
            onGoShop={() => setTab('collections')}
            onGoMarket={() => setTab('market')}
          />
        )}
        {tab === 'market' && <MarketView market={market} wallet={state.wallet} inventory={state.inventory} act={act} />}
        {tab === 'puzzles' && <PuzzlesView userId={userId} notify={notify} onEarned={game.refresh} />}
      </main>

      <footer className="footer">
        A fan-made simulator for fun · Not affiliated with Sonny Angel or Dreams Inc. · Values are approximate resale prices
      </footer>

      {opening && (
        <BlindBoxOpener
          key={opening.key}
          series={SERIES_BY_ID[opening.seriesId]}
          figure={FIGURE_BY_ID[opening.figureId]}
          isNew={opening.isNew}
          canAffordAnother={state.wallet >= SERIES_BY_ID[opening.seriesId].price}
          onAgain={() => buy(SERIES_BY_ID[opening.seriesId])}
          onClose={() => setOpening(null)}
        />
      )}

      {figureId && (
        <FigureModal
          figure={FIGURE_BY_ID[figureId]}
          count={state.inventory[figureId] || 0}
          onList={(price) => list(figureId, price)}
          onBank={() => sellToBank(figureId)}
          onClose={() => setFigureId(null)}
        />
      )}

      {wheelOpen && (
        <LuckyWheel
          canSpin={state.lastSpin !== utcTodayKey()}
          onSpin={async () => {
            try {
              return await rpc('spin_wheel')
            } catch (err) {
              notify(err.message)
              return null
            }
          }}
          onDone={game.refresh}
          onClose={() => setWheelOpen(false)}
        />
      )}

      {gift && (
        <div className="modal" role="dialog" aria-modal="true" onClick={() => setGift(null)}>
          <div className="modal__card gift" onClick={(e) => e.stopPropagation()}>
            <span className="gift__icon" aria-hidden>
              🎁
            </span>
            <h2>Welcome gift!</h2>
            <p>
              <strong>{euro(gift)}</strong> has been added to your budget. Have fun unboxing and trading!
            </p>
            <button className="btn btn--primary" onClick={() => setGift(null)}>
              Thanks!
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" key={toast.id} role="status">
          {toast.msg}
        </div>
      )}
    </div>
  )
}
