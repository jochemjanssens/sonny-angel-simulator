// Colouring pages, built from the same shapes as the Sonny Angel figures.
// Each region is a closed path the player can fill; `lines` are drawn on top.
// Every region also has a target colour (an index into COLORS), used when the
// page is played as colour-by-number. Pages get busier with the daily level.
import { makeRandom } from './random.js'

export const COLORS = [
  '#E4002B', '#FF8FB1', '#FFC2D4', '#FFA94D', '#FFE066', '#8CCB5E',
  '#2E8B57', '#7FD0EC', '#6E9BE8', '#B39DDB', '#A0663A', '#F8D5BE',
  '#FFFFFF', '#9C9C9C', '#2B2B2B',
]
const C = { red: 0, pink: 1, lightPink: 2, orange: 3, yellow: 4, green: 5, darkGreen: 6, lightBlue: 7, blue: 8, lilac: 9, brown: 10, skin: 11, white: 12, grey: 13, black: 14 }
const HOOD_COLORS = [C.red, C.pink, C.orange, C.yellow, C.green, C.lightBlue, C.blue, C.lilac, C.brown]
const BRIGHT = [C.red, C.pink, C.orange, C.yellow, C.green, C.lightBlue, C.blue, C.lilac]

const ellipse = (cx, cy, rx, ry) => `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`
const rect = (x, y, w, h) => `M${x} ${y} H${x + w} V${y + h} H${x} Z`

// The figure is authored in the 120×168 figure space; the hood features in the
// r=40 hood space used by Angel.jsx.
const HOOD = 'translate(60 52) scale(0.875 0.9) translate(-60 -58)'

