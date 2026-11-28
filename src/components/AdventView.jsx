import { useCallback, useEffect, useState } from 'react'
import Angel from './Angel'
import { SERIES_BY_ID } from '../data/collections'
import { supabase } from '../lib/supabase'
import { useT } from '../i18n'
import { BRAND } from '../brand'

const SERIES = SERIES_BY_ID.advent
// the doors are mixed up on the calendar, like a real one
const ORDER = [7, 15, 2, 21, 11, 18, 4, 13, 24, 9, 1, 16, 20, 6, 12, 23, 3, 17, 10, 22, 5, 14, 19, 8]

// Today in UTC (the server counts days the same way). In development you can
// pretend it's another day with ?adventDate=2026-12-05.
export function adventToday() {
  const fake = import.meta.env.DEV && new URLSearchParams(location.search).get('adventDate')
  return fake ? new Date(`${fake}T12:00:00Z`) : new Date()
}

// The calendar is in the menu during November (as a countdown) and December,
// in the Sonny Angel simulator.
export const adventVisible = () => BRAND === 'sonny' && [10, 11].includes(adventToday().getUTCMonth())

// The doors you opened this year: { day: figure id }.
export function useAdventDoors(userId) {
  const [doors, setDoors] = useState({})
  const year = adventToday().getUTCFullYear()
  const reload = useCallback(async () => {
    if (!adventVisible()) return
    const { data } = await supabase.from('advent_doors').select('day, figure_id').eq('user_id', userId).eq('year', year)
    setDoors(Object.fromEntries((data || []).map((r) => [r.day, r.figure_id])))
  }, [userId, year])
  useEffect(() => {
    reload()
  }, [reload])
  return { doors, reload }
}

// How many doors you can open right now.
export function readyDoors(doors) {
  const today = adventToday()
  if (today.getUTCMonth() !== 11) return 0
  return ORDER.filter((d) => d <= today.getUTCDate() && !doors[d]).length
}

// The advent calendar: from 1 to 24 December one door a day, each with a blind
// box of the advent series. Missed doors can be opened until 31 December.
export default function AdventView({ doors, inventory, onOpen }) {
  const { t } = useT()
  const today = adventToday()
  const year = today.getUTCFullYear()
  const december = today.getUTCMonth() === 11
  const dayOfMonth = today.getUTCDate()
  const [busy, setBusy] = useState(null)

  const open = async (day) => {
    setBusy(day)
    await onOpen(day)
    setBusy(null)
  }

  const all = [...SERIES.figures, SERIES.secret]
  const owned = all.filter((f) => inventory[f.id]).length
  const daysLeft = Math.ceil((Date.UTC(year, 11, 1) - today) / 864e5)
  const ready = readyDoors(doors)

  return (
    <section className="advent">
      <div className="hero">
        <div>
          <h1 className="hero__title">🎄 {t('Advent calendar')}</h1>
          <p className="hero__text">
            {t("From 1 to 24 December one door opens every day, with a blind box from the Advent Calendar Series: 24 angels you can only get here. Every door holds a figure you don't have yet, and door 24 holds the secret.")}
          </p>
          <p className="hero__text">{t('Missed a day? You can still open earlier doors until 31 December.')}</p>
        </div>
      </div>

      <p className="advent__status">
        {!december
          ? t(daysLeft === 1 ? 'The calendar opens on 1 December — tomorrow!' : 'The calendar opens on 1 December — in {n} days.', { n: daysLeft })
          : ready > 0
            ? t(ready === 1 ? '{n} door is waiting for you!' : '{n} doors are waiting for you!', { n: ready })
            : dayOfMonth < 24
              ? t('All doors opened so far. Come back tomorrow!')
              : t('Merry Christmas! 🎅')}
        <span className="advent__count">{t('{owned}/{total} collected', { owned, total: all.length })}</span>
      </p>

      <div className="advent__grid">
        {ORDER.map((day) => {
          const fig = doors[day]
          const canOpen = december && day <= dayOfMonth && !fig
          const isToday = december && day === dayOfMonth
          return (
            <button
              key={day}
              className={`advent__door ${fig ? 'is-open' : canOpen ? 'is-ready' : 'is-locked'} ${isToday ? 'is-today' : ''} ${day === 24 ? 'is-big' : ''}`}
              disabled={!canOpen || busy !== null}
              onClick={() => open(day)}
              aria-label={fig ? `${day}: ${all.find((f) => f.id === fig)?.name}` : t('Door {n}', { n: day })}
            >
              {fig ? (
                <>
                  <Angel figure={all.find((f) => f.id === fig)} size={day === 24 ? 70 : 54} showHalo={false} />
                  <span className="advent__day advent__day--small">{day}</span>
                </>
              ) : (
                <>
                  <span className="advent__day">{day}</span>
                  {busy === day ? <span className="advent__hint">…</span> : canOpen ? <span className="advent__hint">{t('Open!')}</span> : !december || day > dayOfMonth ? <span className="advent__lock" aria-hidden>🔒</span> : null}
                </>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
