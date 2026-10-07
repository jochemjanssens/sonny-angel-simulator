import { makeRandom } from './random.js'
import { FIGURES } from '../data/collections.js'

// Memory: find the pairs. Grid columns × rows per size.
export const MEMORY_SIZES = { small: { pairs: 6, cols: 4 }, medium: { pairs: 10, cols: 5 }, large: { pairs: 15, cols: 6 } }

export function makeMemory(size, seed) {
  const { pairs, cols } = MEMORY_SIZES[size]
  const r = makeRandom(seed)
  const figures = r.shuffle(FIGURES.filter((f) => !f.secret)).slice(0, pairs)
  const cards = r.shuffle(figures.flatMap((f) => [f.id, f.id])).map((figureId, i) => ({ id: i, figureId }))
  return { cols, cards }
}
