import { useMemo, useRef, useState } from 'react'
import { lineCells, matchWord } from '../../puzzles/wordsearch.js'

const COLORS = ['#FFD3E0', '#CDE8F6', '#D9F2C4', '#FFE7A8', '#E5D6FF', '#FFD9C2', '#C9F0E8', '#F9D0F0']

// Find the words: drag across the letters (or tap the first and last letter).
export default function WordSearchGame({ puzzle, onSolved }) {
  const { n, grid, words } = puzzle
  const [found, setFound] = useState([])
  const [sel, setSel] = useState(null) // { anchor, current }
  const [pending, setPending] = useState(null)
  const dragging = useRef(false)
  const solvedSent = useRef(false)

  const foundColor = useMemo(() => {
    const map = new Map()
    found.forEach((w, i) => words.find((x) => x.word === w).cells.forEach(([r, c]) => map.set(`${r},${c}`, COLORS[i % COLORS.length])))
    return map
  }, [found, words])

  const selCells = useMemo(() => {
    if (!sel) return new Set()
    const cells = lineCells(sel.anchor, sel.current) || [sel.anchor]
    return new Set(cells.map((c) => c.join(',')))
  }, [sel])

  const cellAt = (x, y) => {
    const el = document.elementFromPoint(x, y)?.closest('[data-r]')
    return el ? [Number(el.dataset.r), Number(el.dataset.c)] : null
  }

  const tryWord = (a, b) => {
    const cells = lineCells(a, b)
    const w = cells && matchWord(words, cells)
    if (w && !found.includes(w.word)) {
      const next = [...found, w.word]
      setFound(next)
      if (next.length === words.length && !solvedSent.current) {
        solvedSent.current = true
        setTimeout(onSolved, 400)
      }
    }
  }

  const down = (e) => {
    const cell = cellAt(e.clientX, e.clientY)
    if (!cell) return
    dragging.current = true
    setSel({ anchor: cell, current: cell })
  }
  const move = (e) => {
    if (!dragging.current) return
    const cell = cellAt(e.clientX, e.clientY)
    if (cell) setSel((s) => (s ? { ...s, current: cell } : s))
  }
  const up = () => {
    if (!dragging.current || !sel) return
    dragging.current = false
    const { anchor, current } = sel
    if (anchor[0] === current[0] && anchor[1] === current[1]) {
      // a tap: first tap marks the start, second tap the end
      if (pending) {
        tryWord(pending, anchor)
        setPending(null)
      } else setPending(anchor)
    } else {
      tryWord(anchor, current)
      setPending(null)
    }
    setSel(null)
  }

  return (
    <div className="ws">
      <div
        className="ws__grid"
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, '--n': n }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      >
        {grid.map((row, r) =>
          row.map((letter, c) => {
            const key = `${r},${c}`
            const isPending = pending && pending[0] === r && pending[1] === c
            return (
              <span
                key={key}
                data-r={r}
                data-c={c}
                className={`ws__cell ${selCells.has(key) ? 'is-selected' : ''} ${isPending ? 'is-pending' : ''}`}
                style={foundColor.has(key) ? { background: foundColor.get(key) } : undefined}
              >
                {letter}
              </span>
            )
          }),
        )}
      </div>
      <ul className="ws__words">
        {words.map((w) => (
          <li key={w.word} className={found.includes(w.word) ? 'is-found' : ''}>
            {w.word}
          </li>
        ))}
      </ul>
      <p className="puzzle__hint">Drag across a word, or tap its first and last letter. {found.length}/{words.length} found.</p>
    </div>
  )
}
