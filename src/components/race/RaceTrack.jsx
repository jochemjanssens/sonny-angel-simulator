import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Angel from '../Angel'
import { FIGURE_BY_ID } from '../../data/collections'
import { useT } from '../../i18n'

// The four tracks as drawings. `road` is what's drawn (the jump has a gap),
// `path` is what the cars follow; `riskAt` is where a car can spin out.
const SHAPES = {
  drag: { road: ['M14 150 H346'], path: 'M14 150 H346', riskAt: 0.5 },
  loop: {
    road: ['M14 160 H180 A46 46 0 0 0 180 68 A46 46 0 0 0 178 160 H346'],
    path: 'M14 160 H180 A46 46 0 0 0 180 68 A46 46 0 0 0 178 160 H346',
    riskAt: 0.45,
  },
  jump: {
    road: ['M14 150 H120 L170 118', 'M240 118 L290 150 H346'],
    path: 'M14 150 H120 L170 118 Q205 58 240 118 L290 150 H346',
    riskAt: 0.6,
  },
  canyon: {
    road: ['M24 40 H300 Q340 40 340 72 Q340 102 300 102 H62 Q24 102 24 134 Q24 164 62 164 H346'],
    path: 'M24 40 H300 Q340 40 340 72 Q340 102 300 102 H62 Q24 102 24 134 Q24 164 62 164 H346',
    riskAt: 0.52,
  },
}

const CRASH = 1.5 // seconds lost in a spin-out (same as the server)

// Where a car is after `t` seconds: steady pace towards its finish time, with a
// short pause (and a spin) at the tricky part if it crashed.
function progressAt(run, t, riskAt) {
  const clean = run.crashed ? run.time - CRASH : run.time
  const stopAt = riskAt * clean
  let tt = t
  let spinning = false
  if (run.crashed && t > stopAt) {
    if (t < stopAt + CRASH) {
      tt = stopAt
      spinning = true
    } else tt = t - CRASH
  }
  const x = Math.min(1, tt / clean)
  // a quick launch, then cruising
  const p = x < 0.1 ? (x * x) / 0.2 : x - 0.05
  return { p: Math.min(1, p / 0.95), spinning, done: tt >= clean }
}

// Animates a race between two runs: [{ car, time, crashed }, …] (lane 0 and 1).
export default function RaceTrack({ track, runs, names, onDone }) {
  const { t } = useT()
  const shape = SHAPES[track] || SHAPES.drag
  const pathRef = useRef(null)
  const [len, setLen] = useState(0)
  const [now, setNow] = useState(0)
  const doneSent = useRef(false)

  useLayoutEffect(() => setLen(pathRef.current.getTotalLength()), [track])

  useEffect(() => {
    const end = Math.max(...runs.map((r) => r.time)) + 0.4
    let raf
    const start = performance.now()
    const tick = (ts) => {
      const s = (ts - start) / 1000
      setNow(Math.min(s, end))
      if (s < end) raf = requestAnimationFrame(tick)
      else if (!doneSent.current) {
        doneSent.current = true
        onDone?.()
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runs])

  const placeCar = (run, lane) => {
    if (!len) return null
    const { p, spinning } = progressAt(run, now, shape.riskAt)
    const at = Math.min(len - 0.5, p * len)
    const pt = pathRef.current.getPointAtLength(at)
    const ahead = pathRef.current.getPointAtLength(Math.min(len, at + 1))
    const angle = (Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180) / Math.PI
    // the two lanes sit either side of the middle line
    const off = lane ? 8 : -8
    const rad = (angle * Math.PI) / 180
    const x = pt.x - Math.sin(rad) * off
    const y = pt.y + Math.cos(rad) * off
    const spin = spinning ? (now * 720) % 360 : 0
    return (
      <g key={lane} transform={`translate(${x} ${y}) rotate(${angle + spin})`}>
        <g transform="translate(-16 -42)">
          <Angel figure={FIGURE_BY_ID[run.car]} size={32} />
        </g>
        {/* lane colour, so you can tell the cars apart */}
        <circle cx="0" cy="-17" r="3.4" className={`race-track__dot race-track__dot--${lane}`} />
      </g>
    )
  }

  const finished = runs.map((r) => progressAt(r, now, shape.riskAt).done)

  return (
    <div className="race-track">
      <svg viewBox="0 0 360 200" className="race-track__svg">
        {shape.road.map((d, i) => (
          <g key={i}>
            <path d={d} className="race-track__road" />
            <path d={d} className="race-track__line" />
          </g>
        ))}
        <path ref={pathRef} d={shape.path} fill="none" stroke="none" />
        {/* finish line */}
        <g className="race-track__finish">
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={i % 2 ? 342 : 338} y={(track === 'canyon' ? 150 : track === 'loop' ? 146 : 136) + i * 7} width="4" height="7" />
          ))}
        </g>
        {/* the far lane first, so the near car drives in front of it */}
        {runs.map((r, i) => placeCar(r, i))}
      </svg>
      <div className="race-track__names">
        {runs.map((r, i) => (
          <span key={i} className={`race-track__name race-track__name--${i}`}>
            {names[i]}
            {finished[i] && <strong> · {r.time.toFixed(2)}s</strong>}
            {r.crashed && now > shape.riskAt * (r.time - CRASH) && <em> · {t('spun out!')}</em>}
          </span>
        ))}
      </div>
    </div>
  )
}
