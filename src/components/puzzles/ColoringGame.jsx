import { useLayoutEffect, useRef, useState } from 'react'
import { COLORS } from '../../puzzles/coloring.js'
import { useT } from '../../i18n'

const ERASER = 'eraser'

// For each region: a spot inside it that isn't covered by a later region, where
// its number can go. Regions that are completely hidden get no spot.
function findLabelSpots(svg, regions) {
  const root = svg.getScreenCTM().inverse()
  const els = regions.map((r) => svg.querySelector(`[data-region="${r.id}"]`))
  const toLocal = els.map((el) => root.multiply(el.getScreenCTM()).inverse())
  const boxes = els.map((el) => {
    const b = el.getBBox()
    const m = root.multiply(el.getScreenCTM())
    const pts = [new DOMPoint(b.x, b.y), new DOMPoint(b.x + b.width, b.y), new DOMPoint(b.x, b.y + b.height), new DOMPoint(b.x + b.width, b.y + b.height)].map((p) => p.matrixTransform(m))
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
  })
  const inside = (i, p) => els[i].isPointInFill(p.matrixTransform(toLocal[i]))
  const visible = (i, p) => {
    if (!inside(i, p)) return false
    for (let j = i + 1; j < els.length; j++) {
      const b = boxes[j]
      if (p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1 && inside(j, p)) return false
    }
    return true
  }
  const W = svg.viewBox.baseVal.width
  const H = svg.viewBox.baseVal.height
  return regions.map((r, i) => {
    const b = boxes[i]
    const x0 = Math.max(b.x0, 0), x1 = Math.min(b.x1, W)
    const y0 = Math.max(b.y0, 0), y1 = Math.min(b.y1, H)
    if (x1 <= x0 || y1 <= y0) return null
    // try a grid of points, keep the visible one with the most visible neighbours
    const N = 11
    const sx = (x1 - x0) / (N + 1), sy = (y1 - y0) / (N + 1)
    const ok = []
    for (let gy = 1; gy <= N; gy++)
      for (let gx = 1; gx <= N; gx++) {
        const p = new DOMPoint(x0 + gx * sx, y0 + gy * sy)
        if (visible(i, p)) ok.push({ gx, gy, p })
      }
    if (!ok.length) return null
    const has = new Set(ok.map((o) => `${o.gx},${o.gy}`))
    const depth = (o) => {
      let d = 0
      while (d < N && [[d + 1, 0], [-d - 1, 0], [0, d + 1], [0, -d - 1]].every(([dx, dy]) => has.has(`${o.gx + dx},${o.gy + dy}`))) d++
      return d
    }
    const best = ok.reduce((a, o) => (depth(o) > depth(a) ? o : a))
    const room = Math.min(sx, sy) * (depth(best) * 2 + 1)
    return { x: best.p.x, y: best.p.y, size: Math.max(5, Math.min(8, room * 0.7)) }
  })
}

