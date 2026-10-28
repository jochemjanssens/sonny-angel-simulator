import { useCallback, useEffect, useState } from 'react'
import Confetti from '../Confetti'
import { MAX_STAT, PARTS, PART_BY_ID, UPGRADE_BOX_PRICE } from '../../data/cars'
import { euro } from '../../data/collections'
import { rpc, supabase } from '../../lib/supabase'
import { useT } from '../../i18n'

const STAT_ICONS = { speed: '⚡', accel: '🚀', grip: '🛞', weight: '⚖️' }
const RARITY = { common: 'Common', rare: 'Rare', legendary: 'Legendary' }

// Your parts (not fitted yet) and the upgrades on each of your car models.
export function useGarage(userId) {
  const [parts, setParts] = useState({})
  const [upgrades, setUpgrades] = useState({})
  const refresh = useCallback(async () => {
    const [p, u] = await Promise.all([
      supabase.from('part_inventory').select('part_id, count').eq('user_id', userId),
      supabase.from('car_upgrades').select('figure_id, speed, accel, grip, weight').eq('user_id', userId),
    ])
    if (!p.error) setParts(Object.fromEntries(p.data.filter((r) => r.count > 0).map((r) => [r.part_id, r.count])))
    if (!u.error) setUpgrades(Object.fromEntries(u.data.map((r) => [r.figure_id, r])))
  }, [userId])
  useEffect(() => {
    refresh()
  }, [refresh])
  return { parts, upgrades, refresh }
}

const bonusText = (part) =>
  Object.entries(part.bonus)
    .map(([k, v]) => `${STAT_ICONS[k]} +${v}`)
    .join(' ')

// How much a part would actually add to a car (stats stop at 10).
export function gain(car, upgrade, part) {
  let total = 0
  for (const [k, v] of Object.entries(part.bonus)) total += Math.max(0, Math.min(v, MAX_STAT - car.stats[k] - (upgrade?.[k] || 0)))
  return total
}

// The upgrade box being opened: a shaking crate, then the part that came out.
export function UpgradeBoxOpener({ part, car, canFit, onFit, onClose }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setOpen(true), 1300)
    return () => clearTimeout(id)
  }, [])
  const p = PART_BY_ID[part]
  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={open ? onClose : undefined}>
      <div className={`modal__card upgrade-open ${open ? `is-open rarity--${p.rarity}` : ''}`} onClick={(e) => e.stopPropagation()}>
        {open && p.rarity !== 'common' && <Confetti gold={p.rarity === 'legendary'} count={p.rarity === 'legendary' ? 90 : 50} />}
        {!open ? (
          <div className="upgrade-open__crate" aria-label={t('Opening…')}>
            📦
          </div>
        ) : (
          <>
            <span className={`upgrade-open__rarity rarity--${p.rarity}`}>{t(RARITY[p.rarity])}</span>
            <div className="upgrade-open__icon">{p.icon}</div>
            <h2>{t(p.name)}</h2>
            <p className="upgrade-open__bonus">{bonusText(p)}</p>
            <div className="reveal__actions">
              <button className="btn btn--ghost" onClick={onClose}>
                {t('Keep it in the garage')}
              </button>
              {car && canFit && (
                <button className="btn btn--primary" onClick={onFit}>
                  🔧 {t('Fit on {name}', { name: car.name })}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// The garage on the race page: buy upgrade boxes and fit parts on the car
// that's selected above.
export default function Garage({ car, garage, wallet, notify, onChanged }) {
  const { t } = useT()
  const [opening, setOpening] = useState(null) // part id
  const [busy, setBusy] = useState(false)
  const { parts, upgrades } = garage
  const upgrade = car ? upgrades[car.id] : null

  const buy = async () => {
    setBusy(true)
    try {
      const part = await rpc('open_upgrade_box')
      setOpening(part)
      garage.refresh()
      onChanged()
    } catch (err) {
      notify(t(err.message))
    }
    setBusy(false)
  }

  const fit = async (partId) => {
    setBusy(true)
    try {
      await rpc('apply_upgrade', { p_part: partId, p_car: car.id })
      notify(t('{part} fitted on {name}!', { part: t(PART_BY_ID[partId].name), name: car.name }))
      garage.refresh()
    } catch (err) {
      notify(t(err.message))
    }
    setBusy(false)
  }

  const owned = PARTS.filter((p) => parts[p.id] > 0)

  return (
    <div className="garage">
      <h2 className="section-title">🔧 {t('Garage')}</h2>
      <div className="garage__grid">
        <div className="race__box">
          <h3>{t('Upgrade box')}</h3>
          <p>{t('One tuning part per box: engines, turbos, tyres or ballast. Rare parts give +2, a Tuning Kit +1 on everything.')}</p>
          <button className="btn btn--primary" onClick={buy} disabled={busy || wallet < UPGRADE_BOX_PRICE}>
            📦 {t('Open an upgrade box · {price}', { price: euro(UPGRADE_BOX_PRICE) })}
          </button>
        </div>
        <div className="race__box">
          <h3>{t('Your parts')}</h3>
          {!owned.length ? (
            <p>{t('No parts yet. Open an upgrade box!')}</p>
          ) : (
            <ul className="garage__parts">
              {owned.map((p) => {
                const adds = car ? gain(car, upgrade, p) : 0
                return (
                  <li key={p.id} className={`rarity--${p.rarity}`}>
                    <span className="garage__part-icon">{p.icon}</span>
                    <span className="garage__part-name">
                      {t(p.name)} {parts[p.id] > 1 && <b>×{parts[p.id]}</b>}
                      <small>{bonusText(p)}</small>
                    </span>
                    {car && (
                      <button className="btn btn--ghost btn--sm" disabled={busy || !adds} onClick={() => fit(p.id)} title={!adds ? t('This car is already maxed out for that part') : undefined}>
                        {adds ? t('Fit on {name}', { name: car.name }) : t('Maxed out')}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
      {opening && (
        <UpgradeBoxOpener
          part={opening}
          car={car}
          canFit={car && gain(car, upgrade, PART_BY_ID[opening]) > 0}
          onFit={() => {
            fit(opening)
            setOpening(null)
          }}
          onClose={() => setOpening(null)}
        />
      )}
    </div>
  )
}
