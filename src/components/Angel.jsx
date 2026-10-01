import { useId } from 'react'

const SKIN = '#FCE1CC'
const SKIN_SHADE = '#F5CDB2'
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
          <ellipse cx="45" cy="14" rx="10" ry="25" fill={c} transform="rotate(-14 45 14)" />
          <ellipse cx="45" cy="16" rx="4.5" ry="17" fill={p} transform="rotate(-14 45 16)" />
          <ellipse cx="75" cy="14" rx="10" ry="25" fill={c} transform="rotate(14 75 14)" />
          <ellipse cx="75" cy="16" rx="4.5" ry="17" fill={p} transform="rotate(14 75 16)" />
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

      {/* wings: small, peeking out from behind the shoulders */}
      <g fill={sil ? SIL : '#FFFFFF'} stroke={sil ? 'none' : '#C9DFF0'} strokeWidth="1.4" strokeLinejoin="round">
        <path d="M46 106 C40 94 26 90 23 98 C21 104 28 108 34 108 C30 111 34 115 42 113 Z" />
        <path d="M74 106 C80 94 94 90 97 98 C99 104 92 108 86 108 C90 111 86 115 78 113 Z" />
      </g>

      {/* body: standing toddler, legs together, arms down at the sides */}
      <g fill={skin} stroke={sil ? 'none' : skinShade} strokeWidth="1">
        <rect x="47.5" y="124" width="12" height="21" rx="6" />
        <rect x="60.5" y="124" width="12" height="21" rx="6" />
        <ellipse cx="53" cy="145" rx="7.5" ry="4.5" />
        <ellipse cx="67" cy="145" rx="7.5" ry="4.5" />
        <ellipse cx="60" cy="114" rx="18" ry="19" />
        <rect x="-5.5" y="-13" width="11" height="25" rx="5.5" transform="translate(42.5 111) rotate(9)" />
        <rect x="-5.5" y="-13" width="11" height="25" rx="5.5" transform="translate(77.5 111) rotate(-9)" />
        <circle cx="40.6" cy="123" r="6" />
        <circle cx="79.4" cy="123" r="6" />
      </g>
      {!sil && <circle cx="60" cy="118" r="1.3" fill={skinShade} />}

      {/* halo for secrets */}
      {secret && showHalo && !sil && (
        <ellipse cx="60" cy="-6" rx="20" ry="5.5" fill="none" stroke="#F4B73B" strokeWidth="3.5" className="angel__halo" />
      )}

      {/* headgear */}
      <BackFeature hat={hat} c={c} a={a} sil={sil} />
      <circle cx="60" cy="58" r="40" fill={hoodFill} stroke="rgba(60,30,20,0.08)" strokeWidth="1.5" />
      {!sil && pattern && (
        <g clipPath={`url(#hood-${uid})`}>
          <Pattern pattern={pattern} a={a} />
        </g>
      )}
      {!sil && <circle cx="60" cy="58" r="40" fill={`url(#shine-${uid})`} />}
      <FrontFeature hat={hat} c={c} a={a} sil={sil} />
      {hat === 'santa' && <circle cx="60" cy="66" r="31" fill={sil ? SIL_DARK : '#FFFFFF'} />}

      {/* face */}
      <circle cx="60" cy="66" r="27" fill={skin} />
      {!sil ? (
        <g>
          <ellipse cx="50" cy="66" rx="3.2" ry="4.4" fill="#2B1F1F" />
          <ellipse cx="70" cy="66" rx="3.2" ry="4.4" fill="#2B1F1F" />
          <circle cx="51.2" cy="64.4" r="1.1" fill="#fff" />
          <circle cx="71.2" cy="64.4" r="1.1" fill="#fff" />
          <ellipse cx="43" cy="75" rx="5.5" ry="3.2" fill="#F7A8B8" opacity="0.75" />
          <ellipse cx="77" cy="75" rx="5.5" ry="3.2" fill="#F7A8B8" opacity="0.75" />
          <path d="M56.5 77 Q60 80.5 63.5 77" stroke="#C0636B" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      ) : (
        <text x="60" y="76" textAnchor="middle" fontSize="28" fontFamily="Fredoka, sans-serif" fontWeight="700" fill="#fff">
          ?
        </text>
      )}
    </svg>
  )
}
