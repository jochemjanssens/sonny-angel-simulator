import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { COLS, ROWS, cellsOf, fits, lock, makeBag, rotate, startBoard } from '../../puzzles/tetris.js'
import { useT } from '../../i18n'

// Tetris: clear the target number of lines. Arrow keys or WASD on a computer,
// big buttons or swipes on a phone. Game over just starts a new round.
const LOCK_MS = 450 // how long a landed piece can still slide
const LOCK_MOVES = 12 // how many moves on the ground can extend that time
const HOLD_MS = 170 // holding a move: the wait before it repeats
const REPEAT_MS = 55 // and the time between repeats
const REPEATS = new Set(['left', 'right', 'down'])

// Width that lets the board, the stats and the buttons all fit on screen below
// the sticky header (phones), at most 360px.
function useFitWidth(ref, ready) {
  const [width, setWidth] = useState(null)
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current
      if (!el) return
      const avail = el.parentElement.clientWidth
      const header = document.querySelector('.header')?.offsetHeight || 0
      const stats = el.querySelector('.tet__stats')?.offsetHeight || 30
      const controls = el.querySelector('.tet__controls')?.offsetHeight || 60
      const boardH = window.innerHeight - header - stats - controls - 44
      // the board is 10×18 cells plus a border and padding of ~12px
      const fromHeight = ((boardH - 12) * COLS) / ROWS + 12
      const w = Math.floor(Math.max(180, Math.min(360, avail, fromHeight)))
      setWidth((old) => (old === w ? old : w))
    }
    measure()
    const raf = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    window.visualViewport?.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
      window.visualViewport?.removeEventListener('resize', measure)
    }
  }, [ref, ready])
  return width
}

