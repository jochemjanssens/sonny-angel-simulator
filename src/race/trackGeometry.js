// Top-down circuits for the time trial (drive-yourself) races, in world units.
// Each track is a closed centre line through control points, smoothed with a
// Catmull-Rom spline. Shared by the game and the catalog script (which works
// out the fastest possible time per track for the server's sanity check).

export const TRIAL_TRACKS = {
  // a wide, fast oval: pure speed
  drag: {
    laps: 2,
    width: 130,
    ground: '#7DBB5A',
    points: [[220, 170], [980, 170], [1120, 260], [1120, 540], [980, 630], [220, 630], [80, 540], [80, 260]],
  },
  // narrow and twisty, with canyon walls instead of grass
  canyon: {
    laps: 2,
    width: 92,
    ground: '#B5714A',
    walls: true,
    points: [
      [160, 150], [460, 120], [560, 250], [420, 340], [520, 450], [760, 400], [820, 220], [1060, 170],
      [1110, 420], [920, 520], [1060, 660], [720, 720], [600, 580], [400, 690], [150, 630], [270, 430], [120, 330],
    ],
  },
  // right-angle corners between the buildings
  city: {
    laps: 2,
    width: 100,
    ground: '#A7AFBA',
    walls: true,
    wallColor: '#5E6673',
    points: [
      [150, 150], [600, 150], [640, 180], [640, 330], [680, 360], [1050, 360], [1080, 400], [1080, 650],
      [1050, 680], [500, 680], [460, 650], [460, 520], [420, 490], [180, 490], [150, 460],
    ],
  },
  // long flowing bends along the beach; the sand slows you down
  beach: {
    laps: 2,
    width: 115,
    ground: '#F2D9A0',
    points: [[200, 250], [450, 140], [750, 200], [1000, 150], [1120, 330], [980, 480], [1050, 650], [800, 700], [560, 600], [350, 700], [150, 580], [230, 420]],
  },
  // packed snow: less grip, so brake before the bends
  snow: {
    laps: 2,
    width: 110,
    ground: '#EEF4F9',
    road: '#56607A',
    grip: 0.7,
    points: [[160, 200], [420, 120], [620, 260], [820, 120], [1080, 220], [1000, 420], [1100, 600], [860, 690], [640, 560], [420, 690], [180, 620], [300, 420]],
  },
  // a zigzag of hairpins between the hedges, back up along the side
  forest: {
    laps: 1,
    width: 76,
    ground: '#4E8A3E',
    walls: true,
    wallColor: '#2F5E2A',
    points: [
      [220, 120], [1000, 120], [1090, 190], [1000, 260], [320, 260], [240, 330], [320, 400], [1000, 400], [1090, 470],
      [1000, 540], [320, 540], [240, 610], [320, 680], [1050, 680], [1120, 760], [1020, 830], [130, 830], [60, 740],
      [60, 200], [120, 130],
    ],
  },
}

// Samples the closed Catmull-Rom spline: [{ x, y, len }] with cumulative length.
export function sampleTrack(points, perSegment = 24) {
  const n = points.length
  const out = []
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]
    for (let k = 0; k < perSegment; k++) {
      const t = k / perSegment
      const t2 = t * t
      const t3 = t2 * t
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push({ x: f(p0[0], p1[0], p2[0], p3[0]), y: f(p0[1], p1[1], p2[1], p3[1]) })
    }
  }
  let len = 0
  out.forEach((p, i) => {
    if (i) len += Math.hypot(p.x - out[i - 1].x, p.y - out[i - 1].y)
    p.len = len
  })
  const last = out[out.length - 1]
  const total = len + Math.hypot(out[0].x - last.x, out[0].y - last.y)
  return { samples: out, total }
}

// Top speed (world units per second) for a speed stat; the same formula the game uses.
export const topSpeed = (speed) => 200 + 22 * speed

// The fastest time anyone could possibly drive (a perfect lap at the highest top
// speed, with a margin): the server refuses times below this.
export function minTimeMs(trackId) {
  const tr = TRIAL_TRACKS[trackId]
  const { total } = sampleTrack(tr.points)
  return Math.floor(((total * tr.laps) / topSpeed(10)) * 1000 * 0.8)
}
