import { useId } from 'react'

const SKIN = '#FDE6D8'
const SKIN_SHADE = '#EDC4AE'
const LEAF = '#5DAA48'
const SIL = '#E4DAD3'
const SIL_DARK = '#D6CBC3'

// Hood geometry: circle centred at (60,58) with r=40. Face at (60,66) r=27.

function BackFeature({ hat, c, a, sil }) {
  const p = sil ? SIL_DARK : a
  switch (hat) {
    case 'longEars':
      return (
        <g>
          <path d="M36 30 C29 12 33 -4 42 -8 C50 -4 55 12 53 30 Z" fill={c} />
          <path d="M40 25 C36 12 38 1 43 -2 C48 1 50 12 49 25 Z" fill={p} />
          <path d="M84 30 C91 12 87 -4 78 -8 C70 -4 65 12 67 30 Z" fill={c} />
          <path d="M80 25 C84 12 82 1 77 -2 C72 1 70 12 71 25 Z" fill={p} />
        </g>
      )
    case 'roundEars':
      return (
        <g>
          <circle cx="27" cy="28" r="14" fill={c} />
          <circle cx="27" cy="28" r="7" fill={p} />
          <circle cx="93" cy="28" r="14" fill={c} />
          <circle cx="93" cy="28" r="7" fill={p} />
        </g>
      )
    case 'pointyEars':
      return (
        <g strokeLinejoin="round">
          <path d="M24 44 L28 4 L54 22 Z" fill={c} stroke={c} strokeWidth="6" />
          <path d="M31 34 L33 14 L46 24 Z" fill={p} />
          <path d="M96 44 L92 4 L66 22 Z" fill={c} stroke={c} strokeWidth="6" />
          <path d="M89 34 L87 14 L74 24 Z" fill={p} />
        </g>
      )
    case 'bigEars':
      return (
        <g>
          <ellipse cx="18" cy="54" rx="17" ry="21" fill={c} />
          <ellipse cx="19" cy="55" rx="9" ry="13" fill={p} />
          <ellipse cx="102" cy="54" rx="17" ry="21" fill={c} />
          <ellipse cx="101" cy="55" rx="9" ry="13" fill={p} />
        </g>
      )
    case 'horns':
      return (
        <g fill={sil ? SIL_DARK : '#E8C99A'}>
          <ellipse cx="38" cy="18" rx="5" ry="12" transform="rotate(-30 38 18)" />
          <ellipse cx="82" cy="18" rx="5" ry="12" transform="rotate(30 82 18)" />
        </g>
      )
    case 'mane':
      return (
        <g fill={p}>
          {Array.from({ length: 16 }, (_, i) => {
            const t = (i / 16) * Math.PI * 2
            return <circle key={i} cx={60 + Math.cos(t) * 41} cy={58 + Math.sin(t) * 41} r="10" />
          })}
        </g>
      )
    case 'fluffy':
      return (
        <g fill={c} stroke="rgba(0,0,0,0.06)" strokeWidth="1">
          {Array.from({ length: 9 }, (_, i) => {
            const t = Math.PI + (i / 8) * Math.PI
            return <circle key={i} cx={60 + Math.cos(t) * 37} cy={58 + Math.sin(t) * 37} r="12" />
          })}
        </g>
      )
    case 'petals':
      return (
        <g fill={c} stroke="rgba(0,0,0,0.06)" strokeWidth="1">
          {Array.from({ length: 10 }, (_, i) => {
            const deg = (i / 10) * 360
            return (
              <ellipse key={i} cx="60" cy="14" rx="12" ry="16" transform={`rotate(${deg} 60 58)`} />
            )
          })}
        </g>
      )
    case 'antlers':
      return (
        <g stroke={sil ? SIL_DARK : '#7A4A24'} strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M40 24 L28 2 M33 12 L20 10 M30 6 L36 -2" />
          <path d="M80 24 L92 2 M87 12 L100 10 M90 6 L84 -2" />
        </g>
      )
    case 'santa':
      return <path d="M34 30 Q70 -16 104 22 L96 34 Z" fill={c} />
    default:
      return null
  }
}

