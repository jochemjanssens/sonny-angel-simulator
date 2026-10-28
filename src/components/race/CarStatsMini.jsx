import { useT } from '../../i18n'

const ICONS = [
  ['speed', '⚡', 'Speed'],
  ['accel', '🚀', 'Acceleration'],
  ['grip', '🛞', 'Grip'],
  ['weight', '⚖️', 'Weight'],
]

// A car's four stats on one small line (⚡ 8 🚀 7 🛞 6 ⚖️ 4), for cards and
// lists where the full stat bars don't fit. Renders nothing for non-cars.
export default function CarStatsMini({ figure }) {
  const { t } = useT()
  if (!figure?.stats) return null
  const label = ICONS.map(([k, , name]) => `${t(name)} ${figure.stats[k]}`).join(', ')
  return (
    <span className="car-mini" title={label} aria-label={label}>
      {ICONS.map(([k, icon]) => (
        <span key={k} className="car-mini__stat">
          <span aria-hidden>{icon}</span>
          {figure.stats[k]}
        </span>
      ))}
    </span>
  )
}
