import { useEffect, useState } from 'react'
import { DAILY_ALLOWANCE, euro } from '../data/collections'
import { LanguageSwitch, useT } from '../i18n'

// The allowance resets at midnight UTC, the same clock the server uses.
function untilMidnight() {
  const now = new Date()
  const next = new Date(now)
  next.setUTCHours(24, 0, 0, 0)
  const s = Math.max(0, Math.floor((next - now) / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

export default function Header({ tab, setTab, wallet, canClaim, onClaim, canSpin, onWheel, ownedUnique, totalUnique, marketBadge, username, onLogout }) {
  const [countdown, setCountdown] = useState(untilMidnight)
  const { t } = useT()

  useEffect(() => {
    const t = setInterval(() => setCountdown(untilMidnight()), 30_000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="header">
      <div className="header__inner">
        <button className="logo" onClick={() => setTab('collections')} aria-label="Home">
          <svg className="logo__wings" viewBox="0 0 40 24" aria-hidden>
            <path d="M18 14 C8 2 0 8 2 14 C4 20 12 20 18 16 Z" />
            <path d="M22 14 C32 2 40 8 38 14 C36 20 28 20 22 16 Z" />
          </svg>
          <span className="logo__name">Sonny Angel</span>
          <span className="logo__sub">simulator</span>
        </button>

        <nav className="tabs">
          <button className={`tabs__tab ${tab === 'collections' ? 'is-active' : ''}`} onClick={() => setTab('collections')}>
            {t('Collections')}
          </button>
          <button className={`tabs__tab ${tab === 'shelf' ? 'is-active' : ''}`} onClick={() => setTab('shelf')}>
            {t('My Shelf')} <span className="tabs__count">{ownedUnique}/{totalUnique}</span>
          </button>
          <button className={`tabs__tab ${tab === 'market' ? 'is-active' : ''}`} onClick={() => setTab('market')}>
            {t('Market')} {marketBadge > 0 && <span className="dot-badge">{marketBadge}</span>}
          </button>
          <button className={`tabs__tab ${tab === 'puzzles' ? 'is-active' : ''}`} onClick={() => setTab('puzzles')}>
            {t('Puzzles')}
          </button>
        </nav>

        <div className="wallet">
          <div className="wallet__balance" title={t('Your budget')}>
            <span className="wallet__label">{t('Budget')}</span>
            <span className="wallet__amount">{euro(wallet)}</span>
          </div>
          {canClaim ? (
            <button className="btn btn--primary btn--sm wallet__claim" onClick={onClaim}>
              {t('+ {amount} daily', { amount: euro(DAILY_ALLOWANCE) })}
            </button>
          ) : (
            <span className="wallet__next" title={t('Next daily allowance')}>
              {t('Next allowance in {time}', { time: countdown })}
            </span>
          )}
          <button className={`wheel-btn ${canSpin ? 'is-ready' : ''}`} onClick={onWheel} title={canSpin ? t('Spin the lucky wheel!') : t('Lucky wheel')}>
            🎡 {canSpin && <span>{t('Spin')}</span>}
          </button>
          <div className="user">
            <span className="user__name">@{username}</span>
            <button className="user__logout" onClick={onLogout}>
              {t('Log out')}
            </button>
          </div>
          <LanguageSwitch />
        </div>
      </div>
    </header>
  )
}
