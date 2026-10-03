import { makeRandom } from './random.js'

// Binary puzzle (binairo): fill every cell with 0 or 1 so that
// - no three equal digits sit next to each other in a row or column,
// - every row and column has as many 0s as 1s,
// - no two rows (or two columns) are the same.
export const BINARY_SIZES = { small: 6, medium: 8, large: 10 }

const col = (g, c) => g.map((row) => row[c])

function makeSolution(n, r) {
  const g = Array.from({ length: n }, () => Array(n).fill(null))
  const half = n / 2
  const ok = (row, c) => {
    const v = g[row][c]
    if (c >= 2 && g[row][c - 1] === v && g[row][c - 2] === v) return false
    if (row >= 2 && g[row - 1][c] === v && g[row - 2][c] === v) return false
    if (g[row].slice(0, c + 1).filter((x) => x === v).length > half) return false
    if (col(g, c).slice(0, row + 1).filter((x) => x === v).length > half) return false
    if (c === n - 1) {
      const key = g[row].join('')
      for (let k = 0; k < row; k++) if (g[k].join('') === key) return false
    }
    if (row === n - 1) {
      const key = col(g, c).join('')
      for (let k = 0; k < c; k++) if (col(g, k).join('') === key) return false
    }
    return true
  }
  let steps = 0
  const fill = (i) => {
    if (i === n * n) return true
    if (++steps > 200000) return false
    const row = Math.floor(i / n)
    const c = i % n
    for (const v of r.shuffle([0, 1])) {
      g[row][c] = v
      if (ok(row, c) && fill(i + 1)) return true
    }
    g[row][c] = null
    return false
  }
  return fill(0) ? g : null
}

// Solves using only logical steps (no guessing). Returns the grid, or null if stuck.
export function logicSolve(start) {
  const n = start.length
  const half = n / 2
  const g = start.map((row) => [...row])
  const lines = () => [
    ...g.map((_, i) => ({ get: (k) => g[i][k], set: (k, v) => (g[i][k] = v) })),
    ...g.map((_, j) => ({ get: (k) => g[k][j], set: (k, v) => (g[k][j] = v) })),
  ]
  let changed = true
  while (changed) {
    changed = false
    for (const line of lines()) {
      // a pair or a gap between two equal digits forces the opposite digit
      for (let k = 0; k + 2 < n; k++) {
        const t = [line.get(k), line.get(k + 1), line.get(k + 2)]
        const empties = t.filter((x) => x === null).length
        if (empties !== 1) continue
        const known = t.filter((x) => x !== null)
        if (known[0] === known[1]) {
          const idx = t.indexOf(null)
          line.set(k + idx, 1 - known[0])
          changed = true
        }
      }
      // when a line already has all its 0s (or 1s), the rest is the other digit
      const vals = Array.from({ length: n }, (_, k) => line.get(k))
      for (const v of [0, 1]) {
        if (vals.filter((x) => x === v).length === half && vals.includes(null)) {
          vals.forEach((x, k) => x === null && line.set(k, 1 - v))
          changed = true
          break
        }
      }
    }
  }
  return g.every((row) => row.every((x) => x !== null)) ? g : null
}

export function makeBinary(size, seed) {
  const n = BINARY_SIZES[size]
  const r = makeRandom(seed)
  let solution = null
  for (let i = 0; !solution && i < 20; i++) solution = makeSolution(n, r)
  // remove clues one by one while the puzzle stays solvable by logic alone
  const puzzle = solution.map((row) => [...row])
  for (const idx of r.shuffle([...Array(n * n).keys()])) {
    const row = Math.floor(idx / n)
    const c = idx % n
    const keep = puzzle[row][c]
    puzzle[row][c] = null
    const solved = logicSolve(puzzle)
    if (!solved || solved.some((line, i) => line.some((v, j) => v !== solution[i][j]))) puzzle[row][c] = keep
  }
  return { n, puzzle, solution }
}

// Any grid that follows all the rules counts as solved.
export function binaryErrors(g) {
  const n = g.length
  const half = n / 2
  const bad = new Set()
  const check = (cells) => {
    const vals = cells.map(([i, j]) => g[i][j])
    for (let k = 0; k + 2 < n; k++) {
      if (vals[k] !== null && vals[k] === vals[k + 1] && vals[k] === vals[k + 2]) {
        ;[k, k + 1, k + 2].forEach((x) => bad.add(cells[x].join(',')))
      }
    }
    for (const v of [0, 1]) {
      if (vals.filter((x) => x === v).length > half) cells.forEach((cc, k) => vals[k] === v && bad.add(cc.join(',')))
    }
  }
  for (let i = 0; i < n; i++) {
    check(Array.from({ length: n }, (_, j) => [i, j]))
    check(Array.from({ length: n }, (_, j) => [j, i]))
  }
  return bad
}

export function binarySolved(g) {
  const n = g.length
  if (g.some((row) => row.some((x) => x === null))) return false
  if (binaryErrors(g).size) return false
  const rows = new Set(g.map((row) => row.join('')))
  const cols = new Set(Array.from({ length: n }, (_, j) => col(g, j).join('')))
  return rows.size === n && cols.size === n
}
