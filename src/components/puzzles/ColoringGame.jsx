import { useRef, useState } from 'react'
import { COLORS } from '../../puzzles/coloring.js'
import { useT } from '../../i18n'

const ERASER = 'eraser'

// Colouring page: pick a colour, tap an area. "Done" unlocks once every area has a colour.
export default function ColoringGame({ puzzle, onSolved }) {
  const { t } = useT()
  const { page } = puzzle
  const [fills, setFills] = useState({})
  const [color, setColor] = useState(COLORS[1])
  const [done, setDone] = useState(false)
  const svgRef = useRef(null)
  const colored = page.regions.filter((r) => fills[r.id]).length
  const complete = colored === page.regions.length

  const paint = (id) => {
    if (done) return
    setFills((f) => {
      const next = { ...f }
      if (color === ERASER) delete next[id]
      else next[id] = color
      return next
    })
  }

  const finish = () => {
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
            d={r.d}
            transform={r.transform}
            fill={fills[r.id] || '#FFFFFF'}
            stroke="#3A2A2A"
            strokeWidth="1.4"
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
      </svg>

      <div className="color__palette" role="radiogroup" aria-label={t('Colours')}>
        {COLORS.map((c) => (
          <button
            key={c}
            className={`color__swatch ${color === c ? 'is-active' : ''}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
            role="radio"
            aria-checked={color === c}
            aria-label={c}
          />
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

      <div className="puzzle__bar">
        <span className="puzzle__hint">
          {t('{colored}/{total} areas coloured', { colored, total: page.regions.length })}
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
