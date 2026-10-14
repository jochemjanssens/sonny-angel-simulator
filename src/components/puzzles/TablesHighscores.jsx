import { useEffect, useState } from 'react'
import { rpc } from '../../lib/supabase'
import { TABLES_SIZES } from '../../puzzles/tables.js'
import { useT } from '../../i18n'

const MEDALS = ['🥇', '🥈', '🥉']

const SIZE_LABEL = { small: 'Small', medium: 'Medium', large: 'Large' }

// This week's best times-table scores for one size. The top 3 of the week in
// each size win free wheel spins (3, 2, 1), given by the server once the week
// is over (Monday 00:00 UTC).
export const PRIZE_SPINS = [3, 2, 1]
export default function TablesHighscores({ userId, size, refreshKey, onProfile }) {
  const { t } = useT()
  const [data, setData] = useState(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    let live = true
    setData(null)
    rpc('tables_highscores', { p_size: size })
      .then((d) => live && setData(d))
      .catch(() => live && setData({ error: true }))
    return () => {
      live = false
    }
  }, [size, refreshKey])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  if (!data) return <div className="hs">{t('Loading highscores…')}</div>
  if (data.error) return null

  const mins = Math.max(0, Math.floor((new Date(data.ends_at) - now) / 60000))
  const left = mins >= 1440 ? t('{d}d {h}h', { d: Math.floor(mins / 1440), h: Math.floor((mins % 1440) / 60) }) : t('{h}h {m}m', { h: Math.floor(mins / 60), m: mins % 60 })
  const name = (row) => (row.username ? `@${row.username}` : t('Anonymous'))

  return (
    <div className="hs">
      <div className="hs__head">
        <h3>
          🏆 {t('Highscores this week')} · {t(SIZE_LABEL[size])}
        </h3>
        <span className="hs__prize">{t('Top 3 win 3, 2 or 1 free wheel spins')}</span>
      </div>
      <p className="hs__ends">
        {t(TABLES_SIZES[size].label)} · {t('Ends in {time} (Monday 00:00 UTC)', { time: left })}
      </p>
      {data.top.length === 0 ? (
        <p className="hs__empty">{t('No scores yet this week. Be the first!')}</p>
      ) : (
        <ol className="hs__list">
          {data.top.map((row, i) => (
            <li key={row.user_id} className={row.user_id === userId ? 'is-me' : ''}>
              <span className="hs__rank">{MEDALS[i] ?? i + 1}</span>
              {row.username && onProfile ? (
                <button className="hs__name user-link" onClick={() => onProfile(row.user_id)}>
                  {name(row)}
                </button>
              ) : (
                <span className="hs__name">{name(row)}</span>
              )}
              {i < 3 && <span className="hs__spins">🎡×{PRIZE_SPINS[i]}</span>}
              <strong className="hs__score">{row.score}</strong>
            </li>
          ))}
        </ol>
      )}
      <p className="hs__mine">
        {data.mine ? t('Your best this week: {n} points', { n: data.mine }) : t("You haven't played this week yet.")}
      </p>
      {data.last?.length > 0 && (
        <p className="hs__last">
          {t('Last week:')}{' '}
          {data.last.map((row, i) => (
            <span key={row.user_id}>
              {i > 0 && ' · '}
              {MEDALS[i]} {row.user_id === userId ? t('you') : name(row)} ({row.score})
            </span>
          ))}
          {data.last.some((row) => row.user_id === userId && row.spins > 0) &&
            ' — ' + t('your free spins are waiting at the lucky wheel! 🎉')}
        </p>
      )}
    </div>
  )
}
