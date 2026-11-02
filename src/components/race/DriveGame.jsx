import { useEffect, useRef, useState } from 'react'
import { createSim } from '../../race/driveSim'
import { TRIAL_TRACKS } from '../../race/trackGeometry'
import { MEDALS } from '../../data/cars'
import { euro } from '../../data/collections'
import { useT } from '../../i18n'

// Drive-yourself time trial: a top-down race around a track with the car you
// picked (see race/driveSim.js for how its stats change the handling).
// Arrow keys / WASD, or the big buttons on a phone.

const KEYS = { ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brake', KeyS: 'brake', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }
const VIEW = 430 // world units across the shortest side of the screen

const secs = (ms) => `${(ms / 1000).toFixed(2)}s`
// a gap to first place: +0.34s behind, −0.12s ahead
const gapText = (ms) => `${ms > 0 ? '+' : ms < 0 ? '−' : '±'}${(Math.abs(ms) / 1000).toFixed(2)}s`

// leader: first place on this track { name, time_ms, laps, isMe }, or null.
// result: what the server said about your finished race (medal, reward, rank).
export default function DriveGame({ trackId, car, leader, result, onFinish, onQuit }) {
  const { t } = useT()
  const canvasRef = useRef(null)
  const input = useRef({ gas: false, brake: false, left: false, right: false })
  const [hud, setHud] = useState({ lap: 1, time: 0, lapTime: 0, speed: 0, count: 3, msg: null })
  const [laps, setLaps] = useState([]) // finished laps: { ms, gap } (gap to first place at that line)
  const [finish, setFinish] = useState(null) // { time, gap } once you're over the line
  // the latest props, read by the running game without restarting it
  const latest = useRef({ car, leader, onFinish, t })
  latest.current = { car, leader, onFinish, t }

  useEffect(() => {
    const { car, t } = latest.current
    const sim = createSim(trackId, car.stats)
    const { track, samples, tangent } = sim
    const c = sim.car
    const s0 = samples[0]
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let start = null // when the GO! light went on
    let raf
    let last = performance.now()
    const countFrom = last
    let msg = null
    let msgUntil = 0
    const splits = [] // the time of each finished lap
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

      if (track.walls) road(track.width + 46, track.wallColor || '#7A4426')
      road(track.width + 10, '#FFFFFF')
      road(track.width, track.road || '#3A4256')
      road(3, '#FFD34D', [18, 16])

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

      // the car, from above
      ctx.save()
      ctx.translate(c.x, c.y)
      ctx.rotate(c.a)
      // a soft shadow that always falls the same way on the track (light from
      // the top left), however the car turns: canvas shadow offsets ignore rotation
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
      ctx.shadowBlur = 6 * s
      ctx.shadowOffsetX = 5 * s
      ctx.shadowOffsetY = 6 * s
      ctx.fillStyle = '#25252B'
      ;[[-14, -12], [8, -12], [-14, 8], [8, 8]].forEach(([x, y]) => ctx.fillRect(x, y, 9, 4))
      ctx.fillStyle = car.color
      ctx.beginPath()
      ctx.roundRect(-19, -10, 38, 20, 7)
      ctx.fill()
      ctx.shadowColor = 'transparent'
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
      const time = start === null ? 0 : Math.round(now - start)
      const lapStart = splits.reduce((a, b) => a + b, 0)
      if (event === 'lap' || event === 'finish') {
        // over the line: this lap's time, and the gap to first place at this point
        const { leader } = latest.current
        const lapMs = time - lapStart
        splits.push(lapMs)
        const leaderAt = event === 'finish' ? leader?.time_ms : leader?.laps?.length >= splits.length ? leader.laps.slice(0, splits.length).reduce((a, b) => a + b, 0) : null
        const gap = leaderAt ? time - leaderAt : null
        setLaps((l) => [...l, { ms: lapMs, gap }])
        if (event === 'lap') say(`${t('Lap {n}', { n: splits.length })}: ${secs(lapMs)}${gap !== null ? ` · ${gapText(gap)}` : ''}`, now, 2500)
        else setFinish({ time, gap })
      }
      if (msg && now > msgUntil) msg = null
      draw()
      setHud({ lap: c.lap, time, lapTime: time - splits.reduce((a, b) => a + b, 0), speed: c.v / sim.vmax, count: start === null ? 3 - Math.floor(sinceCount) : 0, msg })
      if (event === 'finish') {
        latest.current.onFinish(time, splits)
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
    // lets an automated test see where the car is (development only)
    if (import.meta.env.DEV) window.__drive = { c, samples }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', fit)
    }
    // only a different track or car starts the race over
  }, [trackId, car.id])

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

  const totalLaps = TRIAL_TRACKS[trackId].laps
  return (
    <div className="drive">
      <div className="drive__screen">
        <canvas ref={canvasRef} className="drive__canvas" />
        <div className="drive__hud">
          <span>
            {t('Lap')} {Math.min(hud.lap, totalLaps)}/{totalLaps}
          </span>
          <strong>{(hud.time / 1000).toFixed(2)}s</strong>
          <span className="drive__speed">
            <span style={{ width: `${Math.round(hud.speed * 100)}%` }} />
          </span>
        </div>
        {laps.length > 0 && !finish && (
          <ol className="drive__laps">
            {laps.map((l, i) => (
              <li key={i}>
                {t('Lap {n}', { n: i + 1 })} <b>{secs(l.ms)}</b>
                {l.gap !== null && <span className={l.gap > 0 ? 'is-behind' : 'is-ahead'}>{gapText(l.gap)}</span>}
              </li>
            ))}
            <li className="is-now">
              {t('Lap {n}', { n: laps.length + 1 })} <b>{secs(hud.lapTime)}</b>
            </li>
          </ol>
        )}
        {hud.count > 0 && <div className="drive__count">{hud.count}</div>}
        {hud.msg && hud.count <= 0 && !finish && <div className="drive__msg">{hud.msg}</div>}
        {!finish && (
          <button className="drive__quit" onClick={onQuit} aria-label={t('Stop')}>
            ×
          </button>
        )}
        {finish && (
          <div className="drive__finish">
            <div className="drive__finish-card">
              <h2>{t('Finished!')}</h2>
              <p className="drive__finish-time">{secs(finish.time)}</p>
              {!leader ? (
                <p className="drive__gap is-ahead">{t('First time on the board this week!')}</p>
              ) : finish.gap > 0 ? (
                <p className="drive__gap is-behind">
                  {leader.isMe ? t('{gap} behind your own record', { gap: secs(finish.gap) }) : t('{gap} behind first place (@{user})', { gap: secs(finish.gap), user: leader.name })}
                </p>
              ) : (
                <p className="drive__gap is-ahead">
                  {leader.isMe ? t('{gap} faster than your own record!', { gap: secs(-finish.gap) }) : t('{gap} faster than @{user}: you are first!', { gap: secs(-finish.gap), user: leader.name })}
                </p>
              )}
              <table className="drive__table">
                <tbody>
                  {laps.map((l, i) => (
                    <tr key={i} className={laps.length > 1 && l.ms === Math.min(...laps.map((x) => x.ms)) ? 'is-best' : ''}>
                      <td>{t('Lap {n}', { n: i + 1 })}</td>
                      <td>{secs(l.ms)}</td>
                      <td className={l.gap === null ? '' : l.gap > 0 ? 'is-behind' : 'is-ahead'}>{l.gap === null ? '' : gapText(l.gap)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!result ? (
                <p className="drive__saving">{t('Saving your time…')}</p>
              ) : result.error ? (
                <p className="drive__saving is-error">{t(result.error)}</p>
              ) : (
                <p className="drive__prize">
                  {MEDALS.find((m) => m.id === result.medal)?.icon || '🏁'}{' '}
                  {Number(result.reward) > 0 ? `+${euro(Number(result.reward))}` : t('No more prize money today')} · {t('#{rank} this week', { rank: result.rank })}
                </p>
              )}
              <button className="btn btn--primary" onClick={onQuit}>
                {t('Continue')}
              </button>
            </div>
          </div>
        )}
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
