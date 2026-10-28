import { useId } from 'react'

// A Turbo Minis car, side view, facing right. Same 120×168 canvas as the other
// figures (so it fits every shelf and card); the car sits low, on the "floor".

const SIL = '#E4DAD3'
const SIL_DARK = '#CFC2B9'

function shade(hex, f = 0.3) {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v) => Math.round(f >= 0 ? v * (1 - f) : v + (255 - v) * -f)
  const [r, g, b] = [ch(n >> 16), ch((n >> 8) & 255), ch(n & 255)]
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

// Per body: the body outline, window(s), wheels [x, y, r] and extra bits.
const BODIES = {
  sports: {
    body: 'M8 134 L10 124 Q14 118 30 116 L48 113 L60 104 Q72 99 86 104 L102 114 Q113 118 114 126 L114 134 Z',
    windows: ['M58 112 L64 106 Q72 102 82 106 L90 113 Z'],
    wheels: [[30, 136, 10.5], [93, 136, 10.5]],
  },
  muscle: {
    body: 'M6 136 L6 122 Q8 117 18 117 L36 116 L46 104 L82 104 L92 116 L108 118 Q115 120 115 128 L115 136 Z',
    windows: ['M50 115 L56 108 L68 108 L68 115 Z', 'M72 115 L72 108 L80 108 L87 115 Z'],
    wheels: [[28, 136, 11], [94, 136, 11]],
  },
  retro: {
    body: 'M10 136 Q9 116 30 110 Q44 92 68 92 Q94 94 104 114 Q114 118 113 136 Z',
    windows: ['M42 110 Q50 98 66 98 L66 110 Z', 'M70 110 L70 98 Q88 100 94 110 Z'],
    wheels: [[32, 136, 10], [91, 136, 10]],
  },
  truck: {
    body: 'M8 120 L8 106 Q9 100 18 100 L44 100 L54 86 L84 86 L94 100 L110 102 Q114 104 114 110 L114 120 Z',
    windows: ['M58 99 L62 92 L72 92 L72 99 Z', 'M76 99 L76 92 L82 92 L88 99 Z'],
    wheels: [[29, 133, 17], [93, 133, 17]],
    chassis: true,
  },
  buggy: {
    body: 'M12 130 L22 118 L98 118 L110 130 Z',
    windows: [],
    wheels: [[28, 135, 14], [94, 135, 14]],
    cage: 'M34 118 L42 96 L76 96 L88 118 M42 96 L50 118 M76 96 L68 118',
  },
  van: {
    body: 'M8 136 L8 96 Q8 88 16 88 L84 88 Q94 88 100 100 L110 114 Q114 118 114 126 L114 136 Z',
    windows: ['M86 94 Q93 95 98 104 L104 113 L86 113 Z', 'M14 96 H32 V108 H14 Z', 'M38 96 H56 V108 H38 Z', 'M62 96 H80 V108 H62 Z'],
    wheels: [[28, 136, 11], [94, 136, 11]],
  },
  f1: {
    body: 'M8 131 L18 124 L58 122 L66 113 L84 113 L90 122 L112 126 L115 132 L8 133 Z',
    windows: [],
    wheels: [[24, 132, 11.5], [100, 132, 11.5]],
    f1: true,
  },
  rocket: {
    body: 'M14 130 Q12 117 30 115 L70 108 Q100 106 115 124 L115 131 L14 133 Z',
    windows: ['M62 112 Q74 106 92 110 L98 116 L64 117 Z'],
    wheels: [[32, 135, 10], [96, 135, 10]],
    rocket: true,
  },
}

function Pattern({ pattern, a, body }) {
  switch (pattern) {
    case 'flames':
      return (
        <path
          d="M114 124 C96 122 92 118 84 116 C90 121 82 122 74 119 C80 124 70 126 62 122 C66 128 56 128 48 126 C70 136 96 134 114 132 Z"
          fill={a}
        />
      )
    case 'stripes':
      return (
        <g fill={a}>
          <rect x="0" y="120" width="120" height="3.4" />
          <rect x="0" y="125.5" width="120" height="3.4" />
        </g>
      )
    case 'checker':
      return (
        <g fill={a}>
          {Array.from({ length: 30 }, (_, i) => (
            <rect key={i} x={i * 4} y={i % 2 ? 120 : 124} width="4" height="4" />
          ))}
        </g>
      )
    case 'number': {
      // a racing number roundel on the door
      const x = body === 'f1' ? 42 : body === 'buggy' ? 60 : 56
      return (
        <g>
          <circle cx={x} cy="125" r="6.5" fill="#FFFFFF" />
          <text x={x} y="128.4" textAnchor="middle" fontSize="9" fontWeight="800" fontFamily="Fredoka, sans-serif" fill={a}>
            7
          </text>
        </g>
      )
    }
    default:
      return null
  }
}

