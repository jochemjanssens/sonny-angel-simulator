import { useId } from 'react'

// A Smiski-style figure: a small, smooth, glow-in-the-dark character with a big
// round head, tiny dot eyes and no mouth, in one of a few poses with a prop.
// Same 120×168 canvas as the Sonny Angel figures, so it drops in everywhere.

const SIL = '#E4DAD3'
const SIL_DARK = '#CFC2B9'
const GLOW = '#D6FF7A'

function shade(hex, f = 0.3) {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v) => Math.round(f >= 0 ? v * (1 - f) : v + (255 - v) * -f)
  const [r, g, b] = [ch(n >> 16), ch((n >> 8) & 255), ch(n & 255)]
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

// Body parts per pose: limbs are thick round lines, head and torso ellipses.
// `back` limbs are drawn behind the head, `front` ones on top.
// hold: where a held prop goes; head: head centre (for hats and towels).
const POSES = {
  stand: {
    head: [60, 50],
    torso: [60, 100, 17, 24],
    back: [],
    limbs: [[52, 118, 51, 146, 11], [68, 118, 69, 146, 11], [45, 88, 36, 112, 9], [75, 88, 84, 112, 9]],
    hold: [88, 112],
    hands: [[36, 112], [84, 112]],
  },
  sit: {
    head: [60, 62],
    torso: [60, 108, 18, 20],
    back: [],
    limbs: [[50, 122, 46, 140, 12], [70, 122, 74, 140, 12], [44, 98, 40, 122, 9], [76, 98, 80, 122, 9]],
    feet: [[45, 144, 8, 5], [75, 144, 8, 5]],
    hold: [60, 122],
  },
  hug: {
    head: [60, 56],
    torso: [60, 106, 20, 20],
    back: [],
    limbs: [[50, 110, 48, 138, 12], [70, 110, 72, 138, 12]],
    knees: [[50, 102, 13], [70, 102, 13]],
    arms: [[41, 88, 57, 104, 9], [79, 88, 63, 104, 9]],
    feet: [[47, 142, 9, 6], [73, 142, 9, 6]],
    hold: [60, 112],
  },
  lying: {
    head: [50, 96],
    body: [66, 128, 36, 13],
    back: [[86, 124, 98, 100, 10], [94, 126, 108, 104, 10]],
    limbs: [[36, 116, 28, 138, 9], [62, 118, 70, 140, 9]],
    hold: [48, 140],
  },
  stretch: {
    head: [60, 52],
    torso: [60, 102, 17, 24],
    // arms up and out in a wide V, beside the head
    back: [[47, 88, 26, 46, 9], [73, 88, 94, 46, 9], [26, 46, 14, 22, 9], [94, 46, 106, 22, 9]],
    limbs: [[52, 120, 51, 147, 11], [68, 120, 69, 147, 11]],
    hold: [60, 12],
  },
  carry: {
    head: [60, 56],
    torso: [60, 104, 17, 24],
    // elbows out, hands up to the thing on top of the head
    back: [[47, 90, 26, 54, 9], [73, 90, 94, 54, 9], [26, 54, 40, 18, 9], [94, 54, 80, 18, 9]],
    limbs: [[52, 122, 51, 148, 11], [68, 122, 69, 148, 11]],
    hold: [60, 12],
  },
  peek: {
    head: [60, 52],
    torso: [60, 104, 17, 24],
    back: [],
    limbs: [],
    hands: [[42, 86], [78, 86]],
    hold: [60, 120],
  },
}

// Everything that makes up the body, in one fill (drawn several times for the glow).
function BodyShapes({ pose, fill }) {
  const p = POSES[pose] || POSES.stand
  const line = ([x1, y1, x2, y2, w], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={fill} strokeWidth={w} strokeLinecap="round" />
  return (
    <g fill={fill}>
      {p.back.map(line)}
      {p.torso && <ellipse cx={p.torso[0]} cy={p.torso[1]} rx={p.torso[2]} ry={p.torso[3]} />}
      {p.body && <ellipse cx={p.body[0]} cy={p.body[1]} rx={p.body[2]} ry={p.body[3]} />}
      {p.limbs.map(line)}
      {p.feet?.map(([x, y, rx, ry], i) => <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} />)}
      {p.knees?.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}
      {p.arms?.map(line)}
      {/* the big round head, a little wider than tall */}
      <ellipse cx={p.head[0]} cy={p.head[1]} rx="31" ry="29" />
    </g>
  )
}