function FrontFeature({ hat, c, a, sil }) {
  const leaf = sil ? SIL_DARK : LEAF
  switch (hat) {
    case 'leaf':
      return (
        <g>
          <rect x="58.5" y="6" width="3.5" height="16" rx="1.5" fill={sil ? SIL_DARK : '#6B4A2B'} />
          <ellipse cx="70" cy="11" rx="10" ry="5" fill={sil ? SIL_DARK : a} transform="rotate(-25 70 11)" />
        </g>
      )
    case 'sprout':
      return (
        <g fill={sil ? SIL_DARK : a}>
          <ellipse cx="50" cy="12" rx="5" ry="13" transform="rotate(-30 50 12)" />
          <ellipse cx="60" cy="7" rx="5" ry="14" />
          <ellipse cx="70" cy="12" rx="5" ry="13" transform="rotate(30 70 12)" />
        </g>
      )
    case 'stem':
      return (
        <g>
          <path d="M60 20 Q60 4 72 0" stroke={sil ? SIL_DARK : '#6B4A2B'} strokeWidth="4" fill="none" strokeLinecap="round" />
          <ellipse cx="52" cy="10" rx="7" ry="4" fill={leaf} transform="rotate(20 52 10)" />
        </g>
      )
    case 'fin':
      return <path d="M46 22 Q58 -10 78 20 Z" fill={sil ? SIL_DARK : a} />
    case 'star':
      return <path d={starPath(60, 10, 11, 5)} fill={sil ? SIL_DARK : '#FFD34D'} stroke={sil ? 'none' : '#F0B400'} strokeWidth="1.5" strokeLinejoin="round" />
    case 'heart':
      return (
        <path
          d="M60 22 C44 12 46 -2 55 0 C58 0.5 60 3 60 5 C60 3 62 0.5 65 0 C74 -2 76 12 60 22 Z"
          fill={sil ? SIL_DARK : a}
        />
      )
    case 'cream':
      return (
        <g>
          <g fill={sil ? SIL_DARK : a} stroke="rgba(0,0,0,0.06)">
            <circle cx="44" cy="25" r="11" />
            <circle cx="76" cy="25" r="11" />
            <circle cx="60" cy="18" r="13" />
          </g>
          <circle cx="60" cy="3" r="6" fill={sil ? SIL_DARK : '#E5343A'} />
        </g>
      )
    case 'tuft':
      return (
        <path
          d="M60 20 Q54 6 60 2 M60 20 Q66 8 74 8 M60 20 Q52 12 46 12"
          stroke={sil ? SIL_DARK : a}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      )
    case 'santa':
      return <circle cx="100" cy="30" r="8" fill={sil ? SIL_DARK : '#FFFFFF'} />
    case 'floppyEars':
      return (
        <g fill={sil ? SIL_DARK : a}>
          <ellipse cx="22" cy="62" rx="10" ry="21" transform="rotate(14 22 62)" />
          <ellipse cx="98" cy="62" rx="10" ry="21" transform="rotate(-14 98 62)" />
        </g>
      )
    default:
      return null
  }
}

