import { makeRandom } from './random.js'
import { FIGURES } from '../data/collections.js'

// Spot the differences: two shelves of figures; on the right one, some spots
// show a different figure or an empty space.
export const DIFF_SIZES = { small: { cols: 3, rows: 2, diffs: 3 }, medium: { cols: 4, rows: 3, diffs: 5 }, large: { cols: 5, rows: 4, diffs: 7 } }

export function makeDifferences(size, seed) {
  const { cols, rows, diffs } = DIFF_SIZES[size]
  const r = makeRandom(seed)
  const pool = r.shuffle(FIGURES.filter((f) => !f.secret))
  const left = pool.slice(0, cols * rows).map((f) => f.id)
  const right = [...left]
  const spots = r.shuffle([...left.keys()]).slice(0, diffs)
  let spare = cols * rows
  for (const i of spots) {
    // about a third of the differences are a missing figure, the rest a swap
    if (r.next() < 0.34) right[i] = null
    else right[i] = pool[spare++].id
  }
  return { cols, rows, left, right, spots: spots.sort((a, b) => a - b) }
}
