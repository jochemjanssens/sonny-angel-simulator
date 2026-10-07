import { useRef, useState } from 'react'
import Angel from '../Angel'
import { FIGURE_BY_ID } from '../../data/collections'

// Spot the differences: tap a spot on either shelf where the two don't match.
export default function DifferencesGame({ puzzle, onSolved }) {
  const { cols, left, right, spots } = puzzle
  const [found, setFound] = useState(() => new Set())
  const [miss, setMiss] = useState(null)
  const solvedSent = useRef(false)

  const tap = (i) => {
    if (found.has(i)) return
    if (!spots.includes(i)) {
      setMiss(i)
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

  const shelf = (items, side) => (
    <div className="diff__shelf" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }} aria-label={`${side} shelf`}>
      {items.map((id, i) => (
        <button
          key={i}
          className={`diff__spot ${found.has(i) ? 'is-found' : ''} ${miss === i ? 'is-miss' : ''}`}
          onClick={() => tap(i)}
          aria-label={id ? FIGURE_BY_ID[id].name : 'Empty spot'}
        >
          {id ? <Angel figure={FIGURE_BY_ID[id]} size={52} /> : <span className="diff__empty" />}
        </button>
      ))}
    </div>
  )

  return (
    <div className="diff">
      <div className="diff__pair">
        {shelf(left, 'Left')}
        {shelf(right, 'Right')}
      </div>
      <p className="puzzle__hint">
        Tap where the two shelves are different. {found.size}/{spots.length} found.
      </p>
    </div>
  )
}
