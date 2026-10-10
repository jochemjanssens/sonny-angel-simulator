import { makeRandom } from './random.js'
import { FIGURES, SERIES } from '../data/collections.js'

// Memory: find the pairs. Grid columns × rows per size.
export const MEMORY_SIZES = { small: { pairs: 6, cols: 4 }, medium: { pairs: 10, cols: 5 }, large: { pairs: 15, cols: 6 } }

// level 0 is the first puzzle of the day. Every level adds a pair (up to +6),
// and from level 3 the figures come from only a few series so they look alike.
export function makeMemory(size, seed, level = 0) {
  const { cols } = MEMORY_SIZES[size]
  const pairs = MEMORY_SIZES[size].pairs + Math.min(6, level)
  const r = makeRandom(seed)
  const source =
    level >= 3
      ? r.shuffle(SERIES.filter((s) => !s.limited)).slice(0, Math.ceil(pairs / 10) + 1).flatMap((s) => s.figures)
      : FIGURES.filter((f) => !f.secret)
  const figures = r.shuffle(source).slice(0, pairs)
  const cards = r.shuffle(figures.flatMap((f) => [f.id, f.id])).map((figureId, i) => ({ id: i, figureId }))
  return { cols, cards }
}
