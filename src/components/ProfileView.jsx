import { useEffect, useState } from 'react'
import CarStatsMini from './race/CarStatsMini'
import Angel from './Angel'
import { FIGURE_BY_ID, SERIES, euro } from '../data/collections'
import { supabase } from '../lib/supabase'
import { useShelf } from './Swap'
import { useT } from '../i18n'

// A player's public profile: their shelf, what they're selling, and which of
// their figures you're still missing.
export default function ProfileView({ userId, meId, myInventory, listings, onBack, onGoMarket }) {
  const { t, lang } = useT()
  const shelf = useShelf(userId)
  const [profile, setProfile] = useState(null)
  const [missingOnly, setMissingOnly] = useState(false)
  const isMe = userId === meId

  useEffect(() => {
    supabase
      .from('profiles')
      .select('username, created_at')
      .eq('id', userId)
      .single()
      .then(({ data }) => setProfile(data))
  }, [userId])

  if (!shelf || !profile) return <p className="market__empty">{t('Loading profile…')}</p>

  const entries = Object.entries(shelf)
  const total = entries.reduce((s, [, n]) => s + n, 0)
  const value = entries.reduce((s, [id, n]) => s + FIGURE_BY_ID[id].value * n, 0)
  const missing = entries.filter(([id]) => !(myInventory[id] > 0)).length
  const theirListings = listings.filter((l) => l.seller_id === userId)
  const since = new Date(profile.created_at).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-GB', { month: 'long', year: 'numeric' })

  return (
    <section className="profile">
      <button className="link-back" onClick={onBack}>
        {t('← Back')}
      </button>
      <div className="profile__head">
        <div className="profile__avatar" aria-hidden>
          {profile.username?.[0]?.toUpperCase()}
        </div>
        <div>
          <h1>@{profile.username}</h1>
          <p className="profile__since">{t('Collecting since {date}', { date: since })}</p>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="stat__value">{total}</span>
          <span className="stat__label">{t('Figures')}</span>
        </div>
        <div className="stat">
          <span className="stat__value">{entries.length}</span>
          <span className="stat__label">{t('Unique')}</span>
        </div>
        <div className="stat">
          <span className="stat__value">{euro(value)}</span>
          <span className="stat__label">{t('Collection value')}</span>
        </div>
        {!isMe && (
          <div className="stat">
            <span className="stat__value">{missing}</span>
            <span className="stat__label">{t("Figures you don't have")}</span>
          </div>
        )}
      </div>

      {theirListings.length > 0 && (
        <>
          <h2 className="section-title">{isMe ? t('Your listings') : t('For sale by @{user}', { user: profile.username })}</h2>
          <div className="profile__listings">
            {theirListings.map((l) => (
              <button key={l.id} className="profile__listing" onClick={onGoMarket}>
                <Angel figure={FIGURE_BY_ID[l.figure_id]} size={48} />
                <span>{FIGURE_BY_ID[l.figure_id].name}</span>
                <CarStatsMini figure={FIGURE_BY_ID[l.figure_id]} />
                <strong>{euro(l.price)}</strong>
                {!isMe && !(myInventory[l.figure_id] > 0) && <span className="have have--no">{t('Missing')}</span>}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="profile__shelf-head">
        <h2 className="section-title">{isMe ? t('Your shelf') : t('Shelf of @{user}', { user: profile.username })}</h2>
        {!isMe && (
          <label className="toggle">
            <input type="checkbox" checked={missingOnly} onChange={(e) => setMissingOnly(e.target.checked)} />
            <span>{t("Only figures I don't have")}</span>
          </label>
        )}
      </div>

      {!entries.length && <p className="market__empty">{t('This shelf is still empty.')}</p>}
      {SERIES.map((s) => {
        const figs = [...s.figures, s.secret].filter((f) => shelf[f.id] && (!missingOnly || !(myInventory[f.id] > 0)))
        if (!figs.length) return null
        return (
          <div key={s.id} className="shelf" style={{ '--theme': s.theme }}>
            <div className="shelf__label">{s.name}</div>
            <div className="shelf__row">
              {figs.map((f) => (
                <div key={f.id} className="shelf__item">
                  {shelf[f.id] > 1 && <span className="count">×{shelf[f.id]}</span>}
                  <div className="shelf__figure">
                    <Angel figure={f} size={78} />
                    <span className="shelf__name">{f.name}</span>
                    <CarStatsMini figure={f} />
                  </div>
                  {!isMe && !(myInventory[f.id] > 0) ? (
                    <span className="shelf__sell shelf__sell--missing">{t('Missing')}</span>
                  ) : (
                    <span className="shelf__sell shelf__sell--muted">{euro(f.value)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}
