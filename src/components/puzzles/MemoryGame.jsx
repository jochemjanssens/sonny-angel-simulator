import { useEffect, useRef, useState } from 'react'
import Angel from '../Angel'
import { FIGURE_BY_ID } from '../../data/collections'
import { useT } from '../../i18n'

// Memory: turn over two cards; matching Sonny Angels stay face up.
export default function MemoryGame({ puzzle, onSolved }) {
  const { t } = useT()
  const { cols, cards } = puzzle
  const [open, setOpen] = useState([]) // up to two card ids being looked at
  const [matched, setMatched] = useState(() => new Set())
  const [moves, setMoves] = useState(0)
  const solvedSent = useRef(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const flip = (card) => {
    if (open.length === 2 || open.includes(card.id) || matched.has(card.figureId)) return
    const next = [...open, card.id]
    setOpen(next)
    if (next.length < 2) return
    setMoves((m) => m + 1)
    const [a, b] = next.map((id) => cards[id])
    if (a.figureId === b.figureId) {
      const done = new Set(matched).add(a.figureId)
      setMatched(done)
      setOpen([])
      if (done.size === cards.length / 2 && !solvedSent.current) {
        solvedSent.current = true
        setTimeout(onSolved, 600)
      }
    } else {
      timer.current = setTimeout(() => setOpen([]), 900)
    }
  }

  return (
    <div className="mem">
      <div className="mem__grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {cards.map((card) => {
          const faceUp = open.includes(card.id) || matched.has(card.figureId)
          return (
            <button
              key={card.id}
              className={`mem__card ${faceUp ? 'is-up' : ''} ${matched.has(card.figureId) ? 'is-matched' : ''}`}
              onClick={() => flip(card)}
              aria-label={faceUp ? FIGURE_BY_ID[card.figureId].name : t('Hidden card')}
            >
              <span className="mem__inner">
                <span className="mem__back">
                  <span>✦</span>
                </span>
                <span className="mem__front">
                  <Angel figure={FIGURE_BY_ID[card.figureId]} size={64} />
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <p className="puzzle__hint">
        {t(moves === 1 ? '{found}/{total} pairs found · {moves} try' : '{found}/{total} pairs found · {moves} tries', { found: matched.size, total: cards.length / 2, moves })}
      </p>
    </div>
  )
}