function Wheel({ x, y, r, rim, sil, knobby }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={sil ? SIL_DARK : '#25252B'} />
      {knobby && !sil && <circle cx={x} cy={y} r={r} fill="none" stroke="#3A3A42" strokeWidth="3" strokeDasharray="3 3" />}
      <circle cx={x} cy={y} r={r * 0.52} fill={sil ? SIL : rim} />
      {!sil && <circle cx={x} cy={y} r={r * 0.18} fill="#8A8A96" />}
    </g>
  )
}

export default function Car({ figure, silhouette = false, size = 120, className = '' }) {
  const uid = useId().replace(/:/g, '')
  const sil = silhouette
  const b = BODIES[figure.body] || BODIES.sports
  const col = sil ? SIL : figure.color
  const a = sil ? SIL_DARK : figure.accent
  const rim = figure.secret ? '#F4C430' : '#D7DAE0'
  const big = figure.body === 'truck'

  return (
    <svg
      className={`angel car ${sil ? 'is-sil' : ''} ${figure.secret && !sil ? 'angel--secret' : ''} ${className}`}
      viewBox="0 -14 120 168"
      width={size}
      height={(size * 168) / 120}
      role="img"
      aria-label={sil ? 'Unknown figure' : figure.name}
    >
      <defs>
        <linearGradient id={`paint-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sil ? SIL : shade(col, -0.35)} />
          <stop offset="0.55" stopColor={col} />
          <stop offset="1" stopColor={sil ? SIL : shade(col, 0.2)} />
        </linearGradient>
        <clipPath id={`body-${uid}`}>
          <path d={b.body} />
        </clipPath>
      </defs>

      {/* soft shadow on the floor */}
      <ellipse cx="60" cy="149" rx="52" ry="3.5" fill="#000" opacity="0.12" />

      {/* rocket flame and spoiler bits behind the body */}
      {b.rocket && !sil && (
        <g>
          <path d="M14 121 L0 124 L14 128 Z" fill="#FFD34D" />
          <path d="M14 122.5 L5 124.5 L14 126.5 Z" fill="#FF6A00" />
        </g>
      )}
      {b.f1 && (
        <g fill={sil ? SIL_DARK : a}>
          <rect x="6" y="110" width="14" height="4" rx="1.5" />
          <rect x="11" y="113" width="3" height="11" />
          <rect x="100" y="128" width="16" height="3" rx="1" />
        </g>
      )}
      {b.chassis && <rect x="20" y="118" width="82" height="8" rx="3" fill={sil ? SIL_DARK : '#4A4A55'} />}

      {/* the body with its paint job */}
      <path d={b.body} fill={`url(#paint-${uid})`} />
      {!sil && figure.pattern && (
        <g clipPath={`url(#body-${uid})`}>
          <Pattern pattern={figure.pattern} a={a} body={figure.body} />
        </g>
      )}
      {b.cage && <path d={b.cage} stroke={sil ? SIL_DARK : '#3A3A42'} strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      {b.windows.map((d, i) => (
        <path key={i} d={d} fill={sil ? SIL_DARK : '#BFE3F7'} opacity={sil ? 1 : 0.95} />
      ))}
      {!sil && b.windows[0] && <path d={b.windows[0]} fill="#FFFFFF" opacity="0.25" transform="translate(2 -1) scale(0.98)" />}
      {/* driver helmet in the open-wheel cars and the buggy */}
      {(b.f1 || b.cage) && (
        <g>
          <circle cx={b.f1 ? 75 : 60} cy={b.f1 ? 109 : 108} r={b.f1 ? 6.5 : 7} fill={sil ? SIL_DARK : a} />
          {!sil && <path d={b.f1 ? 'M76 106 h5.5 v4 h-5.5 Z' : 'M61 105 h6 v4.5 h-6 Z'} fill="#2B2B33" />}
        </g>
      )}

      {/* lights */}
      {!sil && !b.rocket && <ellipse cx="112" cy="124" rx="2.2" ry="2.6" fill="#FFF3B0" />}
      {!sil && <rect x="7" y="122" width="3" height="5" rx="1" fill="#FF5A5A" />}

      {b.wheels.map(([x, y, r], i) => (
        <Wheel key={i} x={x} y={y} r={r} rim={rim} sil={sil} knobby={big || figure.body === 'buggy'} />
      ))}

      {figure.secret && !sil && <ellipse cx="60" cy="78" rx="18" ry="4.5" fill="none" stroke="#F4B73B" strokeWidth="3" className="angel__halo" />}
      {sil && (
        <text x="60" y="126" textAnchor="middle" fontSize="22" fontFamily="Fredoka, sans-serif" fontWeight="700" fill="#fff">
          ?
        </text>
      )}
    </svg>
  )
}
