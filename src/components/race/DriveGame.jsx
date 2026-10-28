import { useEffect, useRef, useState } from 'react'
import { createSim } from '../../race/driveSim'
import { TRIAL_TRACKS } from '../../race/trackGeometry'
import { useT } from '../../i18n'

// Drive-yourself time trial: a top-down race around a track with the car you
// picked (see race/driveSim.js for how its stats change the handling).
// Arrow keys / WASD, or the big buttons on a phone.

const KEYS = { ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brake', KeyS: 'brake', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }
const VIEW = 430 // world units across the shortest side of the screen

export default function DriveGame({ trackId, car, onFinish, onQuit }) {
  const { t } = useT()
  const canvasRef = useRef(null)
  const input = useRef({ gas: false, brake: false, left: false, right: false })
  const [hud, setHud] = useState({ lap: 1, time: 0, speed: 0, count: 3, msg: null })

  useEffect(() => {
    const sim = createSim(trackId, car.stats)
    const { track, samples, jump, tangent } = sim
    const c = sim.car
    const s0 = samples[0]
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const MESSAGES = { lap: () => t('Lap {n}!', { n: c.lap }), jump: () => t('Jump!'), fell: () => t('Too slow — you fell in!'), bump: () => t('Bumpy landing!') }
    let start = null // when the GO! light went on
    let raf
    let last = performance.now()
    const countFrom = last
    let msg = null
    let msgUntil = 0
    const say = (text, now, ms = 1200) => {
      msg = text
      msgUntil = now + ms
    }

    const road = (width, color, dash) => {
      ctx.beginPath()
      samples.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
      ctx.closePath()
      ctx.lineWidth = width
      ctx.strokeStyle = color
      ctx.lineJoin = 'round'
      ctx.setLineDash(dash || [])
      ctx.stroke()
      ctx.setLineDash([])
    }

    const draw = () => {
      const W = canvas.width
      const H = canvas.height
      const s = Math.min(W, H) / VIEW
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = track.ground
      ctx.fillRect(0, 0, W, H)
      // the camera follows the car
      ctx.setTransform(s, 0, 0, s, W / 2 - c.x * s, H / 2 - c.y * s)

      if (track.walls) road(track.width + 46, '#7A4426')
      road(track.width + 10, '#FFFFFF')
      road(track.width, '#3A4256')
      road(3, '#FFD34D', [18, 16])

      // the gap of the jump, with an orange ramp in front of it
      if (jump) {
        ctx.beginPath()
        for (let i = jump.from + 2; i <= jump.to; i++) ctx.lineTo(samples[i].x, samples[i].y)
        ctx.lineWidth = track.width + 12
        ctx.strokeStyle = '#2A1A10'
        ctx.stroke()
        const r = samples[jump.from]
        ctx.save()
        ctx.translate(r.x, r.y)
        ctx.rotate(tangent(jump.from))
        ctx.fillStyle = '#FF7A00'
        ctx.fillRect(-14, -track.width / 2, 16, track.width)
        ctx.restore()
      }

      // start / finish line
      ctx.save()
      ctx.translate(s0.x, s0.y)
      ctx.rotate(tangent(0))
      const sq = track.width / 12
      for (let k = 0; k < 12; k++) {
        ctx.fillStyle = k % 2 ? '#1F2A3C' : '#FFFFFF'
        ctx.fillRect(-6, -track.width / 2 + k * sq, 6, sq)
        ctx.fillStyle = k % 2 ? '#FFFFFF' : '#1F2A3C'
        ctx.fillRect(0, -track.width / 2 + k * sq, 6, sq)
      }
      ctx.restore()

      // the car, from above (bigger while flying, shrinking when it falls)
      const lift = c.air > 0 ? 1.25 : c.fallen > 0 ? Math.max(0.2, c.fallen / 1.5) : 1
      ctx.save()
      ctx.translate(c.x, c.y)
      ctx.rotate(c.a)
      ctx.scale(lift, lift)
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.fillRect(-19, -8, 40, 20)
      ctx.fillStyle = '#25252B'
      ;[[-14, -12], [8, -12], [-14, 8], [8, 8]].forEach(([x, y]) => ctx.fillRect(x, y, 9, 4))
      ctx.fillStyle = car.color
      ctx.beginPath()
      ctx.roundRect(-19, -10, 38, 20, 7)
      ctx.fill()
      ctx.fillStyle = car.accent
      ctx.fillRect(-19, -2.5, 38, 5)
      ctx.fillStyle = '#BFE3F7'
      ctx.beginPath()
      ctx.roundRect(2, -7, 8, 14, 3)
      ctx.fill()
      ctx.restore()
    }

    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const sinceCount = (now - countFrom) / 1000
      if (start === null && sinceCount >= 3) {
        start = now
        say(t('GO!'), now, 700)
      }
      const event = start === null ? null : sim.step(dt, input.current)
      if (event && MESSAGES[event]) say(MESSAGES[event](), now)
      if (msg && now > msgUntil) msg = null
      draw()
      const time = start === null ? 0 : now - start
      setHud({ lap: c.lap, time, speed: c.v / sim.vmax, count: start === null ? 3 - Math.floor(sinceCount) : 0, msg })
      if (event === 'finish') {
        onFinish(Math.round(time))
        return
      }
      raf = requestAnimationFrame(loop)
    }

    // the canvas is as big as its box (sharp on high-res screens)
    const fit = () => {
      const box = canvas.parentElement.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(box.width * dpr)
      canvas.height = Math.round(box.height * dpr)
    }
    fit()
    window.addEventListener('resize', fit)
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', fit)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId, car])

  useEffect(() => {
    const down = (e) => {
      if (!KEYS[e.code]) return
      e.preventDefault()
      input.current[KEYS[e.code]] = true
    }
    const up = (e) => {
      if (KEYS[e.code]) input.current[KEYS[e.code]] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // hold-to-press buttons for touch screens
  const hold = (key) => ({
    onPointerDown: (e) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture?.(e.pointerId)
      input.current[key] = true
    },
    onPointerUp: () => (input.current[key] = false),
    onPointerCancel: () => (input.current[key] = false),
    onContextMenu: (e) => e.preventDefault(),
  })

  const laps = TRIAL_TRACKS[trackId].laps
  return (
    <div className="drive">
      <div className="drive__screen">
        <canvas ref={canvasRef} className="drive__canvas" />
        <div className="drive__hud">
          <span>
            {t('Lap')} {Math.min(hud.lap, laps)}/{laps}
          </span>
          <strong>{(hud.time / 1000).toFixed(2)}s</strong>
          <span className="drive__speed">
            <span style={{ width: `${Math.round(hud.speed * 100)}%` }} />
          </span>
        </div>
        {hud.count > 0 && <div className="drive__count">{hud.count}</div>}
        {hud.msg && hud.count <= 0 && <div className="drive__msg">{hud.msg}</div>}
        <button className="drive__quit" onClick={onQuit} aria-label={t('Stop')}>
          ×
        </button>
      </div>
      <div className="drive__controls">
        <span className="drive__pair">
          <button className="drive__btn" {...hold('left')} aria-label={t('Steer left')}>
            ◀
          </button>
          <button className="drive__btn" {...hold('right')} aria-label={t('Steer right')}>
            ▶
          </button>
        </span>
        <span className="drive__pair">
          <button className="drive__btn drive__btn--brake" {...hold('brake')} aria-label={t('Brake')}>
            ■
          </button>
          <button className="drive__btn drive__btn--gas" {...hold('gas')} aria-label={t('Gas')}>
            ▲
          </button>
        </span>
      </div>
      <p className="puzzle__hint drive__keys">{t('Arrow keys or WASD: ↑ gas, ↓ brake, ← → steer.')}</p>
    </div>
  )
}