const star = (cx, cy, R, r) => {
  let d = ''
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r : R
    const t = -Math.PI / 2 + (i * Math.PI) / 5
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(t) * rad).toFixed(1)} ${(cy + Math.sin(t) * rad).toFixed(1)} `
  }
  return d + 'Z'
}

// Small things a figure holds, centred on (x, y).
function Held({ prop, a, x, y }) {
  switch (prop) {
    case 'book':
      return (
        <g transform={`translate(${x} ${y}) rotate(-8)`}>
          <rect x="-14" y="-9" width="28" height="18" rx="2" fill={a} />
          <rect x="-12" y="-7" width="11" height="14" fill="#FFFFFF" />
          <rect x="1" y="-7" width="11" height="14" fill="#FFFFFF" />
          <path d="M-10 -3 H-3 M-10 1 H-3 M3 -3 H10 M3 1 H10" stroke="#C9C2BA" strokeWidth="1" />
        </g>
      )
    case 'box':
      return (
        <g>
          <rect x={x - 17} y={y - 13} width="34" height="24" rx="2" fill={a} />
          <rect x={x - 17} y={y - 13} width="34" height="6" fill={shade(a, 0.15)} />
          <rect x={x - 3} y={y - 13} width="6" height="24" fill="#F4E6CF" opacity="0.8" />
        </g>
      )
    case 'ball':
      return (
        <g>
          <circle cx={x} cy={y} r="12" fill={a} />
          <circle cx={x - 4} cy={y - 4} r="3.5" fill="#FFFFFF" opacity="0.7" />
        </g>
      )
    case 'teddy':
      return (
        <g fill={a}>
          <circle cx={x - 7} cy={y - 14} r="4" />
          <circle cx={x + 7} cy={y - 14} r="4" />
          <circle cx={x} cy={y - 8} r="9" />
          <ellipse cx={x} cy={y + 6} rx="10" ry="9" />
          <circle cx={x - 3} cy={y - 9} r="1.3" fill="#2B2B2B" />
          <circle cx={x + 3} cy={y - 9} r="1.3" fill="#2B2B2B" />
          <ellipse cx={x} cy={y - 5} rx="3" ry="2" fill={shade(a, -0.4)} />
        </g>
      )
    case 'bottle':
      return (
        <g>
          <rect x={x - 6} y={y - 12} width="12" height="24" rx="4" fill={a} />
          <rect x={x - 3} y={y - 17} width="6" height="6" rx="1.5" fill="#FFFFFF" />
          <rect x={x - 6} y={y - 3} width="12" height="7" fill="#FFFFFF" opacity="0.6" />
        </g>
      )
    case 'duck':
      return (
        <g>
          <ellipse cx={x} cy={y + 3} rx="13" ry="8" fill={a} />
          <circle cx={x + 6} cy={y - 7} r="7" fill={a} />
          <path d={`M${x + 12} ${y - 7} l7 1.5 l-7 2.5 Z`} fill="#FF8C2E" />
          <circle cx={x + 8} cy={y - 9} r="1.3" fill="#2B2B2B" />
        </g>
      )
    case 'brush':
      return (
        <g transform={`translate(${x} ${y}) rotate(-35)`}>
          <rect x="-2.5" y="-4" width="5" height="22" rx="2.5" fill={shade(a, 0.25)} />
          <rect x="-8" y="-14" width="16" height="10" rx="4" fill={a} />
          <path d="M-6 -14 V-18 M-2 -14 V-18 M2 -14 V-18 M6 -14 V-18" stroke="#FFFFFF" strokeWidth="1.4" />
        </g>
      )
    case 'dumbbell':
      return (
        <g>
          <rect x={x - 24} y={y - 2} width="48" height="4" rx="2" fill="#9A9AA8" />
          <rect x={x - 30} y={y - 9} width="8" height="18" rx="2" fill={a} />
          <rect x={x + 22} y={y - 9} width="8" height="18" rx="2" fill={a} />
        </g>
      )
    case 'star':
      return <path d={star(x, y, 13, 6)} fill={a} strokeLinejoin="round" />
    case 'moon':
      return <path d={`M${x + 4} ${y - 13} A13 13 0 1 0 ${x + 4} ${y + 13} A10 10 0 1 1 ${x + 4} ${y - 13} Z`} fill={a} />
    case 'trophy':
      return (
        <g fill={a}>
          <path d={`M${x - 11} ${y - 12} H${x + 11} V${y - 4} A11 11 0 0 1 ${x - 11} ${y - 4} Z`} />
          <rect x={x - 2.5} y={y + 5} width="5" height="6" />
          <rect x={x - 8} y={y + 10} width="16" height="4" rx="1.5" />
          <path d={`M${x - 11} ${y - 9} h-4 a4 4 0 0 0 4 6 M${x + 11} ${y - 9} h4 a4 4 0 0 1 -4 6`} fill="none" stroke={a} strokeWidth="2" />
        </g>
      )
    case 'sheep':
      return (
        <g>
          {[[-7, -2], [0, -5], [7, -2], [-5, 4], [5, 4], [0, 2]].map(([dx, dy], i) => (
            <circle key={i} cx={x + dx} cy={y + dy} r="6" fill={a} stroke="#E6E1DA" strokeWidth="0.8" />
          ))}
          <ellipse cx={x - 11} cy={y} rx="4" ry="5" fill="#4A4040" />
        </g>
      )
    default:
      return null
  }
}

const HELD = new Set(['book', 'box', 'ball', 'teddy', 'bottle', 'duck', 'brush', 'dumbbell', 'star', 'moon', 'trophy', 'sheep'])

// Props behind the figure (mat on the floor, pillow, the back of a hula hoop).
function PropBack({ prop, a, pose }) {
  if (prop === 'mat') {
    return pose === 'lying' ? (
      <rect x="8" y="132" width="110" height="12" rx="5" fill={a} />
    ) : (
      <rect x="10" y="144" width="100" height="9" rx="4" fill={a} />
    )
  }
  if (prop === 'pillow') return <rect x="14" y="112" width="74" height="24" rx="12" fill={a} />
  if (prop === 'hoop') return <path d="M26 106 A34 9 0 0 1 94 106" fill="none" stroke={a} strokeWidth="4" />
  if (prop === 'rope') return <path d="M36 112 C30 70 90 70 84 112" fill="none" stroke={a} strokeWidth="2.2" opacity="0.9" />
  return null
}

// Props in front of the figure.
function PropFront({ prop, a, pose }) {
  const p = POSES[pose] || POSES.stand
  const [hx, hy] = p.head
  if (HELD.has(prop)) return <Held prop={prop} a={a} x={p.hold[0]} y={p.hold[1]} />
  switch (prop) {
    case 'towel':
      // folded over the top of the head
      return (
        <g>
          <path d={`M${hx - 33} ${hy - 4} C${hx - 32} ${hy - 38} ${hx + 32} ${hy - 38} ${hx + 33} ${hy - 4} L${hx + 30} ${hy + 8} C${hx + 20} ${hy - 14} ${hx - 20} ${hy - 14} ${hx - 30} ${hy + 8} Z`} fill={a} />
          <path d={`M${hx - 30} ${hy - 12} C${hx - 14} ${hy - 26} ${hx + 14} ${hy - 26} ${hx + 30} ${hy - 12}`} stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.7" />
        </g>
      )
    case 'nightcap':
      return (
        <g>
          <path d={`M${hx - 27} ${hy - 14} C${hx - 14} ${hy - 50} ${hx + 26} ${hy - 52} ${hx + 40} ${hy - 30} L${hx + 27} ${hy - 14} Z`} fill={a} />
          <path d={`M${hx - 29} ${hy - 12} Q${hx} ${hy - 22} ${hx + 29} ${hy - 12}`} stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" fill="none" />
          <circle cx={hx + 41} cy={hy - 29} r="5" fill="#FFFFFF" />
        </g>
      )
    case 'hoop':
      return <path d="M26 106 A34 9 0 0 0 94 106" fill="none" stroke={a} strokeWidth="4" />
    case 'rope':
      return <path d="M36 112 C34 150 86 150 84 112" fill="none" stroke={a} strokeWidth="2.2" />
    case 'wall':
      return (
        <g>
          <rect x="12" y="80" width="96" height="72" rx="4" fill={a} />
          <path d="M12 98 H108 M12 116 H108 M12 134 H108 M40 80 V98 M80 80 V98 M26 98 V116 M60 98 V116 M94 98 V116 M40 116 V134 M80 116 V134 M26 134 V152 M60 134 V152 M94 134 V152" stroke={shade(a, 0.15)} strokeWidth="1.5" />
        </g>
      )
    case 'blanket':
      return (
        <g>
          <path d="M8 84 Q34 76 60 84 T112 84 V152 H8 Z" fill={a} />
          {[[24, 100], [52, 112], [84, 98], [36, 132], [72, 136], [98, 124]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill="#FFFFFF" opacity="0.75" />
          ))}
        </g>
      )
    case 'bubbles':
      return (
        <g fill="#FFFFFF" stroke={a} strokeWidth="1.5">
          {[[22, 120, 16], [46, 104, 15], [74, 106, 16], [98, 122, 15], [36, 138, 15], [62, 132, 18], [88, 142, 14], [60, 96, 10]].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} />
          ))}
        </g>
      )
    default:
      return null
  }
}

export default function Smiski({ figure, silhouette = false, size = 120, className = '' }) {
  const uid = useId().replace(/:/g, '')
  const sil = silhouette
  const pose = POSES[figure.pose] ? figure.pose : 'stand'
  const p = POSES[pose]
  const body = sil ? SIL : `url(#sk-${uid})`
  const a = sil ? SIL_DARK : figure.accent
  const [hx, hy] = p.head
  const covered = ['wall', 'blanket', 'bubbles'].includes(figure.prop)

  return (
    <svg
      className={`angel smiski ${sil ? 'is-sil' : ''} ${figure.secret && !sil ? 'angel--secret' : ''} ${className}`}
      viewBox="0 -14 120 168"
      width={size}
      height={(size * 168) / 120}
      role="img"
      aria-label={sil ? 'Unknown figure' : figure.name}
    >
      <defs>
        <radialGradient id={`sk-${uid}`} gradientUnits="userSpaceOnUse" cx="46" cy="36" r="120">
          <stop offset="0" stopColor={shade(figure.color, -0.5)} />
          <stop offset="0.5" stopColor={figure.color} />
          <stop offset="1" stopColor={shade(figure.color, 0.12)} />
        </radialGradient>
        <filter id={`glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* glow-in-the-dark halo, only visible in dark mode */}
      {!sil && (
        <g className="smiski__halo" filter={`url(#glow-${uid})`}>
          <BodyShapes pose={pose} fill={GLOW} />
        </g>
      )}

      {!sil && <PropBack prop={figure.prop} a={a} pose={pose} />}
      <BodyShapes pose={pose} fill={body} />
      {/* in the dark the body itself lights up */}
      {!sil && (
        <g className="smiski__tint">
          <BodyShapes pose={pose} fill={GLOW} />
        </g>
      )}

      {sil ? (
        <text x={hx} y={hy + 9} textAnchor="middle" fontSize="26" fontFamily="Fredoka, sans-serif" fontWeight="700" fill="#fff">
          ?
        </text>
      ) : (
        <g fill="#2B2626">
          {/* tiny dot eyes, no mouth */}
          <ellipse cx={hx - 9} cy={hy + 4} rx="2.4" ry="3" />
          <ellipse cx={hx + 9} cy={hy + 4} rx="2.4" ry="3" />
        </g>
      )}

      {!sil && <PropFront prop={figure.prop} a={a} pose={pose} />}
      {/* hands holding on to whatever they hide behind */}
      {!sil && covered &&
        p.hands?.map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="6" ry="5" fill={body} className="smiski__hand" />)}
      {figure.secret && !sil && (
        // halo above the head, or above whatever is held up there
        <ellipse cx={hx} cy={Math.min(hy - 38, p.hold[1] - 20)} rx="16" ry="4" fill="none" stroke="#F4B73B" strokeWidth="3" className="angel__halo" />
      )}
    </svg>
  )
}
