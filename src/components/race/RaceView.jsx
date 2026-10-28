import { useCallback, useEffect, useMemo, useState } from 'react'
import Angel from '../Angel'
import RaceTrack from './RaceTrack'
import PriceInput, { parsePrice } from '../PriceInput'
import { FIGURE_BY_ID, SERIES, euro } from '../../data/collections'
import { CPU_PAID_WINS, CPU_PRIZE, TRACKS, TRACK_BY_ID } from '../../data/cars'
import { rpc, supabase } from '../../lib/supabase'
import { useT } from '../../i18n'

const STAT_NAMES = { speed: 'Speed', accel: 'Acceleration', grip: 'Grip', weight: 'Weight' }

// The four stat bars of a car.
export function CarStats({ car, track }) {
  const { t } = useT()
  const w = track ? TRACK_BY_ID[track].weights : null
  return (
    <div className="car-stats">
      {Object.entries(STAT_NAMES).map(([k, label]) => (
        <div key={k} className={`car-stats__row ${w && w[k] >= 0.3 ? 'is-key' : ''}`}>
          <span>{t(label)}</span>
          <span className="car-stats__bar">
            <span style={{ width: `${car.stats[k] * 10}%` }} />
          </span>
          <b>{car.stats[k]}</b>
        </div>
      ))}
    </div>
  )
}

// Pick one of your cars.
function CarPicker({ cars, value, onChange, track }) {
  const { t } = useT()
  if (!cars.length) return <p className="market__empty">{t('You have no cars yet. Open a Turbo Minis box first!')}</p>
  return (
    <div className="car-picker" role="radiogroup" aria-label={t('Choose a car')}>
      {cars.map((f) => (
        <button key={f.id} type="button" role="radio" aria-checked={value === f.id} className={`car-picker__item ${value === f.id ? 'is-active' : ''}`} onClick={() => onChange(f.id)}>
          <Angel figure={f} size={86} />
          <span className="car-picker__name">{f.name}</span>
          <CarStats car={f} track={track} />
        </button>
      ))}
    </div>
  )
}

const stakeText = (t, ch) => (ch.stake_kind === 'car' ? t('Winner takes both cars') : t('Stake: {amount} each', { amount: euro(ch.stake_amount) }))

