// Draws the app icons (PNG) for both simulators without any image library:
// a tiny anti-aliased rasteriser for ellipses and glows, written out as PNG.
// Run: node scripts/gen-icons.mjs  →  public/icons/*.png
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]

// Shapes are in a 100×100 space. Everything important stays inside the middle
// 80%, so Android can crop the icon to a circle or squircle ("maskable").
const ICONS = {
  sonny: {
    bg: '#E4002B',
    shapes: [
      { glow: [50, 52, 44], color: '#FFFFFF', alpha: 0.18 },
      // rabbit ears, hood, face, eyes, cheeks
      { ellipse: [38, 30, 7, 14, -14], color: '#FFFFFF' },
      { ellipse: [38, 31, 3.5, 9.5, -14], color: '#F7B6C2' },
      { ellipse: [62, 30, 7, 14, 14], color: '#FFFFFF' },
      { ellipse: [62, 31, 3.5, 9.5, 14], color: '#F7B6C2' },
      { ellipse: [50, 55, 29, 28, 0], color: '#FFFFFF' },
      { ellipse: [50, 61, 21, 19, 0], color: '#F8D5BE' },
      { ellipse: [43, 60, 3.6, 4.2, 0], color: '#2B1F1F' },
      { ellipse: [57, 60, 3.6, 4.2, 0], color: '#2B1F1F' },
      { ellipse: [44.2, 58.6, 1.3, 1.3, 0], color: '#FFFFFF' },
      { ellipse: [58.2, 58.6, 1.3, 1.3, 0], color: '#FFFFFF' },
      { ellipse: [38, 67, 4, 3.2, 0], color: '#F49A9A', alpha: 0.7 },
      { ellipse: [62, 67, 4, 3.2, 0], color: '#F49A9A', alpha: 0.7 },
    ],
  },
  smiski: {
    bg: '#11131B',
    shapes: [
      { glow: [50, 52, 40], color: '#D6FF7A', alpha: 0.55 },
      // body, arms hugging knees, head, tiny eyes
      { ellipse: [50, 74, 15, 13, 0], color: '#DDF7A0' },
      { ellipse: [42, 77, 7, 8, 0], color: '#E6FFB0' },
      { ellipse: [58, 77, 7, 8, 0], color: '#E6FFB0' },
      { ellipse: [50, 45, 23, 21, 0], color: '#E6FFB0' },
      { ellipse: [43, 47, 1.9, 2.4, 0], color: '#2B2626' },
      { ellipse: [57, 47, 1.9, 2.4, 0], color: '#2B2626' },
    ],
  },
}

function inEllipse(x, y, [cx, cy, rx, ry, deg]) {
  const t = (-deg * Math.PI) / 180
  const dx = x - cx
  const dy = y - cy
  const u = dx * Math.cos(t) - dy * Math.sin(t)
  const v = dx * Math.sin(t) + dy * Math.cos(t)
  return (u * u) / (rx * rx) + (v * v) / (ry * ry) <= 1
}

function render({ bg, shapes }, size) {
  const px = new Uint8Array(size * size * 3)
  const S = 4 // 4×4 samples per pixel for smooth edges
  const base = hex(bg)
  const cols = shapes.map((s) => hex(s.color))
  for (let py = 0; py < size; py++) {
    for (let pxx = 0; pxx < size; pxx++) {
      let acc = [0, 0, 0]
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const x = ((pxx + (sx + 0.5) / S) / size) * 100
          const y = ((py + (sy + 0.5) / S) / size) * 100
          let c = [...base]
          shapes.forEach((s, i) => {
            let a = 0
            if (s.glow) {
              const [gx, gy, r] = s.glow
              const d = Math.hypot(x - gx, y - gy) / r
              a = d < 1 ? (1 - d) ** 2 * s.alpha : 0
            } else if (inEllipse(x, y, s.ellipse)) a = s.alpha ?? 1
            if (a) c = c.map((v, k) => v + (cols[i][k] - v) * a)
          })
          acc = acc.map((v, k) => v + c[k])
        }
      }
      const o = (py * size + pxx) * 3
      for (let k = 0; k < 3; k++) px[o + k] = Math.round(acc[k] / (S * S))
    }
  }
  return px
}

// minimal PNG writer (RGB, 8 bit)
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(px, size) {
  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    Buffer.from(px.buffer, y * size * 3, size * 3).copy(raw, y * (size * 3 + 1) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

const out = new URL('../public/icons/', import.meta.url)
mkdirSync(out, { recursive: true })
for (const [brand, icon] of Object.entries(ICONS)) {
  for (const size of [180, 192, 512]) {
    writeFileSync(new URL(`${brand}-${size}.png`, out), png(render(icon, size), size))
  }
}
console.log('Wrote icons to public/icons/')
