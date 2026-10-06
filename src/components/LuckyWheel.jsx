import { useEffect, useRef, useState } from 'react'
import Angel from './Angel'
import Confetti from './Confetti'
import { FIGURE_BY_ID, WHEEL_PRIZES, euro } from '../data/collections'

const SLICE = 360 / WHEEL_PRIZES.length
const R = 140
const C = 150

const point = (deg, r) => {
  const a = ((deg - 90) * Math.PI) / 180
  return [C + Math.cos(a) * r, C + Math.sin(a) * r]
}
const slicePath = (i) => {
  const [x1, y1] = point(i * SLICE - SLICE / 2, R)
  const [x2, y2] = point(i * SLICE + SLICE / 2, R)
  return `M${C} ${C} L${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2} Z`
}
const icon = (p) => (p.kind === 'cash' ? '💰' : p.kind === 'secret' ? '★' : '🎁')

function untilMidnightUtc() {
  const now = new Date()
  const next = new Date(now)
  next.setUTCHours(24, 0, 0, 0)
  const s = Math.max(0, Math.floor((next - now) / 1000))
  return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`
}

// Daily lucky wheel: the server picks the prize, the wheel spins to it.
export default function LuckyWheel({ canSpin, onSpin, onDone, onClose }) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [showOdds, setShowOdds] = useState(false)
  const pending = useRef(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !spinning && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, spinning])

  const spin = async () => {
    setSpinning(true)
    const res = await onSpin()
    if (!res) return setSpinning(false)
    pending.current = res
    const i = WHEEL_PRIZES.findIndex((p) => p.key === res.prize)
    const jitter = (Math.random() - 0.5) * SLICE * 0.6
    // land slice i under the pointer at the top, after six full turns
    const target = 360 - i * SLICE + jitter
    setRotation((r) => r + 360 * 6 + ((target - (r % 360) + 360) % 360))
  }

  const landed = () => {
    if (!pending.current) return
    setSpinning(false)
    setResult(pending.current)
    pending.current = null
    onDone()
  }

  const prize = result && WHEEL_PRIZES.find((p) => p.key === result.prize)
  const total = WHEEL_PRIZES.reduce((s, p) => s + p.weight, 0)

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Lucky wheel" onClick={() => !spinning && onClose()}>
      <div className="modal__card wheel" onClick={(e) => e.stopPropagation()}>
        {result && (prize.kind !== 'cash' || prize.amount >= 50) && <Confetti gold={prize.kind === 'secret'} count={70} />}
        <button className="modal__close" onClick={onClose} disabled={spinning} aria-label="Close">
          ×
        </button>
        <h2>Lucky wheel</h2>
        <p className="wheel__sub">One free spin every day: money or figures, with a small chance of a big win.</p>

        <div className="wheel__stage">
          <div className="wheel__pointer" aria-hidden />
          <svg
            className="wheel__disc"
            viewBox="0 0 300 300"
            style={{ transform: `rotate(${rotation}deg)` }}
            onTransitionEnd={landed}
            aria-hidden
          >
            <circle cx={C} cy={C} r={R + 8} fill="#E4002B" />
            {WHEEL_PRIZES.map((p, i) => (
              <g key={p.key}>
                <path d={slicePath(i)} fill={p.color} stroke="#fff" strokeWidth="2" />
                <g transform={`rotate(${i * SLICE} ${C} ${C})`}>
                  <text x={C} y={C - R + 30} textAnchor="middle" className="wheel__icon">
                    {icon(p)}
                  </text>
                  <text x={C} y={C - R + 52} textAnchor="middle" className={`wheel__label ${p.kind === 'secret' ? 'is-secret' : ''}`}>
                    {p.kind === 'cash' ? `€${p.amount}` : p.kind === 'secret' ? 'Secret' : `×${p.count}`}
                  </text>
                </g>
              </g>
            ))}
            {Array.from({ length: WHEEL_PRIZES.length }, (_, i) => {
              const [x, y] = point(i * SLICE + SLICE / 2, R + 4)
              return <circle key={i} cx={x} cy={y} r="3" fill="#FFE08A" />
            })}
            <circle cx={C} cy={C} r="26" fill="#fff" />
            <text x={C} y={C + 7} textAnchor="middle" className="wheel__hub">
              ✦
            </text>
          </svg>
        </div>

        {result ? (
          <div className="wheel__result">
            {prize.kind === 'cash' ? (
              <p className="wheel__win">+{euro(result.amount)}</p>
            ) : (
              <>
                <p className="wheel__win">{prize.kind === 'secret' ? '★ A secret figure! ★' : `${result.figures.length} figure${result.figures.length > 1 ? 's' : ''}!`}</p>
                <div className="wheel__figures">
                  {result.figures.map((id, i) => (
                    <div key={i} className="wheel__fig">
                      {result.new[i] && <span className="badge badge--new">New!</span>}
                      <Angel figure={FIGURE_BY_ID[id]} size={70} />
                      <span>{FIGURE_BY_ID[id].name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <p className="wheel__note">Come back tomorrow for another spin.</p>
          </div>
        ) : canSpin ? (
          <button className="btn btn--primary btn--lg wheel__spin" onClick={spin} disabled={spinning}>
            {spinning ? 'Spinning…' : 'Spin the wheel!'}
          </button>
        ) : (
          <p className="wheel__note">You already spun today. Next spin in {untilMidnightUtc()}.</p>
        )}

        <button className="wheel__odds-toggle" onClick={() => setShowOdds((v) => !v)}>
          {showOdds ? 'Hide odds' : 'Show odds'}
        </button>
        {showOdds && (
          <ul className="wheel__odds">
            {WHEEL_PRIZES.map((p) => (
              <li key={p.key}>
                <span>
                  {icon(p)} {p.kind === 'cash' ? euro(p.amount) : p.kind === 'secret' ? 'Secret figure' : `${p.count} random figure${p.count > 1 ? 's' : ''}`}
                </span>
                <span>{((p.weight / total) * 100).toLocaleString('en', { maximumFractionDigits: 1 })}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
