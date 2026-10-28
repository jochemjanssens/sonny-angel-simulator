// The physics of the drive-yourself time trial, without any drawing, so it can
// also run in tests. The car's stats set how it handles:
//   speed  → top speed           accel  → how fast it pulls away
//   grip   → how fast it can corner without scrubbing off speed
//   weight → how much grass, walls and (light cars) landings slow it down
import { TRIAL_TRACKS, sampleTrack, topSpeed } from './trackGeometry.js'

// an angle difference brought back to -π…π
export const wrap = (d) => ((((d + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI

export function createSim(trackId, stats, random = Math.random) {
  const track = TRIAL_TRACKS[trackId]
  const { samples, total } = sampleTrack(track.points)
  const N = samples.length
  const half = track.width / 2
  const vmax = topSpeed(stats.speed)
  const accel = 90 + 28 * stats.accel
  const turnRate = 2.1 + 0.13 * stats.grip
  const gripLimit = 330 + 55 * stats.grip // how much turning at speed the tyres hold
  const jump = track.jump && { from: Math.floor(track.jump.from * N), to: Math.floor(track.jump.to * N), minSpeed: track.jump.minSpeed }

  const tangent = (i) => {
    const a = samples[(i + N) % N]
    const b = samples[(i + 1 + N) % N]
    return Math.atan2(b.y - a.y, b.x - a.x)
  }
  const c = { x: samples[0].x, y: samples[0].y, a: tangent(0), v: 0, idx: 0, lap: 1, half: false, air: 0, fallen: 0 }

  const nearest = () => {
    // search near the last known position, so the figure-eight crossing can't confuse it
    let best = c.idx
    let bestD = Infinity
    for (let k = -25; k <= 60; k++) {
      const i = (c.idx + k + N) % N
      const d = (samples[i].x - c.x) ** 2 + (samples[i].y - c.y) ** 2
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    return { i: best, d: Math.sqrt(bestD) }
  }

  // Moves the car on by dt seconds. Returns events: 'lap', 'finish', 'jump',
  // 'fell', 'bump' (bumpy landing) or null.
  function step(dt, inp) {
    if (c.fallen > 0) {
      // fell into the gap: back to a run-up before the ramp after a moment
      c.fallen -= dt
      if (c.fallen <= 0) {
        const i = jump.from - Math.floor(N * 0.12)
        Object.assign(c, { x: samples[i].x, y: samples[i].y, a: tangent(i), v: 0, idx: i })
      }
      return null
    }
    let event = null
    if (inp.gas) c.v += accel * dt
    else c.v -= 60 * dt
    if (inp.brake) c.v -= 420 * dt
    c.v = Math.max(0, Math.min(vmax, c.v))
    const steer = (inp.right ? 1 : 0) - (inp.left ? 1 : 0)
    if (!c.air && steer) {
      c.a += steer * turnRate * Math.min(1, c.v / 110) * dt
      // too fast for the grip: the tyres scrub off speed
      if (c.v * turnRate > gripLimit) c.v *= 1 - 1.4 * dt
    }
    c.x += Math.cos(c.a) * c.v * dt
    c.y += Math.sin(c.a) * c.v * dt

    const { i, d } = nearest()
    const prev = c.idx
    // a lap only counts once you've been past the halfway point
    if (i > N * 0.45 && i < N * 0.6) c.half = true
    if (c.half && prev > N * 0.9 && i < N * 0.1) {
      c.half = false
      if (c.lap >= track.laps) {
        c.idx = i
        return 'finish'
      }
      c.lap++
      event = 'lap'
    }
    c.idx = i

    if (jump) {
      if (c.air > 0) {
        c.air = Math.max(0, c.air - dt)
        if (c.air === 0 && stats.weight < 4 && random() < 0.35) {
          c.v *= 0.6
          event = 'bump'
        }
      } else if (prev < jump.from && i >= jump.from && i < jump.to) {
        if (c.v >= jump.minSpeed) {
          c.air = (samples[jump.to].len - samples[jump.from].len) / c.v
          event = 'jump'
        } else {
          c.fallen = 1.5
          event = 'fell'
        }
      }
    }

    // off the road: grass slows you down, canyon walls push you back
    if (!c.air && d > half) {
      const p = samples[i]
      if (track.walls) {
        const nx = (c.x - p.x) / d
        const ny = (c.y - p.y) / d
        c.x = p.x + nx * (half - 2)
        c.y = p.y + ny * (half - 2)
        c.v *= Math.max(0.3, 0.5 + stats.weight * 0.03)
        c.a += wrap(tangent(i) - c.a) * 0.3 // turn a bit along the wall
      } else {
        c.v = Math.min(c.v, 120 + stats.weight * 6)
        c.v *= 1 - (1.4 - stats.weight * 0.07) * dt
      }
    }
    return event
  }

  return { track, samples, total, N, car: c, vmax, jump, tangent, step }
}
