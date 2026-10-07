import { useRef, useState } from 'react'
import Angel from '../Angel'
import { figureFor } from '../../puzzles/differences.js'
import { useT } from '../../i18n'

// Spot the differences: tap a figure on either shelf that isn't the same on the other.
export default function DifferencesGame({ puzzle, onSolved }) {
  const { t } = useT()
  const { cols, left, right, spots } = puzzle
  const [found, setFound] = useState(() => new Set())
  const [miss, setMiss] = useState(null)
  const [misses, setMisses] = useState(0)
  const solvedSent = useRef(false)

  const tap = (i) => {
    if (found.has(i)) return
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
    <div className="diff__shelf" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }} aria-label={label}>
      {items.map((item, i) => (
        <button
          key={i}
          className={`diff__spot ${found.has(i) ? 'is-found' : ''} ${miss === i ? 'is-miss' : ''}`}
          onClick={() => tap(i)}
          aria-label={figureFor(item).name}
        >
          <Angel figure={figureFor(item)} size={52} />
        </button>
      ))}
    </div>
  )

  return (
    <div className="diff">
      <div className="diff__pair">
        {shelf(left, t('Left shelf'))}
        {shelf(right, t('Right shelf'))}
      </div>
      <p className="puzzle__hint">
        {t('Look closely: colours, accessories and patterns can differ. {found}/{total} found · {misses} misses.', {
          found: found.size,
          total: spots.length,
          misses,
        })}
      </p>
    </div>
  )
}
