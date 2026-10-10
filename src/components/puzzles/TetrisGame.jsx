import { useCallback, useEffect, useRef, useState } from 'react'
import { COLS, ROWS, cellsOf, fits, lock, makeBag, rotate, startBoard } from '../../puzzles/tetris.js'
import { useT } from '../../i18n'

// Tetris: clear the target number of lines. Arrow keys on a computer,
// big buttons on a phone. Game over just starts a new round.
export default function TetrisGame({ puzzle, onSolved }) {
  const { t } = useT()
  const { target, seed, level = 0 } = puzzle
  const game = useRef(null)
  const [, redraw] = useState(0)
  const solvedSent = useRef(false)
  const round = useRef(0)

  const newGame = useCallback(() => {
    const next = makeBag(`${seed}:${round.current++}`)
    game.current = { board: startBoard(level, seed), piece: next(), next, lines: 0, score: 0, over: false, won: false }
    redraw((x) => x + 1)
  }, [seed, level])

  useEffect(() => {
    newGame()
  }, [newGame])

  const spawn = (g) => {
    g.piece = g.next()
    if (!fits(g.board, g.piece)) g.over = true
  }

  const settle = (g) => {
    const { board, cleared } = lock(g.board, g.piece)
    g.board = board
    g.lines += cleared
    g.score += [0, 100, 300, 500, 800][cleared]
    if (g.lines >= target) {
      g.won = true
      if (!solvedSent.current) {
        solvedSent.current = true
        setTimeout(onSolved, 700)
      }
      return
    }
    spawn(g)
  }

  const act = useCallback(
    (action) => {
      const g = game.current
      if (!g || g.over || g.won) return
      const p = g.piece
      if (action === 'left' && fits(g.board, { ...p, x: p.x - 1 })) g.piece = { ...p, x: p.x - 1 }
      else if (action === 'right' && fits(g.board, { ...p, x: p.x + 1 })) g.piece = { ...p, x: p.x + 1 }
      else if (action === 'rotate') g.piece = rotate(g.board, p)
      else if (action === 'down') {
        if (fits(g.board, { ...p, y: p.y + 1 })) g.piece = { ...p, y: p.y + 1 }
        else settle(g)
      } else if (action === 'drop') {
        let q = p
        while (fits(g.board, { ...q, y: q.y + 1 })) q = { ...q, y: q.y + 1 }
        g.piece = q
        settle(g)
      }
      redraw((x) => x + 1)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [target],
  )

  // gravity: a little faster with every line cleared
  const lines = game.current?.lines ?? 0
  useEffect(() => {
    // harder levels start faster
    const speed = Math.max(110, 700 - lines * 35 - level * 60)
    const t = setInterval(() => act('down'), speed)
    return () => clearInterval(t)
  }, [act, lines, level])

  useEffect(() => {
    const keys = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'rotate', ArrowDown: 'down', ' ': 'drop' }
    const onKey = (e) => {
      if (!keys[e.key]) return
      e.preventDefault()
      act(keys[e.key])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [act])

  const g = game.current
  if (!g) return null
  const active = new Map(cellsOf(g.piece).map(([x, y]) => [`${x},${y}`, g.piece.color]))
  let ghost = g.piece
  while (fits(g.board, { ...ghost, y: ghost.y + 1 })) ghost = { ...ghost, y: ghost.y + 1 }
  const ghostCells = new Set(cellsOf(ghost).map(([x, y]) => `${x},${y}`))

  return (
    <div className="tet">
      <div className="tet__stats">
        <span>
          {t('Lines')} <strong>{Math.min(g.lines, target)}</strong>/{target}
        </span>
        <span>
          {t('Score')} <strong>{g.score}</strong>
        </span>
      </div>
      <div className="tet__board" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
        {Array.from({ length: ROWS }, (_, y) =>
          Array.from({ length: COLS }, (_, x) => {
            const key = `${x},${y}`
            const color = active.get(key) || g.board[y][x]
            return (
              <span
                key={key}
                className={`tet__cell ${color ? 'is-filled' : ''} ${!color && ghostCells.has(key) ? 'is-ghost' : ''}`}
                style={color ? { background: color } : undefined}
              />
            )
          }),
        )}
        {(g.over || g.won) && (
          <div className="tet__overlay">
            <strong>{g.won ? t('You did it! 🎉') : t('Game over')}</strong>
            {!g.won && (
              <button className="btn btn--primary btn--sm" onClick={newGame}>
                {t('Play again')}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="tet__controls">
        <button className="tet__btn" onClick={() => act('left')} aria-label={t('Move left')}>
          ◀
        </button>
        <button className="tet__btn" onClick={() => act('rotate')} aria-label={t('Rotate')}>
          ⟳
        </button>
        <button className="tet__btn" onClick={() => act('right')} aria-label={t('Move right')}>
          ▶
        </button>
        <button className="tet__btn" onClick={() => act('down')} aria-label={t('Move down')}>
          ▼
        </button>
        <button className="tet__btn tet__btn--drop" onClick={() => act('drop')} aria-label={t('Drop')}>
          ⤓
        </button>
      </div>
      <p className="puzzle__hint">{t('Arrow keys to move, ↑ to rotate, space to drop — or use the buttons.')}</p>
    </div>
  )
}
