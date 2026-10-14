import { makeRandom } from './random.js'

// Binary puzzle (binairo): fill every cell with 0 or 1 so that
// - no three equal digits sit next to each other in a row or column,
// - every row and column has as many 0s as 1s,
// - no two rows (or two columns) are the same.
export const BINARY_SIZES = { small: 6, medium: 8, large: 10 }
// From level 20 (level 19 in code, which counts from 0) the grid grows by two
// rows and columns.
export const binarySize = (size, level = 0) => BINARY_SIZES[size] + (level >= 19 ? 2 : 0)

// Share of the empty cells that get an extra digit as a hint. It shrinks from
// 40% on level 1 to none on level 15, and when the grid grows on level 20 it
// starts again at 15% and shrinks to none on level 30.
function extraClues(level) {
  if (level >= 19) return Math.max(0, 0.15 * (1 - (level - 19) / 10))
  return Math.max(0, 0.4 * (1 - level / 14))
}

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

// Every line of length n that follows the rules on its own (as many 0s as 1s,
// no three equal digits in a row). Only a few hundred, even for n = 12.
const LINES = {}
function validLines(n) {
  if (LINES[n]) return LINES[n]
  const out = []
  const line = []
  const grow = (zeros, ones) => {
    if (line.length === n) return out.push([...line])
    for (const v of [0, 1]) {
      if ((v ? ones : zeros) === n / 2) continue
      const k = line.length
      if (k >= 2 && line[k - 1] === v && line[k - 2] === v) continue
      line.push(v)
      grow(zeros + (v === 0), ones + (v === 1))
      line.pop()
    }
  }
  grow(0, 0)
  return (LINES[n] = out)
}

// Solves using only logical steps (no guessing). Returns the grid, or null if stuck.
// depth 0: pairs, gaps and full counts. depth 1: also looks at every way a line
// can still be finished. depth 2: also uses "no two rows or columns are the same".
export function logicSolve(start, depth = 0) {
  const n = start.length
  const half = n / 2
  const g = start.map((row) => [...row])
  const rows = g.map((_, i) => ({ get: (k) => g[i][k], set: (k, v) => (g[i][k] = v), group: 'row' }))
  const cols = g.map((_, j) => ({ get: (k) => g[k][j], set: (k, v) => (g[k][j] = v), group: 'col' }))
  const values = (line) => Array.from({ length: n }, (_, k) => line.get(k))
  let changed = true
  while (changed) {
    changed = false
    for (const line of [...rows, ...cols]) {
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
      const vals = values(line)
      for (const v of [0, 1]) {
        if (vals.filter((x) => x === v).length === half && vals.includes(null)) {
          vals.forEach((x, k) => x === null && line.set(k, 1 - v))
          changed = true
          break
        }
      }
      if (depth < 1) continue
      // a cell that is the same in every way to finish the line is known
      const now = values(line)
      if (!now.includes(null)) continue
      let options = validLines(n).filter((p) => p.every((v, k) => now[k] === null || now[k] === v))
      if (depth >= 2) {
        const done = new Set(
          (line.group === 'row' ? rows : cols)
            .map(values)
            .filter((vs) => !vs.includes(null))
            .map((vs) => vs.join('')),
        )
        options = options.filter((p) => !done.has(p.join('')))
      }
      if (!options.length) continue
      now.forEach((x, k) => {
        if (x === null && options.every((p) => p[k] === options[0][k])) {
          line.set(k, options[0][k])
          changed = true
        }
      })
    }
  }
  return g.every((row) => row.every((x) => x !== null)) ? g : null
}

// A little harder with every level (levels as shown to the player): fewer
// extra digits up to level 15, smarter reasoning from level 10, a grid two
// bigger from level 20, and from level 30 you also need "no two lines are the
// same", which is the hardest it gets.
export function makeBinary(size, seed, level = 0) {
  const n = binarySize(size, level)
  const depth = level >= 29 ? 2 : level >= 9 ? 1 : 0
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
    const solved = logicSolve(puzzle, depth)
    if (!solved || solved.some((line, i) => line.some((v, j) => v !== solution[i][j]))) puzzle[row][c] = keep
  }
  const extra = extraClues(level)
  for (const idx of r.shuffle([...Array(n * n).keys()])) {
    const row = Math.floor(idx / n)
    const c = idx % n
    if (puzzle[row][c] === null && r.next() < extra) puzzle[row][c] = solution[row][c]
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
