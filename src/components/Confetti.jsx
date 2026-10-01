import { useMemo } from 'react'

const COLORS = ['#E4002B', '#FFD34D', '#7FD0EC', '#F7B6C2', '#8CCB5E', '#B39DDB', '#FFFFFF']

export default function Confetti({ count = 60, gold = false }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 1.8 + Math.random() * 1.6,
        rot: Math.random() * 360,
        drift: (Math.random() - 0.5) * 160,
        color: gold ? ['#FFD34D', '#F4B73B', '#FFF3B0'][i % 3] : COLORS[i % COLORS.length],
        w: 6 + Math.random() * 6,
      })),
    [count, gold],
  )
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.w * 0.45,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            '--rot': `${p.rot}deg`,
            '--drift': `${p.drift}px`,
          }}
        />
      ))}
    </div>
  )
}