export default function RaceView({ userId, inventory, wallet, notify, onChanged, onProfile }) {
  const { t } = useT()
  const cars = useMemo(() => SERIES.flatMap((s) => [...s.figures, s.secret]).filter((f) => inventory[f.id] > 0), [inventory])
  const [track, setTrack] = useState('drag')
  const [car, setCar] = useState(null)
  const [race, setRace] = useState(null) // { track, runs, names, result }
  const [shown, setShown] = useState(false) // the race animation has finished
  const [stakeKind, setStakeKind] = useState('money')
  const [amount, setAmount] = useState('5,00')
  const [challenges, setChallenges] = useState([])
  const [accepting, setAccepting] = useState(null) // challenge being accepted
  const [acceptCar, setAcceptCar] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (car && !cars.some((c) => c.id === car)) setCar(null)
    if (!car && cars.length) setCar(cars[0].id)
  }, [cars, car])

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('race_challenges')
      .select('*, challenger:profiles!race_challenges_challenger_id_fkey(username), opponent:profiles!race_challenges_opponent_id_fkey(username)')
      .or(`status.eq.open,challenger_id.eq.${userId},opponent_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(100)
    setChallenges(data || [])
  }, [userId])

  useEffect(() => {
    load()
    const channel = supabase.channel('races').on('postgres_changes', { event: '*', schema: 'public', table: 'race_challenges' }, load).subscribe()
    return () => supabase.removeChannel(channel)
  }, [load])

  const play = (r) => {
    setShown(false)
    setRace(r)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const raceCpu = async () => {
    if (!car) return
    setBusy(true)
    try {
      const r = await rpc('race_cpu', { p_car: car, p_track: track })
      play({ track, runs: [r.me, r.cpu], names: [t('You'), t('Computer')], result: { kind: 'cpu', won: r.won, prize: Number(r.prize), left: r.paid_left } })
      onChanged()
    } catch (err) {
      notify(t(err.message))
    }
    setBusy(false)
  }

  const challenge = async () => {
    if (!car) return
    const amt = stakeKind === 'money' ? parsePrice(amount) : 0
    if (stakeKind === 'money' && !amt) return notify(t('Choose an amount to race for'))
    setBusy(true)
    try {
      await rpc('create_race_challenge', { p_car: car, p_track: track, p_kind: stakeKind, p_amount: amt })
      notify(t('Challenge posted! Other players can now race you.'))
      onChanged()
      load()
    } catch (err) {
      notify(t(err.message))
    }
    setBusy(false)
  }

  const accept = async () => {
    const ch = accepting
    if (!ch || !acceptCar) return
    setBusy(true)
    try {
      const r = await rpc('accept_race_challenge', { p_challenge: ch.id, p_car: acceptCar })
      const won = r.winner === userId
      setAccepting(null)
      play({
        track: ch.track_id,
        runs: [r.opponent, r.challenger],
        names: [t('You'), `@${ch.challenger?.username}`],
        result: { kind: 'challenge', won, stake: ch.stake_kind, amount: Number(ch.stake_amount), prizeCar: won ? ch.challenger_car : acceptCar },
      })
      onChanged()
      load()
    } catch (err) {
      notify(t(err.message))
    }
    setBusy(false)
  }

  const cancel = async (ch) => {
    try {
      await rpc('cancel_race_challenge', { p_challenge: ch.id })
      notify(t('Challenge cancelled — your car is back on your shelf'))
      onChanged()
      load()
    } catch (err) {
      notify(t(err.message))
    }
  }

  // replay a finished challenge from your own point of view
  const replay = (ch) => {
    const mine = ch.challenger_id === userId
    const other = mine ? ch.opponent?.username : ch.challenger?.username
    const runs = mine ? [ch.result.challenger, ch.result.opponent] : [ch.result.opponent, ch.result.challenger]
    const won = ch.winner_id === userId
    play({ track: ch.track_id, runs, names: [t('You'), `@${other}`], result: { kind: 'challenge', won, stake: ch.stake_kind, amount: Number(ch.stake_amount), prizeCar: mine ? ch.opponent_car : ch.challenger_car, replay: true } })
  }

  const open = challenges.filter((c) => c.status === 'open' && c.challenger_id !== userId)
  const mineOpen = challenges.filter((c) => c.status === 'open' && c.challenger_id === userId)
  const finished = challenges.filter((c) => c.status === 'done').slice(0, 12)
  const selected = car && FIGURE_BY_ID[car]

  return (
    <section className="race">
      <div className="hero">
        <div>
          <h1 className="hero__title">{t('Race day!')}</h1>
          <p className="hero__text">
            {t('Pick a track and one of your cars. Race the computer for pocket money ({prize} a win, {n} times a day), or challenge other players for money or for their car.', { prize: euro(CPU_PRIZE), n: CPU_PAID_WINS })}
          </p>
        </div>
      </div>

      {race && (
        <div className="race__stage">
          <h2 className="section-title">{t(TRACK_BY_ID[race.track].name)}</h2>
          <RaceTrack key={JSON.stringify(race.runs)} track={race.track} runs={race.runs} names={race.names} onDone={() => setShown(true)} />
          {shown && (
            <div className={`race__result ${race.result.won ? 'is-won' : 'is-lost'}`}>
              <strong>{race.result.won ? t('You won! 🏆') : t('You lost this one.')}</strong>
              <span>
                {race.result.kind === 'cpu'
                  ? race.result.won
                    ? race.result.prize
                      ? t('+{amount} pocket money ({n} paid wins left today)', { amount: euro(race.result.prize), n: race.result.left })
                      : t('No more prize money today, but a win is a win!')
                    : t('Try another car or another track.')
                  : race.result.stake === 'car'
                    ? race.result.won
                      ? t('{name} is now yours!', { name: FIGURE_BY_ID[race.result.prizeCar].name })
                      : t('{name} went to the winner.', { name: FIGURE_BY_ID[race.result.prizeCar].name })
                    : race.result.won
                      ? t('You won {amount}!', { amount: euro(race.result.amount * 2) })
                      : t('You lost your stake of {amount}.', { amount: euro(race.result.amount) })}
              </span>
              <button className="btn btn--ghost btn--sm" onClick={() => setRace(null)}>
                {t('Close')}
              </button>
            </div>
          )}
        </div>
      )}

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
      <CarPicker cars={cars} value={car} onChange={setCar} track={track} />

      {selected && (
        <div className="race__actions">
          <div className="race__box">
            <h3>{t('Race the computer')}</h3>
            <p>{t('A random car takes you on. Wins pay {prize}.', { prize: euro(CPU_PRIZE) })}</p>
            <button className="btn btn--primary" onClick={raceCpu} disabled={busy}>
              🏁 {t('Race now')}
            </button>
          </div>
          <div className="race__box">
            <h3>{t('Challenge a player')}</h3>
            <div className="mode-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={stakeKind === 'money'} className={stakeKind === 'money' ? 'is-active' : ''} onClick={() => setStakeKind('money')}>
                💶 {t('Money')}
              </button>
              <button type="button" role="tab" aria-selected={stakeKind === 'car'} className={stakeKind === 'car' ? 'is-active' : ''} onClick={() => setStakeKind('car')}>
                🚗 {t('The cars')}
              </button>
            </div>
            {stakeKind === 'money' ? (
              <PriceInput value={amount} onChange={setAmount} label={t('Stake (both pay this)')} />
            ) : (
              <p className="offer-form__note">{t('Winner takes both cars. Your {name} is on the line!', { name: selected.name })}</p>
            )}
            <button className="btn btn--primary" onClick={challenge} disabled={busy || (stakeKind === 'money' && (parsePrice(amount) || 0) > wallet)}>
              ⚔️ {t('Post challenge')}
            </button>
          </div>
        </div>
      )}

      <h2 className="section-title">{t('Open challenges')}</h2>
      {!open.length && <p className="market__empty">{t('No open challenges right now. Post one yourself!')}</p>}
      <div className="race__list">
        {open.map((ch) => (
          <article key={ch.id} className="race-card">
            <Angel figure={FIGURE_BY_ID[ch.challenger_car]} size={84} />
            <div className="race-card__info">
              <button className="user-link" onClick={() => onProfile(ch.challenger_id)}>
                @{ch.challenger?.username}
              </button>
              <span>
                {FIGURE_BY_ID[ch.challenger_car].name} · {TRACK_BY_ID[ch.track_id].icon} {t(TRACK_BY_ID[ch.track_id].name)}
              </span>
              <span className="race-card__stake">{stakeText(t, ch)}</span>
            </div>
            {accepting?.id === ch.id ? (
              <div className="race-card__accept">
                <p className="offer-form__note">{t('Race with which car?')}</p>
                <CarPicker cars={cars} value={acceptCar} onChange={setAcceptCar} track={ch.track_id} />
                <div className="listing__actions">
                  <button className="btn btn--primary btn--sm" onClick={accept} disabled={busy || !acceptCar || (ch.stake_kind === 'money' && ch.stake_amount > wallet)}>
                    🏁 {t('Race!')}
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => setAccepting(null)}>
                    {t('Cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn--primary btn--sm"
                disabled={!cars.length}
                onClick={() => {
                  setAccepting(ch)
                  setAcceptCar(cars[0]?.id)
                }}
              >
                {t('Accept')}
              </button>
            )}
          </article>
        ))}
      </div>

      {mineOpen.length > 0 && (
        <>
          <h2 className="section-title">{t('Your challenges')}</h2>
          <div className="race__list">
            {mineOpen.map((ch) => (
              <article key={ch.id} className="race-card">
                <Angel figure={FIGURE_BY_ID[ch.challenger_car]} size={84} />
                <div className="race-card__info">
                  <span>
                    {FIGURE_BY_ID[ch.challenger_car].name} · {TRACK_BY_ID[ch.track_id].icon} {t(TRACK_BY_ID[ch.track_id].name)}
                  </span>
                  <span className="race-card__stake">{stakeText(t, ch)}</span>
                  <span className="race-card__wait">{t('Waiting for someone to accept…')}</span>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={() => cancel(ch)}>
                  {t('Cancel')}
                </button>
              </article>
            ))}
          </div>
        </>
      )}

      {finished.length > 0 && (
        <>
          <h2 className="section-title">{t('Recent races')}</h2>
          <div className="race__list">
            {finished.map((ch) => {
              const won = ch.winner_id === userId
              const mine = ch.challenger_id === userId
              const other = mine ? ch.opponent?.username : ch.challenger?.username
              return (
                <article key={ch.id} className={`race-card race-card--done ${won ? 'is-won' : 'is-lost'}`}>
                  <Angel figure={FIGURE_BY_ID[mine ? ch.challenger_car : ch.opponent_car]} size={70} />
                  <div className="race-card__info">
                    <strong>{won ? t('Won against @{user}', { user: other }) : t('Lost to @{user}', { user: other })}</strong>
                    <span>
                      {TRACK_BY_ID[ch.track_id].icon} {t(TRACK_BY_ID[ch.track_id].name)} · {stakeText(t, ch)}
                    </span>
                  </div>
                  <button className="btn btn--ghost btn--sm" onClick={() => replay(ch)}>
                    ▶ {t('Replay')}
                  </button>
                </article>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
