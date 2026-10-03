import { useId } from 'react'

// Illustrated style: no outlines — soft radial shading gives each shape its volume.
const SKIN = '#F8D5BE'
const SKIN_LINE = '#D59B7C'
const LEAF = '#5DAA48'
const SIL = '#E4DAD3'
const SIL_DARK = '#CFC2B9'


// Mix a hex colour toward black (f > 0) or white (f < 0).
function shade(hex, f = 0.3) {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v) => Math.round(f >= 0 ? v * (1 - f) : v + (255 - v) * -f)
  const [r, g, b] = [ch(n >> 16), ch((n >> 8) & 255), ch(n & 255)]
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

// Headgear features are authored on a hood circle centred at (60,58) with r=40.

// Flower petal styles, laid out around the hood circle (60,58).
function Petals({ c, a, petal = {}, sil }) {
  const { shape = 'round', count = 10 } = petal
  return (
    <g stroke={sil ? 'none' : shade(c, 0.14)} strokeWidth="1.2">
      <PetalShapes c={c} shape={shape} count={count} />
    </g>
  )
}

function PetalShapes({ c, shape, count }) {
  const ring = (n, render) => Array.from({ length: n }, (_, i) => render((i / n) * 360, i))
  switch (shape) {
    case 'pointy':
      return <g fill={c}>{ring(count, (deg, i) => <path key={i} d="M60 -4 Q71 12 60 26 Q49 12 60 -4 Z" transform={`rotate(${deg} 60 58)`} />)}</g>
    case 'thin':
      return <g fill={c}>{ring(count, (deg, i) => <ellipse key={i} cx="60" cy="12" rx="5" ry="15" transform={`rotate(${deg} 60 58)`} />)}</g>
    case 'heart':
      return (
        <g fill={c}>
          {ring(count, (deg, i) => (
            <path key={i} d="M60 26 C42 18 42 -2 54 -2 L60 5 L66 -2 C78 -2 78 18 60 26 Z" transform={`rotate(${deg} 60 58)`} />
          ))}
        </g>
      )
    case 'layered':
      return (
        <g>
          <g fill={shade(c, 0.12)}>{ring(count, (deg, i) => <ellipse key={i} cx="60" cy="14" rx="13" ry="16" transform={`rotate(${deg} 60 58)`} />)}</g>
          <g fill={c}>{ring(count, (deg, i) => <ellipse key={i} cx="60" cy="20" rx="11" ry="13" transform={`rotate(${deg + 180 / count} 60 58)`} />)}</g>
        </g>
      )
    case 'tulip':
      return (
        <g fill={c}>
          <path d="M60 -6 Q72 10 64 24 L56 24 Q48 10 60 -6 Z" />
          <path d="M60 -6 Q72 10 64 24 L56 24 Q48 10 60 -6 Z" transform="rotate(-32 60 30)" />
          <path d="M60 -6 Q72 10 64 24 L56 24 Q48 10 60 -6 Z" transform="rotate(32 60 30)" />
        </g>
      )
    default:
      return <g fill={c}>{ring(count, (deg, i) => <ellipse key={i} cx="60" cy="14" rx="12" ry="16" transform={`rotate(${deg} 60 58)`} />)}</g>
  }
}

