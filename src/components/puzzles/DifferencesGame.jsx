import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Angel from '../Angel'
import { figureFor } from '../../puzzles/differences.js'
import { useT } from '../../i18n'

// Shelf measurements in px; a figure tile is 3:4.
const GAP = 4
const PAD = 6
const PAIR_GAP = 10
const MIN_CELL = 34

// Picks side-by-side or stacked shelves and the tile size so both shelves fit
// in the visible area (below the sticky header) with the biggest figures.
function useFit(ref, cols, rows) {
  const [fit, setFit] = useState(null)
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current
      if (!el) return
      const W = el.clientWidth
      const header = document.querySelector('.header')?.offsetHeight || 0
      // room for the hearts above and the hint below the shelves
      const H = window.innerHeight - header - 110
      const fixedW = (cols - 1) * GAP + 2 * PAD
      const fixedH = (rows - 1) * GAP + 2 * PAD
      const cellFor = (w, h) => Math.min((w - fixedW) / cols, ((h - fixedH) / rows) * 0.75)
      const side = cellFor((W - PAIR_GAP) / 2, H)
      const stack = cellFor(W, (H - PAIR_GAP) / 2)
      const stacked = stack > side
      // never wider than the container; if the screen is very short, allow scrolling
      const maxCell = stacked ? (W - fixedW) / cols : (W - PAIR_GAP - 2 * fixedW) / (2 * cols)
      const cell = Math.floor(Math.min(maxCell, Math.max(MIN_CELL, stacked ? stack : side)))
      setFit((f) => (f && f.stacked === stacked && f.cell === cell ? f : { stacked, cell, width: cell * cols + fixedW }))
    }
    measure()
    // measure again once the page has settled, and whenever the space changes
    const raf = requestAnimationFrame(measure)
    const ro = new ResizeObserver(measure)
    ro.observe(ref.current)
    window.addEventListener('resize', measure)
    window.visualViewport?.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', measure)
      window.visualViewport?.removeEventListener('resize', measure)
    }
  }, [ref, cols, rows])
  return fit
}

// Spot the differences: tap a figure on either shelf that isn't the same on the other.
export default function DifferencesGame({ puzzle, onSolved, onRetry }) {
  const { t } = useT()
  const { cols, rows, left, right, spots, maxMisses } = puzzle
  const [found, setFound] = useState(() => new Set())
  const [miss, setMiss] = useState(null)
  const [misses, setMisses] = useState(0)
  const solvedSent = useRef(false)
  const rootRef = useRef(null)
  const fit = useFit(rootRef, cols, rows)

  const lost = misses >= maxMisses

  // bring the whole game into view, just below the sticky header
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const header = document.querySelector('.header')?.offsetHeight || 0
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - header - 8, behavior: 'smooth' })
  }, [])

  const tap = (i) => {
    if (found.has(i) || lost || solvedSent.current) return
    if (!spots.includes(i)) {
      setMiss(i)
      setMisses((m) => m + 1)
      setTimeout(() => setMiss((m) => (m === i ? null : m)), 500)
      return
    }
    const next = new Set(found).add(i)
    setFound(next)
    if (next.size === spots.length && !solvedSent.current) {
      solvedSent.current = true
      setTimeout(onSolved, 600)
    }
  }

  const shelf = (items, label) => (
    <div
      className="diff__shelf"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: GAP,
        padding: PAD,
        width: fit ? fit.width : undefined,
      }}
      aria-label={label}
    >
      {items.map((item, i) => {
        // after losing, show the differences you didn't find
        const missed = lost && spots.includes(i) && !found.has(i)
        return (
          <button
            key={i}
            className={`diff__spot ${found.has(i) ? 'is-found' : ''} ${missed ? 'is-missed' : ''} ${miss === i ? 'is-miss' : ''}`}
            onClick={() => tap(i)}
            aria-label={missed ? `${figureFor(item).name} · ${t('Missed difference')}` : figureFor(item).name}
          >
            <Angel figure={figureFor(item)} size={fit ? Math.round(fit.cell * 0.82) : 52} />
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="diff" ref={rootRef}>
      <div className="diff__lives" aria-label={t('{n} tries left', { n: maxMisses - misses })}>
        {Array.from({ length: maxMisses }, (_, k) => (
          <span key={k} className={k < maxMisses - misses ? '' : 'is-lost'}>
            ♥
          </span>
        ))}
      </div>
      <div className={`diff__pair ${fit?.stacked ? 'is-stacked' : ''} ${lost ? 'is-lost' : ''}`} style={{ gap: PAIR_GAP }}>
        {shelf(left, t('Left shelf'))}
        {shelf(right, t('Right shelf'))}
      </div>
      {lost ? (
        <div className="puzzle__done is-error diff__lost">
          <span className="puzzle__done-icon">💔</span>
          <h2>{t('Out of tries')}</h2>
          <p>{t('You tapped wrong {n} times. Look carefully before you tap — try a new puzzle!', { n: maxMisses })}</p>
          <p className="diff__reveal">{t('The differences you missed are marked in orange.')}</p>
          <button className="btn btn--primary" onClick={onRetry}>
            {t('New puzzle')}
          </button>
        </div>
      ) : (
        <p className="puzzle__hint">
          {t('Look closely: colours, accessories and patterns can differ. {found}/{total} found.', { found: found.size, total: spots.length })}
        </p>
      )}
    </div>
  )
}