const star = (cx, cy, R, r = R * 0.45) => {
  let d = ''
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r : R
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rad).toFixed(1)} ${(cy + Math.sin(a) * rad).toFixed(1)} `
  }
  return d + 'Z'
}

const heart = (cx, cy, s) =>
  `M${cx} ${cy + s} C${cx - s * 1.6} ${cy - s * 0.2} ${cx - s} ${cy - s * 1.4} ${cx} ${cy - s * 0.5} C${cx + s} ${cy - s * 1.4} ${cx + s * 1.6} ${cy - s * 0.2} ${cx} ${cy + s} Z`

const other = (rng, list, not) => rng.pick(list.filter((c) => c !== not))

// One Sonny Angel. `x, y, s` place the 120×168 figure on the page.
function angel(rng, prefix, x, y, s, hat) {
  const t = `translate(${x} ${y}) scale(${s})`
  const ht = `${t} ${HOOD}`
  const hood = rng.pick(HOOD_COLORS)
  const inner = other(rng, [C.lightPink, C.pink, C.white], hood)
  const bow = other(rng, BRIGHT, hood)
  const r = (id, d, color, transform = t) => ({ id: `${prefix}-${id}`, d, transform, color })
  const regions = [
    r('wing-l', 'M46 106 C40 94 26 90 23 98 C21 104 28 108 34 108 C30 111 34 115 42 113 Z', C.white),
    r('wing-r', 'M74 106 C80 94 94 90 97 98 C99 104 92 108 86 108 C90 111 86 115 78 113 Z', C.white),
    r('leg-l', 'M47 122 C46 132 46 142 47 149 C48 153 58 153 59 149 C59.5 141 59.6 131 60 124 Z', C.skin),
    r('leg-r', 'M73 122 C74 132 74 142 73 149 C72 153 62 153 61 149 C60.5 141 60.4 131 60 124 Z', C.skin),
    r(
      'body',
      'M47 86 C44 90 40 95 35.5 100.5 C32.5 104 29.5 107 27.5 109.5 C25.5 112 26.5 115 29.5 114.4 C33.5 113.6 38.5 110.5 43 106.5 C42.6 113 43 120 46 126 C52 131 68 131 74 126 C77 120 77.4 113 77 106.5 C81.5 110.5 86.5 113.6 90.5 114.4 C93.5 115 94.5 112 92.5 109.5 C90.5 107 87.5 104 84.5 100.5 C80 95 76 90 73 86 Z',
      C.skin,
    ),
  ]
  if (hat === 'rabbit') {
    regions.push(
      r('ear-l', 'M36 30 C29 12 33 -4 42 -8 C50 -4 55 12 53 30 Z', hood, ht),
      r('ear-r', 'M84 30 C91 12 87 -4 78 -8 C70 -4 65 12 67 30 Z', hood, ht),
      r('inner-l', 'M40 25 C36 12 38 1 43 -2 C48 1 50 12 49 25 Z', inner, ht),
      r('inner-r', 'M80 25 C84 12 82 1 77 -2 C72 1 70 12 71 25 Z', inner, ht),
    )
  } else if (hat === 'cat') {
    regions.push(
      r('ear-l', 'M24 44 L28 4 L54 22 Z', hood, ht),
      r('ear-r', 'M96 44 L92 4 L66 22 Z', hood, ht),
      r('inner-l', 'M31 34 L33 14 L46 24 Z', inner, ht),
      r('inner-r', 'M89 34 L87 14 L74 24 Z', inner, ht),
    )
  } else if (hat === 'bear') {
    regions.push(
      r('ear-l', ellipse(27, 28, 14, 14), hood, ht),
      r('ear-r', ellipse(93, 28, 14, 14), hood, ht),
      r('inner-l', ellipse(27, 28, 7, 7), inner, ht),
      r('inner-r', ellipse(93, 28, 7, 7), inner, ht),
    )
  } else if (hat === 'flower') {
    const petals = [other(rng, BRIGHT, hood), other(rng, BRIGHT, hood)]
    for (let i = 0; i < 8; i++) {
      regions.push({ id: `${prefix}-petal-${i}`, d: ellipse(60, 14, 12, 16), transform: `${ht} rotate(${i * 45} 60 58)`, color: petals[i % 2] })
    }
  }
  regions.push(
    r('hood', ellipse(60, 52, 35, 36), hood),
    r('face', ellipse(60, 63, 26, 24), C.skin),
    r('cheek-l', ellipse(43, 70, 5.5, 5.5), C.pink),
    r('cheek-r', ellipse(77, 70, 5.5, 5.5), C.pink),
    r('bow-l', 'M60 91 L48 84.5 L48.5 97 Z', bow),
    r('bow-r', 'M60 91 L72 84.5 L71.5 97 Z', bow),
    r('bow-knot', ellipse(60, 91, 3.6, 3.6), other(rng, BRIGHT, bow)),
  )
  const lines = [
    { d: 'M46.5 51 Q49.6 49 52.8 50.4 M67.2 50.4 Q70.4 49 73.5 51 M56 73.6 Q60 76.8 64 73.6 M58.8 68.6 Q60 69.8 61.2 68.6', transform: t },
    { d: `${ellipse(50.5, 61.5, 4.2, 4.8)} ${ellipse(69.5, 61.5, 4.2, 4.8)}`, transform: t, fill: '#2b1f1f' },
  ]
  // the area the figure covers, so background confetti stays visible
  const box = { x0: x + 15 * s, x1: x + 105 * s, y0: y - 12 * s, y1: y + 156 * s }
  return { regions, lines, box }
}

// Sun rays: wedges fanning out from (cx, cy), alternating two colours.
function rays(rng, n, cx, cy, w, h) {
  const pair = rng.pick([[C.lightBlue, C.white], [C.yellow, C.lightPink], [C.lightPink, C.white], [C.lilac, C.lightBlue]])
  const R = Math.hypot(w, h) * 1.2
  const out = []
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2
    const a1 = ((i + 1) / n) * Math.PI * 2
    const p = (a) => `${(cx + Math.cos(a) * R).toFixed(1)} ${(cy + Math.sin(a) * R).toFixed(1)}`
    out.push({ id: `ray-${i}`, d: `M${cx} ${cy} L${p(a0)} L${p(a1)} Z`, color: pair[i % 2] })
  }
  return out
}

// A row of tiles along the bottom, like a checkered floor.
function tiles(rng, cols, rows, y, w, h) {
  const pair = rng.pick([[C.red, C.white], [C.yellow, C.orange], [C.lightBlue, C.blue], [C.pink, C.lightPink], [C.green, C.darkGreen]])
  const tw = w / cols
  const th = (h - y) / rows
  const out = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) out.push({ id: `tile-${r}-${c}`, d: rect(c * tw, y + r * th, tw, th), color: pair[(r + c) % 2] })
  return out
}

// Small hearts, stars and dots scattered where no figure stands.
function confetti(rng, n, w, yMax, boxes) {
  const out = []
  for (let tries = 0; out.length < n && tries < n * 40; tries++) {
    const x = 8 + rng.next() * (w - 16)
    const y = 8 + rng.next() * (yMax - 16)
    const clear = boxes.every((b) => x < b.x0 - 8 || x > b.x1 + 8 || y < b.y0 - 8 || y > b.y1 + 8)
    const apart = out.every((o) => Math.hypot(o.x - x, o.y - y) > 18)
    if (!clear || !apart) continue
    const kind = rng.int(3)
    const s = 5 + rng.next() * 4
    const d = kind === 0 ? heart(x, y, s) : kind === 1 ? star(x, y, s + 2) : ellipse(x, y, s * 0.8, s * 0.8)
    out.push({ x, y, id: `confetti-${out.length}`, d, color: rng.pick(BRIGHT) })
  }
  return out.map(({ id, d, color }) => ({ id, d, color }))
}

function picture(name, width, height, parts) {
  const regions = []
  const lines = []
  for (const p of parts.flat()) {
    if (p.regions) {
      regions.push(...p.regions)
      lines.push(...p.lines)
    } else if (p.lineOnly) lines.push(p)
    else regions.push(p)
  }
  return { name, width, height, regions, lines }
}

const NAMES = { small: 'Little bunny', medium: 'Flower angel', large: 'Party time' }
export const coloringName = (size) => NAMES[size]

export function makeColoringPage(size, seed = 'x', level = 0) {
  const rng = makeRandom(`${seed}:coloring`)
  const extra = Math.min(level, 6)

  if (size === 'small') {
    const w = 200, h = 230
    const a = angel(rng, 'a', 40, 34, 1, 'rabbit')
    return picture(NAMES.small, w, h, [
      rays(rng, 8 + extra * 2, 170, 20, w, h),
      { id: 'sun', d: ellipse(170, 20, 18, 18), color: C.yellow },
      tiles(rng, 5 + extra, 1 + (extra > 3 ? 1 : 0), 198, w, h),
      confetti(rng, 3 + extra * 2, w, 196, [a.box, { x0: 150, x1: 190, y0: 0, y1: 40 }]),
      a,
    ])
  }

  if (size === 'medium') {
    const w = 220, h = 250
    const a = angel(rng, 'a', 50, 46, 1, 'flower')
    const flowers = []
    const spots = [[24, 214], [196, 222], [60, 236], [160, 238], [112, 240], [88, 226], [136, 228]]
    spots.slice(0, 2 + extra).forEach(([x, y], i) => {
      const c = rng.pick(BRIGHT)
      flowers.push(
        { id: `flower-${i}`, d: star(x, y, 10, 6), color: c },
        { id: `flower-${i}-mid`, d: ellipse(x, y, 3.2, 3.2), color: other(rng, [C.yellow, C.orange, C.white], c) },
      )
    })
    return picture(NAMES.medium, w, h, [
      rays(rng, 8 + extra * 2, 190, 30, w, h),
      { id: 'sun', d: ellipse(190, 30, 22, 22), color: C.yellow },
      { id: 'cloud', d: 'M20 50 a14 14 0 0 1 22 -12 a16 16 0 0 1 28 4 a12 12 0 0 1 4 22 H24 a12 12 0 0 1 -4 -14 Z', color: C.white },
      { id: 'hill-back', d: 'M0 200 Q60 170 120 196 T220 186 V250 H0 Z', color: C.green },
      { id: 'grass', d: 'M0 215 Q55 195 110 212 T220 208 V250 H0 Z', color: C.darkGreen },
      confetti(rng, extra * 2, w, 170, [a.box, { x0: 160, x1: 220, y0: 0, y1: 60 }, { x0: 10, x1: 80, y0: 25, y1: 70 }]),
      flowers,
      a,
    ])
  }

  const w = 300, h = 260
  const a = angel(rng, 'a', 0, 66, 0.95, 'cat')
  const b = angel(rng, 'b', 186, 66, 0.95, 'bear')
  const flagCount = 7 + extra
  const flags = []
  for (let i = 0; i < flagCount; i++) {
    const fw = w / flagCount
    const x = i * fw
    flags.push({ id: `flag-${i}`, d: `M${x} 0 L${x + fw} 0 L${x + fw / 2} 24 Z`, color: BRIGHT[i % BRIGHT.length] })
  }
  const balloons = []
  const bspots = [[150, 112], [122, 84], [178, 86], [110, 136], [190, 136]]
  bspots.slice(0, 1 + Math.ceil(extra / 2)).forEach(([x, y], i) => {
    balloons.push(
      { lineOnly: true, d: `M${x} ${y + 20} q4 14 0 26 q-4 12 0 22` },
      { id: `balloon-${i}`, d: ellipse(x, y, 14, 18), color: rng.pick(BRIGHT) },
      { id: `balloon-${i}-shine`, d: ellipse(x - 5, y - 7, 3, 5), color: C.white },
    )
  })
  return picture(NAMES.large, w, h, [
    rays(rng, 10 + extra * 2, 150, 40, w, h),
    tiles(rng, 8 + extra, 2, 222, w, h),
    flags,
    confetti(rng, 3 + extra * 2, w, 214, [a.box, b.box, { x0: 82, x1: 218, y0: 60, y1: 230 }, { x0: 0, x1: 300, y0: 0, y1: 30 }]),
    balloons,
    { id: 'gift', d: rect(128, 190, 44, 40), color: rng.pick(BRIGHT) },
    { id: 'gift-lid', d: rect(124, 180, 52, 12), color: rng.pick(BRIGHT) },
    { id: 'ribbon', d: rect(146, 180, 8, 50), color: C.yellow },
    a,
    b,
  ])
}
