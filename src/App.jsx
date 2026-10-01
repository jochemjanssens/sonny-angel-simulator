import { useCallback, useState } from 'react'
import Header from './components/Header'
import { SeriesDetail, SeriesGrid } from './components/CollectionsView'
import ShelfView from './components/ShelfView'
import BlindBoxOpener from './components/BlindBoxOpener'
import FigureModal from './components/FigureModal'
import { DAILY_ALLOWANCE, FIGURES, FIGURE_BY_ID, SERIES_BY_ID, drawFigure, euro } from './data/collections'
import { todayKey, useGame } from './hooks/useGame'

export default function App() {
  const [state, dispatch] = useGame()
  const [tab, setTab] = useState('collections')
  const [seriesId, setSeriesId] = useState(null)
  const [opening, setOpening] = useState(null)
  const [figureId, setFigureId] = useState(null)
  const [toast, setToast] = useState(null)

  const notify = useCallback((msg) => {
    const id = Date.now()
    setToast({ msg, id })
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 2800)
  }, [])

  const buy = (series) => {
    if (state.wallet < series.price) return notify('Not enough budget for this box.')
    const figure = drawFigure(series)
    const isNew = !state.inventory[figure.id]
    dispatch({ type: 'BUY', figure, price: series.price })
    setOpening({ seriesId: series.id, figureId: figure.id, isNew, key: Date.now() })
  }

  const claim = () => {
    dispatch({ type: 'CLAIM_DAILY' })
    notify(`+${euro(DAILY_ALLOWANCE)} daily allowance added!`)
  }

  const sell = (id, qty, includeLast = false) => {
    const fig = FIGURE_BY_ID[id]
    const count = state.inventory[id] || 0
    const n = Math.min(qty, includeLast ? count : count - 1)
    if (n <= 0) return
    dispatch({ type: 'SELL', figureId: id, qty, includeLast })
    notify(`Sold ${n}× ${fig.name} for ${euro(fig.value * n)}`)
    if (count - n <= 0) setFigureId(null)
  }

  const sellAll = () => {
    dispatch({ type: 'SELL_ALL_DUPES' })
    notify('All duplicates sold!')
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
        canClaim={state.lastClaim !== todayKey()}
        onClaim={claim}
        ownedUnique={ownedUnique}
        totalUnique={totalUnique}
      />

      <main className="main">
        {tab === 'collections' &&
          (series ? (
            <SeriesDetail
              series={series}
              inventory={state.inventory}
              seen={state.firstSeen}
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
            onSell={(id) => sell(id, 1)}
            onSellAll={sellAll}
            onGoShop={() => setTab('collections')}
          />
        )}
      </main>

      <footer className="footer">
        A fan-made simulator for fun · Not affiliated with Sonny Angel or Dreams Inc. · Values are approximate resale prices
        <button
          className="footer__reset"
          onClick={() => window.confirm('Reset your budget and shelf? This cannot be undone.') && dispatch({ type: 'RESET' })}
        >
          Reset game
        </button>
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
          onSell={(qty, includeLast) => sell(figureId, qty, includeLast)}
          onClose={() => setFigureId(null)}
        />
      )}

      {toast && (
        <div className="toast" key={toast.id} role="status">
          {toast.msg}
        </div>
      )}
    </div>
  )
}
