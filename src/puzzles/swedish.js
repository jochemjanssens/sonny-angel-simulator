import { makeRandom } from './random.js'

// Swedish puzzle: every word starts right after a clue cell, to its right
// (across) or below it (down). One clue cell can hold an across and a down clue.
const CONFIG = {
  small: { n: 7, target: 5 },
  medium: { n: 9, target: 8 },
  large: { n: 11, target: 11 },
}
const STEP = { across: [0, 1], down: [1, 0] }

function tryBuild(category, n, target, r) {
  const grid = Array.from({ length: n }, () => Array(n).fill(null)) // null | {letter} | {clue:{across?,down?}} | {block}
  const words = []
  const pool = category.words.filter(([w]) => w.length >= 3 && w.length <= n - 1)
  const used = new Set()
  const at = (row, c) => (row >= 0 && row < n && c >= 0 && c < n ? grid[row][c] : undefined)

  const canPlace = (word, row, c, dir) => {
    const [dr, dc] = STEP[dir]
    const clue = at(row - dr, c - dc)
    if (clue === undefined || clue?.letter || clue?.block || clue?.clue?.[dir]) return false
    const after = at(row + dr * word.length, c + dc * word.length)
    if (after?.letter || after?.clue) return false
    let crossings = 0
    for (let i = 0; i < word.length; i++) {
      const rr = row + dr * i
      const cc = c + dc * i
      const cell = at(rr, cc)
      if (cell === undefined || cell?.clue || cell?.block || cell?.reserved) return false
      if (cell?.letter) {
        if (cell.letter !== word[i] || cell.dirs.includes(dir)) return false
        crossings++
      } else {
        // a fresh letter may not touch other letters sideways (that would spell nonsense)
        const side1 = at(rr + dc, cc + dr)
        const side2 = at(rr - dc, cc - dr)
        if (side1?.letter || side2?.letter) return false
      }
    }
    return { crossings }
  }

  const place = (entry, row, c, dir) => {
    const [word, clue] = entry
    const [dr, dc] = STEP[dir]
    const cr = row - dr
    const cc = c - dc
    if (!grid[cr][cc]) grid[cr][cc] = { clue: {} }
    grid[cr][cc].clue[dir] = { text: clue, index: words.length }
    for (let i = 0; i < word.length; i++) {
      const cell = grid[row + dr * i][c + dc * i]
      if (cell?.letter) cell.dirs.push(dir)
      else grid[row + dr * i][c + dc * i] = { letter: word[i], dirs: [dir] }
    }
    const after = at(row + dr * word.length, c + dc * word.length)
    if (after === null) grid[row + dr * word.length][c + dc * word.length] = { block: true }
    words.push({ word, clue, row, col: c, dir, clueCell: [cr, cc] })
    used.add(word)
  }

  // first word across, somewhere in the upper half
  const first = r.pick(pool.filter(([w]) => w.length <= n - 2))
  place(first, r.int(Math.ceil(n / 2)), 1, 'across')

  for (let round = 0; round < 60 && words.length < target; round++) {
    const options = []
    for (const entry of pool) {
      const [word] = entry
      if (used.has(word)) continue
      for (let row = 0; row < n; row++) {
        for (let c = 0; c < n; c++) {
          for (const dir of ['across', 'down']) {
            const fit = canPlace(word, row, c, dir)
            if (fit && fit.crossings > 0) options.push({ entry, row, c, dir, score: fit.crossings + r.next() })
          }
        }
      }
    }
    if (!options.length) break
    options.sort((a, b) => b.score - a.score)
    const choice = options[Math.min(options.length - 1, r.int(3))]
    place(choice.entry, choice.row, choice.c, choice.dir)
  }

  const cells = grid.map((row) => row.map((cell) => (cell?.letter ? { letter: cell.letter } : cell?.clue ? { clue: cell.clue } : { block: true })))
  return { n, cells, words }
}

// level 0 (first puzzle of the day) shows some letters already; later levels
// show fewer, then none, and pack in more words.
export function makeSwedish(category, size, seed, level = 0) {
  const { n } = CONFIG[size]
  const target = CONFIG[size].target + Math.floor(level / 3)
  let best = null
  for (let attempt = 0; attempt < 160; attempt++) {
    const built = tryBuild(category, n, target, makeRandom(`${seed}:${attempt}`))
    if (!best || built.words.length > best.words.length) best = built
    if (built.words.length >= target) break
  }
  const reveal = [0.35, 0.2, 0.1][level] ?? 0
  const r = makeRandom(`${seed}:hints`)
  for (const row of best.cells) for (const cell of row) if (cell.letter && r.next() < reveal) cell.given = true
  return best
}
