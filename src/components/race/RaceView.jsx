import { useEffect, useMemo, useState } from 'react'
import Angel from '../Angel'
import DriveGame from './DriveGame'
import TrialHighscores, { seconds } from './TrialHighscores'
import Garage, { useGarage } from './Garage'
import { FIGURE_BY_ID, SERIES, euro } from '../../data/collections'
import { FINISH_REWARD, MEDALS, PAID_RACES_PER_DAY, TRACKS, TRACK_BY_ID, tunedStats } from '../../data/cars'
import { rpc } from '../../lib/supabase'
import { useT } from '../../i18n'

const STAT_NAMES = { speed: 'Speed', accel: 'Acceleration', grip: 'Grip', weight: 'Weight' }

// The four stat bars of a car; with your upgrades, the tuned part of each bar
// is shown in green with its +bonus.
export function CarStats({ car, track, upgrade }) {
  const { t } = useT()
  const w = track ? TRACK_BY_ID[track].weights : null
  const tuned = tunedStats(car, upgrade)
  return (
    <div className="car-stats">
      {Object.entries(STAT_NAMES).map(([k, label]) => {
        const plus = tuned[k] - car.stats[k]
        return (
          <div key={k} className={`car-stats__row ${w && w[k] >= 0.3 ? 'is-key' : ''}`}>
            <span>{t(label)}</span>
            <span className="car-stats__bar">
              <span style={{ width: `${car.stats[k] * 10}%` }} />
              {plus > 0 && <span className="car-stats__tuned" style={{ width: `${plus * 10}%` }} />}
            </span>
            <b>
              {tuned[k]}
              {plus > 0 && <small className="car-stats__plus">+{plus}</small>}
            </b>
          </div>
        )
      })}
    </div>
  )
}

// Pick one of your cars.
function CarPicker({ cars, value, onChange, track, upgrades = {} }) {
  const { t } = useT()
  if (!cars.length) return <p className="market__empty">{t('You have no cars yet. Open a Turbo Minis box first!')}</p>
  return (
    <div className="car-picker" role="radiogroup" aria-label={t('Choose a car')}>
      {cars.map((f) => (
        <button key={f.id} type="button" role="radio" aria-checked={value === f.id} className={`car-picker__item ${value === f.id ? 'is-active' : ''}`} onClick={() => onChange(f.id)}>
          <Angel figure={f} size={86} />
          <span className="car-picker__name">{f.name}</span>
          <CarStats car={f} track={track} upgrade={upgrades[f.id]} />
        </button>
      ))}
    </div>
  )
}

