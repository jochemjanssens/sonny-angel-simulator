import { useRef, useState } from 'react'
import { binaryErrors, binarySolved } from '../../puzzles/binary.js'

// Tap a cell to cycle empty → 0 → 1. Grey digits are given.
export default function BinaryGame({ puzzle, onSolved }) {
  const { n } = puzzle
  const [grid, setGrid] = useState(() => puzzle.puzzle.map((row) => [...row]))
  const solvedSent = useRef(false)
  const errors = binaryErrors(grid)
  const filled = grid.flat().filter((v) => v !== null).length

  const tap = (r, c) => {
    if (puzzle.puzzle[r][c] !== null || solvedSent.current) return
    const next = grid.map((row) => [...row])
    next[r][c] = next[r][c] === null ? 0 : next[r][c] === 0 ? 1 : null
    setGrid(next)
    if (binarySolved(next)) {
      solvedSent.current = true
      setTimeout(onSolved, 400)
    }
  }

  return (
    <div className="bin">
      <div className="bin__grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, '--n': n }}>
        {grid.map((row, r) =>
          row.map((v, c) => {
            const given = puzzle.puzzle[r][c] !== null
            return (
              <button
                key={`${r},${c}`}
                className={`bin__cell ${given ? 'is-given' : ''} ${errors.has(`${r},${c}`) ? 'is-error' : ''} ${v !== null ? `is-${v}` : ''}`}
                onClick={() => tap(r, c)}
                aria-label={`Row ${r + 1}, column ${c + 1}: ${v ?? 'empty'}`}
              >
                {v ?? ''}
              </button>
            )
          }),
        )}
      </div>
      <ul className="puzzle__rules">
        <li>No three equal digits next to each other</li>
        <li>Every row and column has as many 0s as 1s</li>
        <li>No two rows or columns are the same</li>
      </ul>
      <div className="puzzle__bar">
        <span className="puzzle__hint">
          {filled}/{n * n} filled{filled === n * n && !binarySolved(grid) ? ' — something is not right yet' : ''}
        </span>
        <button className="btn btn--ghost btn--sm" onClick={() => setGrid(puzzle.puzzle.map((row) => [...row]))}>
          Clear
        </button>
      </div>
    </div>
  )
}
