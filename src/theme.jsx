import { useEffect, useState } from 'react'
import { BRAND, isSmiski, otherBrandUrl } from './brand'
import { useT } from './i18n'

// Light or dark mode (Smiski build only): in the dark the figures glow.
// Follows the device setting until the player picks one.
const KEY = 'smiski-theme'

function initialTheme() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    /* storage unavailable */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Called once at startup so the right theme is there before anything renders.
export function applyInitialTheme() {
  if (isSmiski) document.documentElement.dataset.theme = initialTheme()
}

export function ThemeToggle() {
  const { t } = useT()
  const [theme, setTheme] = useState(initialTheme)

  useEffect(() => {
    if (isSmiski) document.documentElement.dataset.theme = theme
  }, [theme])

  if (!isSmiski) return null
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      className="theme-toggle"
      onClick={() => {
        setTheme(next)
        try {
          localStorage.setItem(KEY, next)
        } catch {
          /* storage unavailable */
        }
      }}
      title={theme === 'dark' ? t('Lights on') : t('Lights off — watch them glow')}
      aria-label={theme === 'dark' ? t('Lights on') : t('Lights off — watch them glow')}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}

// Small logo mark: Sonny Angel wings or a Smiski head.
export function LogoMark({ brand = BRAND }) {
  if (brand === 'smiski') {
    return (
      <svg className="logo__wings logo__smiski" viewBox="0 0 40 30" aria-hidden>
        <ellipse cx="20" cy="15" rx="13" ry="12" />
        <circle cx="16" cy="16.5" r="1.4" className="logo__eye" />
        <circle cx="24" cy="16.5" r="1.4" className="logo__eye" />
      </svg>
    )
  }
  return (
    <svg className="logo__wings" viewBox="0 0 40 24" aria-hidden>
      <path d="M18 14 C8 2 0 8 2 14 C4 20 12 20 18 16 Z" />
      <path d="M22 14 C32 2 40 8 38 14 C36 20 28 20 22 16 Z" />
    </svg>
  )
}

// Switches the app between Sonny Angel and Smiski (same account, so you stay signed in).
export function BrandSwitch() {
  const { t } = useT()
  const other = isSmiski ? 'sonny' : 'smiski'
  const name = isSmiski ? 'Sonny Angel' : 'Smiski'
  return (
    <a className={`brand-switch brand-switch--${other}`} href={otherBrandUrl()} title={t('Switch to {name}', { name })} aria-label={t('Switch to {name}', { name })}>
      <LogoMark brand={other} />
      <span className="brand-switch__name">{name}</span>
    </a>
  )
}