export default function TetrisGame({ puzzle, onSolved }) {
  const { t } = useT()
  const rootRef = useRef(null)


  const { target, seed, level = 0 } = puzzle
  const game = useRef(null)
  const [, redraw] = useState(0)
  const width = useFitWidth(rootRef, !!game.current)

  // bring the game into view just below the sticky header (after it got its size)
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const el = rootRef.current
      if (!el) return
      const header = document.querySelector('.header')?.offsetHeight || 0
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - header - 8 })
    })
    return () => cancelAnimationFrame(raf)
  }, [width])
  const solvedSent = useRef(false)
  const round = useRef(0)

  const newGame = useCallback(() => {
    const next = makeBag(`${seed}:${round.current++}`)
    game.current = { board: startBoard(level, seed), piece: next(), queued: next(), next, lines: 0, score: 0, over: false, won: false, paused: false, lockAt: null, lockMoves: 0 }
    redraw((x) => x + 1)
  }, [seed, level])

  useEffect(() => {
    newGame()
    // lets an automated test see the game (development only)
    if (import.meta.env.DEV) window.__tetris = game
  }, [newGame])

  const spawn = (g) => {
    g.piece = g.queued
    g.queued = g.next()
    g.lockAt = null
    g.lockMoves = 0
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
      if (!g || g.over || g.won || g.paused) return
      const p = g.piece
      let moved = null
      if (action === 'left' && fits(g.board, { ...p, x: p.x - 1 })) moved = { ...p, x: p.x - 1 }
      else if (action === 'right' && fits(g.board, { ...p, x: p.x + 1 })) moved = { ...p, x: p.x + 1 }
      else if (action === 'rotate' || action === 'rotateLeft') {
        const r = rotate(g.board, p, action === 'rotate' ? 1 : -1)
        if (r !== p) moved = r
      } else if (action === 'down' && fits(g.board, { ...p, y: p.y + 1 })) moved = { ...p, y: p.y + 1 }
      else if (action === 'drop') {
        let q = p
        while (fits(g.board, { ...q, y: q.y + 1 })) q = { ...q, y: q.y + 1 }
        g.piece = q
        settle(g)
        redraw((x) => x + 1)
        return
      }
      if (!moved) return
      g.piece = moved
      // sliding or turning on the ground buys a little more time, a limited number of times
      if (g.lockAt !== null && action !== 'down' && g.lockMoves < LOCK_MOVES) {
        g.lockMoves++
        g.lockAt = performance.now() + LOCK_MS
      }
      redraw((x) => x + 1)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [target],
  )

  // Holding a key or button repeats the move: first a short wait, then fast.
  const holds = useRef({})
  const stopHold = useCallback((action) => {
    clearTimeout(holds.current[action])
    clearInterval(holds.current[action])
    delete holds.current[action]
  }, [])
  const startHold = useCallback(
    (action) => {
      if (holds.current[action] !== undefined) return
      act(action)
      if (!REPEATS.has(action)) {
        holds.current[action] = 0 // held, but no repeat
        return
      }
      // the last direction pressed wins
      if (action === 'left') stopHold('right')
      if (action === 'right') stopHold('left')
      holds.current[action] = setTimeout(() => {
        holds.current[action] = setInterval(() => act(action), action === 'down' ? 40 : REPEAT_MS)
      }, HOLD_MS)
    },
    [act, stopHold],
  )
  const stopAllHolds = useCallback(() => Object.keys(holds.current).forEach(stopHold), [stopHold])
  useEffect(() => stopAllHolds, [stopAllHolds])

  const setPaused = useCallback(
    (paused) => {
      const g = game.current
      if (!g || g.over || g.won || !!g.paused === paused) return
      g.paused = paused
      stopAllHolds()
      redraw((x) => x + 1)
    },
    [stopAllHolds],
  )

  // pause by itself when you leave the tab or app
  useEffect(() => {
    const leave = () => setPaused(true)
    const onVisibility = () => document.hidden && leave()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', leave)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', leave)
    }
  }, [setPaused])

  // Gravity and locking. A piece that lands locks after a moment, so it can
  // still slide. Every puzzle of the day starts 7% faster and every line adds
  // 3.5%, with no upper limit: it keeps speeding up (but never reaches zero).
  useEffect(() => {
    let nextFall = performance.now() + 775
    const tick = setInterval(() => {
      const g = game.current
      if (!g || g.over || g.won) return
      const now = performance.now()
      if (g.paused) {
        nextFall = now + 300
        if (g.lockAt !== null) g.lockAt = now + LOCK_MS
        return
      }
      const grounded = !fits(g.board, { ...g.piece, y: g.piece.y + 1 })
      if (!grounded) {
        g.lockAt = null
        if (now >= nextFall) {
          nextFall = now + 775 * 0.93 ** level * 0.965 ** g.lines
          act('down')
        }
      } else if (g.lockAt === null) {
        g.lockAt = now + LOCK_MS
      } else if (now >= g.lockAt) {
        settle(g)
        nextFall = now + 775 * 0.93 ** level * 0.965 ** g.lines
        redraw((x) => x + 1)
      }
    }, 16)
    return () => clearInterval(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, level])

  useEffect(() => {
    const keys = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'rotate', KeyW: 'rotate', KeyX: 'rotate', KeyZ: 'rotateLeft', KeyY: 'rotateLeft', ArrowDown: 'down', KeyS: 'down', Space: 'drop' }
    const onDown = (e) => {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault()
        if (!e.repeat) setPaused(!game.current?.paused)
        return
      }
      if (!keys[e.code]) return
      e.preventDefault()
      if (!e.repeat) startHold(keys[e.code]) // we do the repeating ourselves
    }
    const onUp = (e) => keys[e.code] && stopHold(keys[e.code])
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [startHold, stopHold, setPaused])

  // press-and-hold buttons: they react on touch, without a tap's delay
  const hold = (action) => ({
    onPointerDown: (e) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture?.(e.pointerId)
      startHold(action)
    },
    onPointerUp: () => stopHold(action),
    onPointerCancel: () => stopHold(action),
    onContextMenu: (e) => e.preventDefault(),
  })

  // swiping on the board: drag sideways to move, down to speed up, a quick
  // flick down drops the piece, and a tap rotates it
  const swipe = useRef(null)
  const boardTouch = {
    onPointerDown: (e) => {
      if (e.pointerType === 'mouse') return
      const cell = e.currentTarget.getBoundingClientRect().width / COLS
      swipe.current = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, at: performance.now(), cell, moved: false }
    },
    onPointerMove: (e) => {
      const s = swipe.current
      if (!s) return
      while (Math.abs(e.clientX - s.x) >= s.cell) {
        const dir = e.clientX > s.x ? 1 : -1
        act(dir > 0 ? 'right' : 'left')
        s.x += dir * s.cell
        s.moved = true
      }
      while (e.clientY - s.y >= s.cell) {
        act('down')
        s.y += s.cell
        s.moved = true
      }
    },
    onPointerUp: (e) => {
      const s = swipe.current
      swipe.current = null
      if (!s) return
      const dy = e.clientY - s.sy
      const ms = performance.now() - s.at
      if (dy > s.cell * 3 && ms < 220) act('drop')
      else if (!s.moved && ms < 300) act('rotate')
    },
    onPointerCancel: () => (swipe.current = null),
  }

  const g = game.current
  if (!g) return <div className="tet" ref={rootRef} />
  const active = new Map(cellsOf(g.piece).map(([x, y]) => [`${x},${y}`, g.piece.color]))
  let ghost = g.piece
  while (fits(g.board, { ...ghost, y: ghost.y + 1 })) ghost = { ...ghost, y: ghost.y + 1 }
  const ghostCells = new Set(cellsOf(ghost).map(([x, y]) => `${x},${y}`))

  return (
    <div className="tet" ref={rootRef} style={width ? { width } : undefined}>
      <div className="tet__stats">
        <span>
          {t('Lines')} <strong>{Math.min(g.lines, target)}</strong>/{target}
        </span>
        <span className="tet__next" aria-label={t('Next piece')}>
          {t('Next')}
          <span className="tet__next-grid">
            {Array.from({ length: 2 }, (_, y) =>
              Array.from({ length: 4 }, (_, x) => {
                const on = g.queued.cells.some(([cx, cy]) => cx === x && cy === y)
                return <span key={`${x},${y}`} className="tet__next-cell" style={on ? { background: g.queued.color } : undefined} />
              }),
            )}
          </span>
        </span>
        <span>
          {t('Score')} <strong>{g.score}</strong>
        </span>
        <button className="tet__pause" onClick={() => setPaused(!g.paused)} aria-label={g.paused ? t('Resume') : t('Pause')} title={g.paused ? t('Resume') : t('Pause')} disabled={g.over || g.won}>
          {g.paused ? '▶' : '⏸'}
        </button>
      </div>
      <div className="tet__board" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }} {...boardTouch}>
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
        {g.paused && (
          <div className="tet__overlay tet__overlay--paused">
            <strong>{t('Paused')}</strong>
            <button className="btn btn--primary btn--sm" onClick={() => setPaused(false)}>
              {t('Resume')}
            </button>
          </div>
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
        <button className="tet__btn" {...hold('left')} aria-label={t('Move left')}>
          ◀
        </button>
        <button className="tet__btn" {...hold('right')} aria-label={t('Move right')}>
          ▶
        </button>
        <button className="tet__btn" {...hold('down')} aria-label={t('Move down')}>
          ▼
        </button>
        <button className="tet__btn" {...hold('rotate')} aria-label={t('Rotate')}>
          ⟳
        </button>
        <button className="tet__btn tet__btn--drop" {...hold('drop')} aria-label={t('Drop')}>
          ⤓
        </button>
      </div>
      <p className="puzzle__hint tet__keys">{t('Arrow keys or WASD to move, ↑ or X to rotate (Z for the other way), space to drop, P to pause.')}</p>
    </div>
  )
}
