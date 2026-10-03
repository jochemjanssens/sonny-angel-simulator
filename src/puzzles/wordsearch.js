import { makeRandom } from './random.js'

// Small: across and down. Medium: adds diagonals. Large: words may also run backwards.
const CONFIG = {
  small: { n: 8, count: 6, dirs: [[0, 1], [1, 0]] },
  medium: { n: 11, count: 9, dirs: [[0, 1], [1, 0], [1, 1], [-1, 1]] },
  large: { n: 14, count: 12, dirs: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]] },
}
// Filler letters roughly follow Dutch letter frequencies.
const FILLER = 'EEEEEEEEEENNNNNAAAAATTTTRRRRIIIIOOOODDDSSSLLLGGVVHHKKMMUUBBPWJZCF'

export function makeWordSearch(category, size, seed) {
  const { n, count, dirs } = CONFIG[size]
  const r = makeRandom(seed)
  const grid = Array.from({ length: n }, () => Array(n).fill(null))
  const words = []
  const pool = r.shuffle(category.words.map(([w]) => w).filter((w) => w.length >= 3 && w.length <= n))

  for (const word of pool) {
    if (words.length >= count) break
    for (let attempt = 0; attempt < 250; attempt++) {
      const [dr, dc] = r.pick(dirs)
      const row = r.int(n)
      const col = r.int(n)
      const cells = []
      let fits = true
      for (let i = 0; i < word.length; i++) {
        const rr = row + dr * i
        const cc = col + dc * i
        if (rr < 0 || rr >= n || cc < 0 || cc >= n || (grid[rr][cc] && grid[rr][cc] !== word[i])) {
          fits = false
          break
        }
        cells.push([rr, cc])
      }
      if (!fits) continue
      cells.forEach(([rr, cc], i) => (grid[rr][cc] = word[i]))
      words.push({ word, cells })
      break
    }
  }
  for (let rr = 0; rr < n; rr++) for (let cc = 0; cc < n; cc++) grid[rr][cc] ??= r.pick(FILLER)
  return { n, grid, words }
}

// Cells on the straight line from a to b, or null when they aren't in a line.
export function lineCells([r1, c1], [r2, c2]) {
  const dr = Math.sign(r2 - r1)
  const dc = Math.sign(c2 - c1)
  const len = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1))
  if (r1 + dr * len !== r2 || c1 + dc * len !== c2) return null
  return Array.from({ length: len + 1 }, (_, i) => [r1 + dr * i, c1 + dc * i])
}

// Which hidden word (if any) exactly matches the selected cells, in either direction.
export function matchWord(words, cells) {
  const key = (cs) => cs.map((c) => c.join(',')).join('|')
  const sel = key(cells)
  const rev = key([...cells].reverse())
  return words.find((w) => key(w.cells) === sel || key(w.cells) === rev) || null
}
