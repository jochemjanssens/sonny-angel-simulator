import { makeRandom } from './random.js'
import { FIGURE_BY_ID, SERIES } from '../data/collections.js'

// Spot the differences: two shelves of look-alike figures (from only a few
// series). On the right shelf some figures have a subtle change.
export const DIFF_SIZES = { small: { cols: 4, rows: 3, diffs: 4 }, medium: { cols: 5, rows: 4, diffs: 6 }, large: { cols: 6, rows: 5, diffs: 9 } }

const EXTRAS = ['bow:#FF6F91', 'bell', 'whiskers', 'cheeks', 'flower:#FFD3E0', 'collar:#4D79B5', 'scarf:#E5343A', 'bowtie:#2B2B2B', 'nose']
const ACCENTS = ['#FF6F91', '#7FD0EC', '#8CCB5E', '#FFD34D', '#B39DDB', '#FFA94D', '#2B2B2B', '#FFFFFF']

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v) => Math.round(f >= 0 ? v * (1 - f) : v + (255 - v) * -f)
  const [r, g, b] = [ch(n >> 16), ch((n >> 8) & 255), ch(n & 255)]
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

// Headgear that shows the accent colour somewhere (inner ears, leaves, fins...).
const ACCENT_HATS = new Set(['longEars', 'roundEars', 'pointyEars', 'bigEars', 'floppyEars', 'mane', 'leaf', 'sprout', 'fin', 'tuft', 'heart', 'cream', 'calyx', 'antennae', 'crest', 'lollipop', 'witchHat', 'shell', 'petals'])
const accentVisible = (f) => ACCENT_HATS.has(f.hat) || (f.pattern && f.pattern !== 'blaze')

// Each change returns property overrides for the figure, or null if it doesn't apply.
const CHANGES = {
  tint: (f, r) => ({ color: shade(f.color, f.color.toLowerCase() === '#ffffff' ? 0.16 : r.next() < 0.5 ? 0.22 : -0.3) }),
  accent: (f, r) => {
    if (!accentVisible(f)) return null
    const options = ACCENTS.filter((c) => c.toLowerCase() !== f.accent.toLowerCase())
    return { accent: r.pick(options) }
  },
  addExtra: (f, r) => {
    const have = new Set((f.extras || []).map((e) => e.split(':')[0]))
    const options = EXTRAS.filter((e) => !have.has(e.split(':')[0]))
    return { extras: [...(f.extras || []), r.pick(options)] }
  },
  removeExtra: (f, r) => {
    if (!f.extras?.length) return null
    const drop = r.int(f.extras.length)
    return { extras: f.extras.filter((_, i) => i !== drop) }
  },
  pattern: (f) => {
    if (f.pattern) return { pattern: undefined }
    // spots use the accent colour, so make sure they stand out from the hood
    return f.accent.toLowerCase() === f.color.toLowerCase() ? { pattern: 'spots', accent: shade(f.color, 0.35) } : { pattern: 'spots' }
  },
  hoodFace: (f) => ({ hoodFace: !f.hoodFace }),
}

export function makeDifferences(size, seed) {
  const { cols, rows, diffs } = DIFF_SIZES[size]
  const r = makeRandom(seed)
  const cells = cols * rows
  // a few series only, so the figures look alike
  const series = r.shuffle(SERIES.filter((s) => !s.limited)).slice(0, Math.ceil(cells / 10) + 1)
  const pool = r.shuffle(series.flatMap((s) => s.figures))
  const left = pool.slice(0, cells).map((f) => ({ id: f.id }))
  const right = left.map((x) => ({ ...x }))
  const spots = r.shuffle([...left.keys()]).slice(0, diffs).sort((a, b) => a - b)

  for (const i of spots) {
    const fig = FIGURE_BY_ID[left[i].id]
    for (let attempt = 0; attempt < 10; attempt++) {
      const kind = r.pick([...Object.keys(CHANGES), 'swap'])
      if (kind === 'swap') {
        // a different figure from the same series
        const sameSeries = SERIES.find((s) => s.id === fig.seriesId).figures.filter((f) => !left.some((l) => l.id === f.id))
        if (!sameSeries.length) continue
        right[i] = { id: r.pick(sameSeries).id }
        break
      }
      const over = CHANGES[kind](fig, r)
      if (over) {
        right[i] = { id: fig.id, over }
        break
      }
    }
  }
  return { cols, rows, left, right, spots }
}

export const figureFor = (item) => ({ ...FIGURE_BY_ID[item.id], ...item.over })