// Colouring page: pick a colour, tap an area. On harder levels it's colour by
// number: every area has to get the colour of its number.
export default function ColoringGame({ puzzle, onSolved }) {
  const { t } = useT()
  const { page, minColors = 0, byNumber = false } = puzzle
  const [fills, setFills] = useState({})
  const [color, setColor] = useState(COLORS[1])
  const [done, setDone] = useState(false)
  const [spots, setSpots] = useState(null)
  const [wrong, setWrong] = useState(null)
  const svgRef = useRef(null)

  useLayoutEffect(() => {
    if (byNumber) setSpots(findLabelSpots(svgRef.current, page.regions))
  }, [byNumber, page])

  // areas you can't see anywhere are filled in for you
  const hidden = new Set(spots ? page.regions.filter((r, i) => !spots[i]).map((r) => r.id) : [])
  const fillOf = (r) => fills[r.id] || (hidden.has(r.id) ? COLORS[r.color] : null)
  const playable = page.regions.filter((r) => !hidden.has(r.id))
  const colored = playable.filter((r) => fills[r.id]).length
  const usedColors = new Set(Object.values(fills)).size
  const complete = colored === playable.length && (byNumber ? !!spots : usedColors >= minColors)

  const paint = (id) => {
    if (done) return
    setWrong(null)
    setFills((f) => {
      const next = { ...f }
      if (color === ERASER) delete next[id]
      else next[id] = color
      return next
    })
  }

  const finish = () => {
    if (byNumber) {
      const bad = playable.filter((r) => fills[r.id] !== COLORS[r.color]).map((r) => r.id)
      if (bad.length) return setWrong(new Set(bad))
    }
    setDone(true)
    onSolved()
  }

  // Turns the drawing into a PNG and downloads it.
  const save = () => {
    const svg = new XMLSerializer().serializeToString(svgRef.current)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = page.width * 4
      canvas.height = page.height * 4
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `${t(page.name).toLowerCase().replace(/\s+/g, '-')}.png`
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 2000)
      })
    }
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  }

  return (
    <div className="color">
      <svg
        ref={svgRef}
        className="color__page"
        viewBox={`0 0 ${page.width} ${page.height}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={t(page.name)}
      >
        {page.regions.map((r) => (
          <path
            key={r.id}
            data-region={r.id}
            d={r.d}
            transform={r.transform}
            fill={fillOf(r) || '#FFFFFF'}
            stroke={wrong?.has(r.id) ? '#E4002B' : '#3A2A2A'}
            strokeWidth={wrong?.has(r.id) ? 3 : 1.4}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            onClick={() => paint(r.id)}
            style={{ cursor: done ? 'default' : 'pointer' }}
          />
        ))}
        {page.lines.map((l, i) => (
          <path
            key={i}
            d={l.d}
            transform={l.transform}
            fill={l.fill || 'none'}
            stroke="#3A2A2A"
            strokeWidth="1.4"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        ))}
        {byNumber &&
          spots &&
          !done &&
          page.regions.map((r, i) =>
            spots[i] && !fills[r.id] ? (
              <text key={r.id} className="color__num" x={spots[i].x} y={spots[i].y} fontSize={spots[i].size} pointerEvents="none">
                {r.color + 1}
              </text>
            ) : null,
          )}
      </svg>

      <div className="color__palette" role="radiogroup" aria-label={t('Colours')}>
        {COLORS.map((c, i) => (
          <button
            key={c}
            className={`color__swatch ${color === c ? 'is-active' : ''}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
            role="radio"
            aria-checked={color === c}
            aria-label={byNumber ? `${i + 1}` : c}
          >
            {byNumber && <span className={`color__swatch-num ${i >= 13 ? 'is-light' : ''}`}>{i + 1}</span>}
          </button>
        ))}
        <button
          className={`color__swatch color__swatch--eraser ${color === ERASER ? 'is-active' : ''}`}
          onClick={() => setColor(ERASER)}
          role="radio"
          aria-checked={color === ERASER}
          aria-label={t('Eraser')}
        >
          🧽
        </button>
      </div>

      {byNumber && <p className="color__rule">{t('Colour by number: give every area the colour of its number.')}</p>}
      {wrong && <p className="color__wrong">{wrong.size === 1 ? t('One area has the wrong colour. It is outlined in red.') : t('{n} areas have the wrong colour. They are outlined in red.', { n: wrong.size })}</p>}

      <div className="puzzle__bar">
        <span className="puzzle__hint">
          {t('{colored}/{total} areas coloured', { colored, total: playable.length })}
          {!byNumber && minColors > 0 && ` · ${t('{used}/{min} colours used', { used: usedColors, min: minColors })}`}
        </span>
        <span className="color__actions">
          <button className="btn btn--ghost btn--sm" onClick={save}>
            {t('Save picture')}
          </button>
          <button className="btn btn--primary btn--sm" onClick={finish} disabled={!complete || done}>
            {t('Done!')}
          </button>
        </span>
      </div>
    </div>
  )
}