function starPath(cx, cy, R, r) {
  let d = ''
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r : R
    const t = -Math.PI / 2 + (i * Math.PI) / 5
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(t) * rad).toFixed(1)} ${(cy + Math.sin(t) * rad).toFixed(1)} `
  }
  return d + 'Z'
}

function Pattern({ pattern, a }) {
  switch (pattern) {
    case 'spots':
      return (
        <g fill={a}>
          <circle cx="32" cy="38" r="6" />
          <circle cx="50" cy="24" r="4.5" />
          <circle cx="78" cy="26" r="6.5" />
          <circle cx="92" cy="48" r="5" />
          <circle cx="26" cy="62" r="4" />
          <circle cx="94" cy="72" r="4.5" />
          <circle cx="64" cy="20" r="3" />
        </g>
      )
    case 'stripes':
      return (
        <g stroke={a} strokeWidth="5" strokeLinecap="round">
          <path d="M34 24 l8 12 M52 16 l2 12 M68 16 l-2 12 M86 24 l-8 12 M22 48 l12 4 M98 48 l-12 4" />
        </g>
      )
    case 'seeds':
      return (
        <g fill={a}>
          {[[34, 36], [46, 24], [60, 22], [74, 24], [86, 36], [28, 54], [92, 54], [40, 34], [80, 34], [26, 72], [94, 72]].map(
            ([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="1.8" ry="2.8" />,
          )}
        </g>
      )
    case 'net':
      return (
        <g stroke={a} strokeWidth="1.6" fill="none" opacity="0.9">
          <path d="M20 30 L90 100 M30 18 L100 88 M44 14 L104 74 M16 48 L76 108 M100 30 L30 100 M90 18 L20 88 M76 14 L16 74 M104 48 L44 108" />
        </g>
      )
    case 'sprinkles':
      return (
        <g strokeWidth="3.4" strokeLinecap="round">
          {[
            [34, 34, 40, 30, '#FF6F91'],
            [50, 22, 56, 24, '#6EC6FF'],
            [70, 20, 74, 26, '#FFD34D'],
            [84, 32, 90, 30, '#7ED957'],
            [26, 54, 28, 60, '#B39DDB'],
            [92, 56, 96, 52, '#FF6F91'],
            [42, 40, 46, 36, '#FFD34D'],
            [78, 38, 82, 42, '#6EC6FF'],
          ].map(([x1, y1, x2, y2, col], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} />
          ))}
        </g>
      )
    case 'band':
      return <rect x="10" y="34" width="100" height="9" fill={a} />
    default:
      return null
  }
}

export default function Angel({ figure, silhouette = false, size = 120, className = '', showHalo = true }) {
  const uid = useId().replace(/:/g, '')
  const sil = silhouette
  const { hat, pattern, secret } = figure
  const c = sil ? SIL : figure.color
  const a = figure.accent
  const skin = sil ? SIL : SKIN
  const skinShade = sil ? SIL_DARK : SKIN_SHADE
  const hoodFill = sil ? SIL : hat === 'petals' ? a : secret ? `url(#gold-${uid})` : c

  return (
    <svg
      className={`angel ${secret && !sil ? 'angel--secret' : ''} ${className}`}
      viewBox="0 -14 120 168"
      width={size}
      height={(size * 168) / 120}
      role="img"
      aria-label={sil ? 'Unknown figure' : figure.name}
    >
      <defs>
        <clipPath id={`hood-${uid}`}>
          <circle cx="60" cy="58" r="40" />
        </clipPath>
        <linearGradient id={`gold-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF6C9" />
          <stop offset="0.45" stopColor={figure.color} />
          <stop offset="1" stopColor="#F4B73B" />
        </linearGradient>
        <radialGradient id={`shine-${uid}`} cx="0.35" cy="0.3" r="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* body: long standing toddler — arms angled out with flat little hands */}
      <g fill={skin} stroke={sil ? 'none' : skinShade} strokeWidth="1" strokeLinejoin="round">
        <path d="M49 92 C43 99 34 106 25 112 C21 115 23 119 28 118 C35 116 44 110 50 104 Z" />
        <path d="M71 92 C77 99 86 106 95 112 C99 115 97 119 92 118 C85 116 76 110 70 104 Z" />
        <path d="M48 117 C47 129 48 141 49 149 C49.5 153 58.5 153 59 149 C59.6 139 59.8 128 60 120 Z" />
        <path d="M72 117 C73 129 72 141 71 149 C70.5 153 61.5 153 61 149 C60.4 139 60.2 128 60 120 Z" />
        <path d="M47 88 C43 100 43 113 48 121 C54 126 66 126 72 121 C77 113 77 100 73 88 Z" />
      </g>
      {!sil && <ellipse cx="60" cy="110" rx="1.2" ry="1.6" fill={skinShade} />}

      {/* halo for secrets */}
      {secret && showHalo && !sil && (
        <ellipse cx="60" cy="-8" rx="18" ry="4.5" fill="none" stroke="#F4B73B" strokeWidth="3" className="angel__halo" />
      )}

      {/* headgear: features are authored on a r=40 circle at (60,58), squeezed into a tall egg */}
      <g transform="translate(60 48) scale(0.825 0.925) translate(-60 -58)">
        <BackFeature hat={hat} c={c} a={a} sil={sil} />
        <circle cx="60" cy="58" r="40" fill={hoodFill} stroke="rgba(60,30,20,0.08)" strokeWidth="1.5" />
        {!sil && pattern && (
          <g clipPath={`url(#hood-${uid})`}>
            <Pattern pattern={pattern} a={a} />
          </g>
        )}
        {!sil && <circle cx="60" cy="58" r="40" fill={`url(#shine-${uid})`} />}
        <FrontFeature hat={hat} c={c} a={a} sil={sil} />
      </g>
      {hat === 'santa' && <ellipse cx="60" cy="61" rx="28.5" ry="31" fill={sil ? SIL_DARK : '#FFFFFF'} />}

      {/* face: big oval, chin at the bottom of the head */}
      <ellipse cx="60" cy="61" rx="25" ry="28" fill={skin} />
      {!sil ? (
        <g>
          {/* tiny eyebrow dots high on the forehead */}
          <ellipse cx="51.5" cy="48" rx="1.6" ry="1" fill="#A0684A" />
          <ellipse cx="68.5" cy="48" rx="1.6" ry="1" fill="#A0684A" />
          {/* big glossy eyes, glancing to the side, with lashes */}
          <ellipse cx="51" cy="63" rx="4.6" ry="5" fill="#1E1416" />
          <ellipse cx="69" cy="63" rx="4.6" ry="5" fill="#1E1416" />
          <circle cx="52.9" cy="61.4" r="1.5" fill="#fff" />
          <circle cx="70.9" cy="61.4" r="1.5" fill="#fff" />
          <path d="M46.6 61 L44.4 59.4 M46.4 62.8 L44 62.2" stroke="#1E1416" strokeWidth="0.9" strokeLinecap="round" />
          <path d="M73.4 61 L75.6 59.4 M73.6 62.8 L76 62.2" stroke="#1E1416" strokeWidth="0.9" strokeLinecap="round" />
          {/* little nose bump, soft blush and a pink smile */}
          <ellipse cx="60" cy="71" rx="2.6" ry="1.8" fill={skinShade} opacity="0.55" />
          <ellipse cx="45" cy="72" rx="4.5" ry="2.6" fill="#F7A8B8" opacity="0.3" />
          <ellipse cx="75" cy="72" rx="4.5" ry="2.6" fill="#F7A8B8" opacity="0.3" />
          <path d="M56 77.5 Q60 80.5 64 77.5" stroke="#EB8E9C" strokeWidth="1.7" fill="none" strokeLinecap="round" />
        </g>
      ) : (
        <text x="60" y="71" textAnchor="middle" fontSize="26" fontFamily="Fredoka, sans-serif" fontWeight="700" fill="#fff">
          ?
        </text>
      )}
    </svg>
  )
}