// Race day: drive one of your cars around a track yourself, against the clock.
// The fastest time of the week on each track wins free wheel spins.
export default function RaceView({ userId, inventory, wallet, notify, onChanged, onProfile }) {
  const { t } = useT()
  const cars = useMemo(() => SERIES.flatMap((s) => [...s.figures, s.secret]).filter((f) => inventory[f.id] > 0), [inventory])
  const [track, setTrack] = useState(TRACKS[0].id)
  const [car, setCar] = useState(null)
  const [busy, setBusy] = useState(false)
  const [driving, setDriving] = useState(null) // { session, track, car } while you drive
  const [trial, setTrial] = useState(null) // result of your last drive: { time_ms, best, rank, new_best } or { error }
  const [hsKey, setHsKey] = useState(0)
  const garage = useGarage(userId)

  useEffect(() => {
    if (car && !cars.some((c) => c.id === car)) setCar(null)
    if (!car && cars.length) setCar(cars[0].id)
  }, [cars, car])

  const drive = async () => {
    if (!car) return
    setBusy(true)
    try {
      const session = await rpc('start_time_trial', { p_track: track, p_car: car })
      setTrial(null)
      // the car as it drives this race, with your upgrades (fixed for the whole race)
      const fig = FIGURE_BY_ID[car]
      setDriving({ session, track, car: { ...fig, stats: tunedStats(fig, garage.upgrades[car]) } })
    } catch (err) {
      notify(t(err.message))
    }
    setBusy(false)
  }

  const finishDrive = async (ms) => {
    const run = driving
    setDriving(null)
    // save the time (one retry if the connection hiccups)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await rpc('finish_time_trial', { p_session: run.session, p_time_ms: ms })
        setTrial({ ...r, track: run.track })
        setHsKey((k) => k + 1)
        onChanged() // the reward went into your budget
        return
      } catch (err) {
        if (attempt === 1 || !/fetch|network|load failed/i.test(err.message)) {
          setTrial({ error: err.message, time_ms: ms, track: run.track })
          return
        }
      }
    }
  }

  const selected = car && FIGURE_BY_ID[car]

  return (
    <section className="race">
      <div className="hero">
        <div>
          <h1 className="hero__title">{t('Race day!')}</h1>
          <p className="hero__text">{t('Pick a track and one of your cars, and drive it yourself. The fastest time of the week on each track wins free wheel spins.')}</p>
          <p className="hero__text">
            {t('Every race earns a medal and pocket money: gold {gold}, silver {silver}, bronze {bronze}, finished {finish} (the first {n} races of the day).', {
              gold: euro(MEDALS[0].reward),
              silver: euro(MEDALS[1].reward),
              bronze: euro(MEDALS[2].reward),
              finish: euro(FINISH_REWARD),
              n: PAID_RACES_PER_DAY,
            })}
          </p>
        </div>
      </div>

      {driving && <DriveGame trackId={driving.track} car={driving.car} onFinish={finishDrive} onQuit={() => setDriving(null)} />}

      <h2 className="section-title">{t('1. Pick a track')}</h2>
      <div className="choice-grid">
        {TRACKS.map((tr) => (
          <button key={tr.id} className={`choice ${track === tr.id ? 'is-active' : ''}`} onClick={() => setTrack(tr.id)}>
            <span className="choice__icon">{tr.icon}</span>
            <strong>{t(tr.name)}</strong>
            <span>{t(tr.text)}</span>
          </button>
        ))}
      </div>

      <h2 className="section-title">{t('2. Pick your car')}</h2>
      <CarPicker cars={cars} value={car} onChange={setCar} track={track} upgrades={garage.upgrades} />

      {selected && (
        <div className="race__actions">
          <div className="race__box race__box--drive">
            <h3>{t('Drive it yourself')}</h3>
            <p>{t('Steer {name} around the track yourself and set the fastest time of the week.', { name: selected.name })}</p>
            <p className="race__medals">
              {MEDALS.map((m) => (
                <span key={m.id} title={t(m.name)}>
                  {m.icon} {t('under {time}', { time: seconds(TRACK_BY_ID[track].medals[m.id]) })}
                </span>
              ))}
            </p>
            <button className="btn btn--primary" onClick={drive} disabled={busy}>
              🎮 {t('Drive!')}
            </button>
            {trial && trial.track === track && (
              <div className={`race__trial ${trial.error ? 'is-error' : ''}`}>
                {trial.error ? (
                  t(trial.error)
                ) : (
                  <>
                    <span className="race__medal">
                      {MEDALS.find((m) => m.id === trial.medal)?.icon || '🏁'} <strong>{seconds(trial.time_ms)}</strong>
                      {Number(trial.reward) > 0 ? (
                        <span className="race__reward">+{euro(Number(trial.reward))}</span>
                      ) : (
                        <span className="race__reward is-none">{t('No more prize money today')}</span>
                      )}
                    </span>
                    {trial.new_best ? t('New personal best! You are #{rank} this week.', { rank: trial.rank }) : t('Your best this week: {time} (#{rank})', { time: seconds(trial.best), rank: trial.rank })}
                    {Number(trial.reward) > 0 && <small className="race__left">{t('{n} paid races left today', { n: trial.paid_left })}</small>}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <TrialHighscores userId={userId} track={track} refreshKey={hsKey} onProfile={onProfile} />

      <Garage car={selected} garage={garage} wallet={wallet} notify={notify} onChanged={onChanged} />
    </section>
  )
}
