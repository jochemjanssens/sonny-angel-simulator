// Colouring pages, built from the same shapes as the Sonny Angel figures.
// Each region is a closed path the player can fill; `lines` are drawn on top.

const ellipse = (cx, cy, rx, ry) => `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`

// The figure is authored in the 120×168 figure space; the hood features in the
// r=40 hood space used by Angel.jsx.
const HOOD = 'translate(60 52) scale(0.875 0.9) translate(-60 -58)'

function angel(prefix, at, hat) {
  const t = at
  const ht = `${at} ${HOOD}`
  const r = (id, d, transform = t) => ({ id: `${prefix}-${id}`, d, transform })
  const regions = [
    r('wing-l', 'M46 106 C40 94 26 90 23 98 C21 104 28 108 34 108 C30 111 34 115 42 113 Z'),
    r('wing-r', 'M74 106 C80 94 94 90 97 98 C99 104 92 108 86 108 C90 111 86 115 78 113 Z'),
    r('leg-l', 'M47 122 C46 132 46 142 47 149 C48 153 58 153 59 149 C59.5 141 59.6 131 60 124 Z'),
    r('leg-r', 'M73 122 C74 132 74 142 73 149 C72 153 62 153 61 149 C60.5 141 60.4 131 60 124 Z'),
    r(
      'body',
      'M47 86 C44 90 40 95 35.5 100.5 C32.5 104 29.5 107 27.5 109.5 C25.5 112 26.5 115 29.5 114.4 C33.5 113.6 38.5 110.5 43 106.5 C42.6 113 43 120 46 126 C52 131 68 131 74 126 C77 120 77.4 113 77 106.5 C81.5 110.5 86.5 113.6 90.5 114.4 C93.5 115 94.5 112 92.5 109.5 C90.5 107 87.5 104 84.5 100.5 C80 95 76 90 73 86 Z',
    ),
  ]
  if (hat === 'rabbit') {
    regions.push(
      r('ear-l', 'M36 30 C29 12 33 -4 42 -8 C50 -4 55 12 53 30 Z', ht),
      r('ear-r', 'M84 30 C91 12 87 -4 78 -8 C70 -4 65 12 67 30 Z', ht),
      r('inner-l', 'M40 25 C36 12 38 1 43 -2 C48 1 50 12 49 25 Z', ht),
      r('inner-r', 'M80 25 C84 12 82 1 77 -2 C72 1 70 12 71 25 Z', ht),
    )
  } else if (hat === 'cat') {
    regions.push(
      r('ear-l', 'M24 44 L28 4 L54 22 Z', ht),
      r('ear-r', 'M96 44 L92 4 L66 22 Z', ht),
      r('inner-l', 'M31 34 L33 14 L46 24 Z', ht),
      r('inner-r', 'M89 34 L87 14 L74 24 Z', ht),
    )
  } else if (hat === 'bear') {
    regions.push(
      r('ear-l', ellipse(27, 28, 14, 14), ht),
      r('ear-r', ellipse(93, 28, 14, 14), ht),
      r('inner-l', ellipse(27, 28, 7, 7), ht),
      r('inner-r', ellipse(93, 28, 7, 7), ht),
    )
  } else if (hat === 'flower') {
    for (let i = 0; i < 8; i++) {
      regions.push({ id: `${prefix}-petal-${i}`, d: ellipse(60, 14, 12, 16), transform: `${ht} rotate(${i * 45} 60 58)` })
    }
  }
  regions.push(
    r('hood', ellipse(60, 52, 35, 36)),
    r('face', ellipse(60, 63, 26, 24)),
    r('cheek-l', ellipse(43, 70, 5.5, 5.5)),
    r('cheek-r', ellipse(77, 70, 5.5, 5.5)),
  )
  const lines = [
    { d: 'M46.5 51 Q49.6 49 52.8 50.4 M67.2 50.4 Q70.4 49 73.5 51 M56 73.6 Q60 76.8 64 73.6 M58.8 68.6 Q60 69.8 61.2 68.6', transform: t },
    { d: `${ellipse(50.5, 61.5, 4.2, 4.8)} ${ellipse(69.5, 61.5, 4.2, 4.8)}`, transform: t, fill: '#2b1f1f' },
  ]
  return { regions, lines }
}

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

function picture(name, width, height, parts) {
  const regions = []
  const lines = []
  for (const p of parts) {
    if (p.regions) {
      regions.push(...p.regions)
      lines.push(...p.lines)
    } else regions.push(p)
  }
  return { name, width, height, regions, lines }
}

export const COLORING_PAGES = {
  small: () =>
    picture('Little bunny', 200, 230, [
      { id: 'sky', d: 'M0 0 H200 V230 H0 Z' },
      { id: 'heart-1', d: heart(28, 40, 12) },
      { id: 'heart-2', d: heart(172, 60, 10) },
      angel('a', 'translate(40 40) scale(1)', 'rabbit'),
    ]),
  medium: () =>
    picture('Flower angel', 220, 250, [
      { id: 'sky', d: 'M0 0 H220 V250 H0 Z' },
      { id: 'sun', d: ellipse(185, 35, 22, 22) },
      { id: 'cloud', d: 'M20 50 a14 14 0 0 1 22 -12 a16 16 0 0 1 28 4 a12 12 0 0 1 4 22 H24 a12 12 0 0 1 -4 -14 Z' },
      { id: 'grass', d: 'M0 215 Q55 195 110 212 T220 208 V250 H0 Z' },
      { id: 'flower-l', d: star(28, 215, 11, 6) },
      { id: 'flower-r', d: star(195, 222, 10, 5.5) },
      angel('a', 'translate(50 52) scale(1)', 'flower'),
    ]),
  large: () =>
    picture('Party time', 300, 260, [
      { id: 'sky', d: 'M0 0 H300 V260 H0 Z' },
      { id: 'floor', d: 'M0 222 H300 V260 H0 Z' },
      { id: 'star-1', d: star(30, 30, 13) },
      { id: 'star-2', d: star(150, 22, 10) },
      { id: 'star-3', d: star(272, 36, 12) },
      { id: 'heart', d: heart(150, 70, 11) },
      { id: 'balloon', d: ellipse(150, 120, 16, 20) },
      { id: 'gift', d: 'M128 190 H172 V230 H128 Z' },
      { id: 'gift-lid', d: 'M124 180 H176 V192 H124 Z' },
      { id: 'ribbon', d: 'M146 180 H154 V230 H146 Z' },
      angel('a', 'translate(0 60) scale(0.95)', 'cat'),
      angel('b', 'translate(186 60) scale(0.95)', 'bear'),
    ]),
}

export const COLORS = [
  '#E4002B', '#FF8FB1', '#FFC2D4', '#FFA94D', '#FFE066', '#8CCB5E',
  '#2E8B57', '#7FD0EC', '#6E9BE8', '#B39DDB', '#A0663A', '#F8D5BE',
  '#FFFFFF', '#9C9C9C', '#2B2B2B',
]
