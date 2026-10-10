import { makeRandom } from './random.js'

// Tetris: clear the target number of lines to finish.
export const TETRIS_TARGETS = { small: 5, medium: 10, large: 20 }
export const COLS = 10
export const ROWS = 18

const SHAPES = {
  I: { color: '#7FD0EC', cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { color: '#FFE066', cells: [[1, 0], [2, 0], [1, 1], [2, 1]] },
  T: { color: '#C9A7F2', cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { color: '#8CCB5E', cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { color: '#F77F8E', cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { color: '#6E9BE8', cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { color: '#FFA94D', cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
}

export const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null))

// From level 3, a round starts with a few rows of grey junk blocks, each with one gap.
export function startBoard(level, seed) {
  const board = emptyBoard()
  const rows = Math.min(6, Math.max(0, level - 2))
  const r = makeRandom(`${seed}:junk`)
  for (let i = 0; i < rows; i++) {
    const gap = r.int(COLS)
    board[ROWS - 1 - i] = Array.from({ length: COLS }, (_, x) => (x === gap ? null : '#C9BDB4'))
  }
  return board
}

export function makeBag(seed) {
  const r = makeRandom(seed)
  let bag = []
  // "7-bag": every piece once per round, in a random order
  return () => {
    if (!bag.length) bag = r.shuffle(Object.keys(SHAPES))
    const type = bag.pop()
    return { type, color: SHAPES[type].color, cells: SHAPES[type].cells.map(([x, y]) => [x, y]), x: 3, y: 0 }
  }
}

export const cellsOf = (p) => p.cells.map(([x, y]) => [p.x + x, p.y + y])

export function fits(board, piece) {
  return cellsOf(piece).every(([x, y]) => x >= 0 && x < COLS && y < ROWS && (y < 0 || !board[y][x]))
}

export function rotate(board, piece) {
  if (piece.type === 'O') return piece
  const size = piece.type === 'I' ? 4 : 3
  const cells = piece.cells.map(([x, y]) => [size - 1 - y, x])
  // try a few sideways nudges so pieces can rotate next to a wall
  for (const dx of [0, -1, 1, -2, 2]) {
    const next = { ...piece, cells, x: piece.x + dx }
    if (fits(board, next)) return next
  }
  return piece
}

// Locks a piece into the board and clears full lines. Returns { board, cleared }.
export function lock(board, piece) {
  const next = board.map((row) => [...row])
  for (const [x, y] of cellsOf(piece)) if (y >= 0) next[y][x] = piece.color
  const kept = next.filter((row) => row.some((c) => !c))
  const cleared = ROWS - kept.length
  return { board: [...Array.from({ length: cleared }, () => Array(COLS).fill(null)), ...kept], cleared }
}