function BackFeature({ hat, c, a, sil, petal }) {
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
          <path d="M24 44 L28 4 L54 22 Z M96 44 L92 4 L66 22 Z" fill={c} strokeWidth="9" />
          <path d="M24 44 L28 4 L54 22 Z M96 44 L92 4 L66 22 Z" fill={c} stroke={c} strokeWidth="6" />
          <path d="M31 34 L33 14 L46 24 Z" fill={p} />
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
        <g fill={c}>
          {Array.from({ length: 9 }, (_, i) => {
            const t = Math.PI + (i / 8) * Math.PI
            return <circle key={i} cx={60 + Math.cos(t) * 37} cy={58 + Math.sin(t) * 37} r="12" />
          })}
        </g>
      )
    case 'petals':
      return <Petals c={c} a={a} petal={petal} sil={sil} />
    case 'shell':
      return (
        <g>
          <circle cx="90" cy="24" r="18" fill={sil ? SIL_DARK : a} />
          <path d="M90 24 m-12 0 a12 12 0 1 1 12 12 a8 8 0 1 1 -8 -8 a4 4 0 1 1 4 4" fill="none" stroke={sil ? SIL : shade(a, 0.3)} strokeWidth="2.5" />
        </g>
      )
    case 'wrapper':
      return (
        <g fill={c}>
          <path d="M22 58 L2 44 L6 58 L2 72 Z" />
          <path d="M98 58 L118 44 L114 58 L118 72 Z" />
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
          <g fill={sil ? SIL_DARK : a}>
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
    case 'antennae':
      return (
        <g stroke={sil ? SIL_DARK : a} strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M50 22 Q44 6 34 0 M70 22 Q76 6 86 0" />
          <circle cx="34" cy="0" r="4.5" fill={sil ? SIL_DARK : a} stroke="none" />
          <circle cx="86" cy="0" r="4.5" fill={sil ? SIL_DARK : a} stroke="none" />
        </g>
      )
    case 'shell':
      return (
        <g stroke={sil ? SIL_DARK : shade(c, 0.25)} strokeWidth="3" strokeLinecap="round" fill={sil ? SIL_DARK : shade(c, 0.25)}>
          <path d="M50 22 L46 4 M62 20 L64 2" />
          <circle cx="46" cy="4" r="3" />
          <circle cx="64" cy="2" r="3" />
        </g>
      )
    case 'frogEyes':
      return (
        <g>
          <circle cx="42" cy="24" r="13" fill={c} />
          <circle cx="78" cy="24" r="13" fill={c} />
          <circle cx="42" cy="22" r="8" fill={sil ? SIL_DARK : '#FFFFFF'} />
          <circle cx="78" cy="22" r="8" fill={sil ? SIL_DARK : '#FFFFFF'} />
          {!sil && <circle cx="43" cy="22" r="4" fill="#1E1416" />}
          {!sil && <circle cx="79" cy="22" r="4" fill="#1E1416" />}
        </g>
      )
    case 'claws':
      return (
        <g fill={sil ? SIL_DARK : shade(c, 0.08)}>
          <path d="M26 40 C12 36 8 22 13 10 L24 23 L29 4 C41 12 42 30 26 40 Z" />
          <path d="M94 40 C108 36 112 22 107 10 L96 23 L91 4 C79 12 78 30 94 40 Z" />
        </g>
      )
    case 'mandibles':
      return (
        <g fill={sil ? SIL_DARK : shade(c, 0.35)}>
          <path d="M48 22 Q30 8 40 -4 Q44 8 56 18 Z" />
          <path d="M72 22 Q90 8 80 -4 Q76 8 64 18 Z" />
        </g>
      )
    case 'crest':
      return (
        <path
          d="M34 30 L36 14 L44 24 L48 8 L54 20 L60 4 L66 20 L72 8 L76 24 L84 14 L86 30 Z"
          fill={sil ? SIL_DARK : a}
          strokeLinejoin="round"
        />
      )
    case 'spout':
      return (
        <g fill={sil ? SIL_DARK : '#9CD8F5'}>
          <rect x="58" y="6" width="4" height="14" rx="2" />
          <path d="M60 -6 Q66 2 60 8 Q54 2 60 -6 Z" />
          <path d="M48 0 Q54 6 50 12 Q42 8 48 0 Z" />
          <path d="M72 0 Q66 6 70 12 Q78 8 72 0 Z" />
        </g>
      )
    case 'calyx':
      return (
        <g fill={sil ? SIL_DARK : a}>
          <path d={starPath(60, 20, 18, 7)} strokeLinejoin="round" />
          <rect x="57.5" y="0" width="5" height="14" rx="2.5" />
        </g>
      )
    case 'lollipop':
      return (
        <g>
          <rect x="58" y="4" width="4" height="18" rx="2" fill={sil ? SIL_DARK : '#FFFFFF'} />
          <circle cx="60" cy="-2" r="11" fill={sil ? SIL_DARK : a} />
          {!sil && <path d="M60 -2 m-7 0 a7 7 0 1 1 7 7 a4.5 4.5 0 1 1 -4.5 -4.5" fill="none" stroke="#FFFFFF" strokeWidth="2.2" />}
        </g>
      )
    case 'witchHat':
      return (
        <g>
          <path d="M42 22 L70 -14 L82 22 Z" fill={sil ? SIL_DARK : '#2B2238'} strokeLinejoin="round" />
          <ellipse cx="60" cy="22" rx="36" ry="6" fill={sil ? SIL_DARK : '#2B2238'} />
          <path d="M45 18 L79 18 L80.5 13 L46.5 13 Z" fill={sil ? SIL : a} />
        </g>
      )
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

function Pattern({ pattern, a, c, pc }) {
  const m = pc || a
  const line = shade(c, 0.2)
  switch (pattern) {
    case 'mask':
      return null // drawn as a frame around the face, see below
    case 'panda':
      return (
        <g fill={m}>
          <ellipse cx="45" cy="36" rx="8" ry="6" transform="rotate(-20 45 36)" />
          <ellipse cx="75" cy="36" rx="8" ry="6" transform="rotate(20 75 36)" />
        </g>
      )
    case 'blaze':
      return <path d="M53 16 Q60 13 67 16 L64 46 L56 46 Z" fill={pc || '#FFFFFF'} />
    case 'segments':
      return (
        <g stroke={line} strokeWidth="2.4" fill="none">
          {[-30, -15, 0, 15, 30].map((d) => (
            <path key={d} d={`M60 18 Q${60 + d * 1.6} 58 60 98`} />
          ))}
        </g>
      )
    case 'grapes':
      return (
        <g fill={shade(c, -0.15)} stroke={shade(c, 0.18)} strokeWidth="1.2">
          {[[34, 30], [48, 22], [62, 20], [76, 24], [88, 34], [26, 46], [40, 38], [80, 38], [94, 48], [24, 62], [96, 62]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="7" />
          ))}
        </g>
      )
    case 'crease':
      return <path d="M60 18 Q46 36 50 64" stroke={line} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    case 'kernels':
      return (
        <g fill={shade(c, -0.18)} stroke={shade(c, 0.12)} strokeWidth="1">
          {Array.from({ length: 30 }, (_, i) => {
            const row = Math.floor(i / 6)
            const col = i % 6
            return <rect key={i} x={20 + col * 14 + (row % 2) * 7} y={18 + row * 11} width="11" height="9" rx="4" />
          })}
        </g>
      )
    case 'rings':
      return (
        <g stroke={line} strokeWidth="2.2" fill="none" strokeLinecap="round">
          {[30, 42, 54, 66, 78].map((y) => (
            <path key={y} d={`M${y < 50 ? 30 : 22} ${y} Q60 ${y + 6} ${y < 50 ? 90 : 98} ${y}`} />
          ))}
        </g>
      )
    case 'topTint':
      return <path d="M0 0 H120 V36 Q60 46 0 36 Z" fill={m} />
    case 'dimples':
      return (
        <g fill={line} opacity="0.5">
          {Array.from({ length: 40 }, (_, i) => (
            <circle key={i} cx={22 + ((i * 37) % 78)} cy={20 + ((i * 23) % 70)} r="1.3" />
          ))}
        </g>
      )
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

// Accessories, listed per figure as "name" or "name:#color".
const parseExtras = (list = []) => Object.fromEntries(list.map((e) => { const [k, v] = e.split(':'); return [k, v || true] }))

function BackExtras({ x, sil }) {
  const col = (v, d) => (sil ? SIL_DARK : typeof v === 'string' ? v : d)
  return (
    <>
      {x.wings && (
        <g fill={col(x.wings, '#FFB3D1')}>
          <ellipse cx="22" cy="58" rx="18" ry="24" transform="rotate(-25 22 58)" />
          <ellipse cx="98" cy="58" rx="18" ry="24" transform="rotate(25 98 58)" />
          <ellipse cx="30" cy="92" rx="12" ry="14" transform="rotate(20 30 92)" />
          <ellipse cx="90" cy="92" rx="12" ry="14" transform="rotate(-20 90 92)" />
          {!sil && <circle cx="18" cy="54" r="5" fill="#FFFFFF" opacity="0.7" />}
          {!sil && <circle cx="102" cy="54" r="5" fill="#FFFFFF" opacity="0.7" />}
        </g>
      )}
      {x.clearWings && (
        <g fill={col(x.clearWings, '#E6F4FF')} opacity={sil ? 1 : 0.8}>
          <ellipse cx="24" cy="74" rx="20" ry="11" transform="rotate(-20 24 74)" />
          <ellipse cx="96" cy="74" rx="20" ry="11" transform="rotate(20 96 74)" />
        </g>
      )}
      {x.longWings && (
        <g fill={col(x.longWings, '#DDF3FF')} opacity={sil ? 1 : 0.85}>
          <ellipse cx="20" cy="70" rx="24" ry="6" transform="rotate(-12 20 70)" />
          <ellipse cx="100" cy="70" rx="24" ry="6" transform="rotate(12 100 70)" />
          <ellipse cx="22" cy="84" rx="20" ry="5" transform="rotate(10 22 84)" />
          <ellipse cx="98" cy="84" rx="20" ry="5" transform="rotate(-10 98 84)" />
        </g>
      )}
    </>
  )
}

function NeckExtras({ x, sil }) {
  const col = (v, d) => (sil ? SIL_DARK : typeof v === 'string' ? v : d)
  return (
    <>
      {x.scarf && (
        <g fill={col(x.scarf, '#E5343A')}>
          <rect x="62" y="88" width="7" height="16" rx="3" transform="rotate(-12 62 88)" />
          <ellipse cx="60" cy="89" rx="17" ry="5" />
        </g>
      )}
      {x.collar && <ellipse cx="60" cy="89" rx="15.5" ry="4" fill={col(x.collar, '#E5343A')} />}
      {x.bell && (
        <g>
          {!x.collar && <ellipse cx="60" cy="89" rx="15" ry="3.4" fill={col(x.bell === true ? '#E5343A' : x.bell, '#E5343A')} />}
          <circle cx="60" cy="93.5" r="3.4" fill={sil ? SIL_DARK : '#F4C430'} />
          {!sil && <rect x="59.4" y="94" width="1.2" height="2.4" fill="#A07A10" />}
        </g>
      )}
      {x.bowtie && (
        <g fill={col(x.bowtie, '#E5343A')}>
          <path d="M60 90 L51 85.5 L51 94.5 Z M60 90 L69 85.5 L69 94.5 Z" />
          <circle cx="60" cy="90" r="2.4" />
        </g>
      )}
    </>
  )
}

function FaceExtras({ x, sil, c }) {
  const col = (v, d) => (sil ? SIL_DARK : typeof v === 'string' ? v : d)
  return (
    <>
      {x.frill && (
        <g fill={col(x.frill, c)}>
          {Array.from({ length: 13 }, (_, i) => {
            const t = ((12 + i * 13) * Math.PI) / 180
            return <circle key={i} cx={60 + Math.cos(t) * 35} cy={52 + Math.sin(t) * 36} r="5.5" />
          })}
        </g>
      )}
      {x.cheeks && !sil && (
        <g fill="#F7A8B8" opacity="0.75">
          <ellipse cx="31" cy="74" rx="6" ry="5" />
          <ellipse cx="89" cy="74" rx="6" ry="5" />
        </g>
      )}
      {x.whiskers && (
        <path
          d="M33 66 L21 63 M33 70 L20 70 M33 74 L21 77 M87 66 L99 63 M87 70 L100 70 M87 74 L99 77"
          stroke={sil ? SIL_DARK : shade(c, 0.45)}
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.8"
        />
      )}
      {x.beak && (
        <g>
          <path d="M54.5 30 L60 26 L65.5 30 L60 35 Z" fill={col(x.beak, '#FF9F2E')} strokeLinejoin="round" />
          {!sil && <path d="M55 30.2 L65 30.2" stroke={shade(typeof x.beak === 'string' ? x.beak : '#FF9F2E', 0.3)} strokeWidth="0.8" />}
        </g>
      )}
      {x.nose && (
        <g>
          <ellipse cx="60" cy="31" rx="4.4" ry="3.2" fill={col(x.nose, '#3A2A2A')} />
          {!sil && <ellipse cx="58.6" cy="30" rx="1.4" ry="0.8" fill="#FFFFFF" opacity="0.6" />}
        </g>
      )}
      {x.bow && (
        <g fill={col(x.bow, '#FF6F91')}>
          <path d="M84 24 C76 15 71 29 84 24 Z M84 24 C92 15 97 29 84 24 Z" />
          <circle cx="84" cy="24" r="2.6" fill={sil ? SIL_DARK : shade(typeof x.bow === 'string' ? x.bow : '#FF6F91', 0.15)} />
        </g>
      )}
      {x.flower && (
        <g>
          {[0, 72, 144, 216, 288].map((d) => (
            <circle key={d} cx={38 + Math.cos((d * Math.PI) / 180) * 3.6} cy={26 + Math.sin((d * Math.PI) / 180) * 3.6} r="3.1" fill={col(x.flower, '#FFFFFF')} />
          ))}
          <circle cx="38" cy="26" r="2.2" fill={sil ? SIL : '#FFD34D'} />
        </g>
      )}
    </>
  )
}

export default function Angel({ figure, silhouette = false, size = 120, className = '', showHalo = true }) {
  const uid = useId().replace(/:/g, '')
  const sil = silhouette
  const { hat, pattern, secret } = figure
  const extras = parseExtras(figure.extras)
  const c = sil ? SIL : figure.color
  const a = figure.accent
  const hoodBase = hat === 'petals' ? a : c
  const skin = sil ? SIL : `url(#skin-${uid})`
  const skinLine = sil ? SIL_DARK : SKIN_LINE
  const hoodFill = sil ? SIL : secret ? `url(#gold-${uid})` : `url(#hoodshade-${uid})`

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
        <radialGradient id={`skin-${uid}`} cx="0.42" cy="0.38" r="0.75">
          <stop offset="0" stopColor="#FFE9DB" />
          <stop offset="0.6" stopColor="#F9D2BC" />
          <stop offset="1" stopColor="#EDB597" />
        </radialGradient>
        <radialGradient id={`hoodshade-${uid}`} cx="0.38" cy="0.3" r="0.8">
          <stop offset="0" stopColor={shade(hoodBase, -0.35)} />
          <stop offset="0.55" stopColor={hoodBase} />
          <stop offset="1" stopColor={shade(hoodBase, 0.15)} />
        </radialGradient>
      </defs>

      <BackExtras x={extras} sil={sil} />

      {/* body: long standing toddler with short arms reaching outward */}
      <g fill={skin}>
        <path d="M47 122 C46 132 46 142 47 149 C48 153 58 153 59 149 C59.5 141 59.6 131 60 124 Z" />
        <path d="M73 122 C74 132 74 142 73 149 C72 153 62 153 61 149 C60.5 141 60.4 131 60 124 Z" />
        {/* torso and arms as one shape, so the shoulders flow smoothly into short arms */}
        <path
          d="M47 86 C44 90 40 95 35.5 100.5 C32.5 104 29.5 107 27.5 109.5 C25.5 112 26.5 115 29.5 114.4
             C33.5 113.6 38.5 110.5 43 106.5 C42.6 113 43 120 46 126 C52 131 68 131 74 126
             C77 120 77.4 113 77 106.5 C81.5 110.5 86.5 113.6 90.5 114.4 C93.5 115 94.5 112 92.5 109.5
             C90.5 107 87.5 104 84.5 100.5 C80 95 76 90 73 86 Z"
        />
      </g>
      {!sil && <ellipse cx="60" cy="113" rx="1.3" ry="1.7" fill={skinLine} opacity="0.5" />}
      {/* the small, characteristic little willy */}
      <ellipse cx="60" cy="128.8" rx="2.7" ry="2.4" fill={skin} />
      {!sil && <ellipse cx="60" cy="130.3" rx="2.2" ry="0.9" fill={skinLine} opacity="0.3" />}

      <NeckExtras x={extras} sil={sil} />

      {/* halo for secrets */}
      {secret && showHalo && !sil && (
        <ellipse cx="60" cy="-8" rx="18" ry="4.5" fill="none" stroke="#F4B73B" strokeWidth="3" className="angel__halo" />
      )}

      {/* headgear: authored on a r=40 circle at (60,58), fitted to a rounded hood */}
      <g transform="translate(60 52) scale(0.875 0.9) translate(-60 -58)">
        <BackFeature hat={hat} c={c} a={a} sil={sil} petal={figure.petal} />
        <circle cx="60" cy="58" r="40" fill={hoodFill} />
        {!sil && pattern && (
          <g clipPath={`url(#hood-${uid})`}>
            <Pattern pattern={pattern} a={a} c={c} pc={figure.patternColor} />
          </g>
        )}
        <FrontFeature hat={hat} c={c} a={a} sil={sil} />
      </g>
      {/* some hoods carry a little animal face on the forehead (set per figure) */}
      {!sil && figure.hoodFace && (
        <g fill={shade(c, 0.45)} stroke={shade(c, 0.45)} strokeWidth="0.8" strokeLinejoin="round">
          <circle cx="51.5" cy="29.5" r="1.8" />
          <circle cx="68.5" cy="29.5" r="1.8" />
          <path d="M57.4 31.6 L62.6 31.6 L60 34.4 Z" />
        </g>
      )}
      {!sil && pattern === 'mask' && <ellipse cx="60" cy="62" rx="31" ry="28.5" fill={figure.patternColor || a} />}
      <FaceExtras x={extras} sil={sil} c={hoodBase} />
      {hat === 'santa' && <ellipse cx="60" cy="63" rx="29.5" ry="27.5" fill={sil ? SIL_DARK : '#FFFFFF'} />}

      {/* face: wide and round, framed by the hood */}
      <ellipse cx="60" cy="63" rx="26" ry="24" fill={skin} />
      {!sil ? (
        <g>
          {/* little eyebrow arcs */}
          <path d="M46.5 51 Q49.6 49 52.8 50.4 M67.2 50.4 Q70.4 49 73.5 51" stroke="#8A5A44" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          {/* big sparkly eyes with lashes */}
          <ellipse cx="50.5" cy="61.5" rx="4.6" ry="5.2" fill="#1E1416" />
          <ellipse cx="69.5" cy="61.5" rx="4.6" ry="5.2" fill="#1E1416" />
          <circle cx="52.2" cy="59.7" r="1.7" fill="#fff" />
          <circle cx="71.2" cy="59.7" r="1.7" fill="#fff" />
          <circle cx="49" cy="63.6" r="0.8" fill="#fff" />
          <circle cx="68" cy="63.6" r="0.8" fill="#fff" />
          <path
            d="M46.1 60 L43.8 58.6 M45.9 61.9 L43.4 61.5 M46.9 58.2 L45.2 56.4 M73.9 60 L76.2 58.6 M74.1 61.9 L76.6 61.5 M73.1 58.2 L74.8 56.4"
            stroke="#1E1416"
            strokeWidth="1"
            strokeLinecap="round"
          />
          {/* rosy cheeks, tiny nose and a thin smile */}
          <circle cx="43" cy="70" r="5.5" fill="#F49A9A" opacity="0.5" />
          <circle cx="77" cy="70" r="5.5" fill="#F49A9A" opacity="0.5" />
          <ellipse cx="60" cy="68.6" rx="2.6" ry="2" fill="#FFE9DB" />
          <ellipse cx="60" cy="69.6" rx="2.2" ry="1" fill={skinLine} opacity="0.25" />
          <path d="M56 73.6 Q60 76.8 64 73.6" stroke="#7A3E34" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </g>
      ) : (
        <text x="60" y="72" textAnchor="middle" fontSize="26" fontFamily="Fredoka, sans-serif" fontWeight="700" fill="#fff">
          ?
        </text>
      )}
    </svg>
  )
}
