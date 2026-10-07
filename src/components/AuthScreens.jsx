import { useState } from 'react'
import Angel from './Angel'
import BoxArt from './BoxArt'
import { SERIES, euro } from '../data/collections'
import { rpc, supabase } from '../lib/supabase'
import { clearLocalSave } from '../lib/localSave'
import { LanguageSwitch, useT } from '../i18n'

function AuthCard({ children }) {
  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__lang">
          <LanguageSwitch />
        </div>
        <div className="auth__logo">
          <span className="logo__name">Sonny Angel</span>
          <span className="logo__sub">simulator</span>
        </div>
        <div className="auth__art">
          <Angel figure={SERIES[0].figures[0]} size={90} />
        </div>
        {children}
      </div>
    </div>
  )
}

export function SetupNeeded() {
  const { t } = useT()
  return (
    <AuthCard>
      <h1>{t('Almost there')}</h1>
      <p>
        This copy isn't connected to a Supabase project yet. Add <code>VITE_SUPABASE_URL</code> and{' '}
        <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env.local</code> and restart the dev server.
      </p>
    </AuthCard>
  )
}

// Figures that float around the hero box and scroll past in the strip.
const pick = (sid, i) => SERIES.find((x) => x.id === sid).figures[i]
const FLOATERS = [
  { fig: pick('animal1', 0), x: '6%', y: '8%', size: 92, delay: 0 },
  { fig: pick('fruit', 1), x: '74%', y: '2%', size: 84, delay: 0.8 },
  { fig: pick('cat', 1), x: '82%', y: '52%', size: 96, delay: 1.6 },
  { fig: pick('flower', 6), x: '0%', y: '56%', size: 86, delay: 2.2 },
  { fig: pick('sweets', 1), x: '64%', y: '78%', size: 70, delay: 1.1 },
]
const PARADE = SERIES.map((x, i) => x.figures[(i * 5) % x.figures.length])

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const { t } = useT()
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    })
    setBusy(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  const figureCount = SERIES.reduce((n, x) => n + x.figures.length + 1, 0)

  return (
    <div className="landing">
      <header className="landing__nav">
        <span className="logo">
          <span className="logo__name">Sonny Angel</span>
          <span className="logo__sub">simulator</span>
        </span>
        <span className="landing__navright">
          <a className="landing__navlink" href="#how">
            {t('How it works')}
          </a>
          <LanguageSwitch />
        </span>
      </header>

      <section className="landing__hero">
        <div className="landing__copy">
          <span className="landing__eyebrow">{t('✦ Blind boxes · Collecting · Trading')}</span>
          <h1 className="landing__title">
            {t('Open. Collect.')}
            <br />
            <span>{t('Trade.')}</span>
          </h1>
          <p className="landing__lead">
            {t("Unbox {figures} angels across {series} series, chase the 1-in-144 secrets, and trade with real players. Make offers, counter, and haggle until it's a deal.", { figures: figureCount, series: SERIES.length })}
          </p>

          <div className="landing__card">
            {sent ? (
              <div className="landing__sent">
                <span className="landing__mail" aria-hidden>
                  ✉
                </span>
                <h2>{t('Check your inbox')}</h2>
                <p>{t("We sent a magic link to {email}. Open it on this device and you're in.", { email })}</p>
                <button className="btn btn--ghost btn--sm" onClick={() => setSent(false)}>
                  {t('Use another email')}
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="landing__form">
                <label htmlFor="login-email">{t("Start collecting, it's free")}</label>
                <div className="landing__row">
                  <input
                    id="login-email"
                    className="text-input"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder={t('you@example.com')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button className="btn btn--primary" disabled={busy}>
                    {busy ? t('Sending…') : t('Get my link')}
                  </button>
                </div>
                <p className="landing__fine">{t('No password needed. We email you a one-tap sign-in link.')}</p>
                {error && <p className="auth__error">{error}</p>}
              </form>
            )}
          </div>
        </div>

        <div className="landing__stage" aria-hidden>
          <div className="landing__glow" />
          <div className="landing__box">
            <BoxArt series={SERIES[0]} size="lg" />
          </div>
          {FLOATERS.map((f, i) => (
            <div
              key={i}
              className="landing__floater"
              style={{ left: f.x, top: f.y, animationDelay: `${f.delay}s` }}
            >
              <Angel figure={f.fig} size={f.size} />
            </div>
          ))}
          <span className="landing__spark" style={{ left: '30%', top: '14%' }}>✦</span>
          <span className="landing__spark" style={{ left: '64%', top: '38%', animationDelay: '0.7s' }}>✦</span>
          <span className="landing__spark" style={{ left: '22%', top: '46%', animationDelay: '1.4s' }}>✦</span>
        </div>
      </section>

      <div className="landing__parade" aria-hidden>
        <div className="landing__parade-track">
          {[...PARADE, ...PARADE].map((f, i) => (
            <Angel key={i} figure={f} size={64} />
          ))}
        </div>
      </div>

      <section className="landing__features" id="how">
        <article>
          <span className="landing__icon">🎁</span>
          <h3>{t('Open blind boxes')}</h3>
          <p>{t('Every box hides a surprise. A daily allowance keeps you unboxing, and secrets turn up only once in 144 boxes.')}</p>
        </article>
        <article>
          <span className="landing__icon">🧸</span>
          <h3>{t('Build your shelf')}</h3>
          <p>{t("Line up every series, track your collection's value, and see which angels you're still missing.")}</p>
        </article>
        <article>
          <span className="landing__icon">🤝</span>
          <h3>{t('Trade with real players')}</h3>
          <p>{t("List your duplicates at your own price, make offers on others' figures, and counter until you agree.")}</p>
        </article>
      </section>

      <footer className="footer">{t('A fan-made simulator for fun · Not affiliated with Sonny Angel or Dreams Inc.')}</footer>
    </div>
  )
}

export function UsernameScreen({ localSave, canImport, onDone }) {
  const [name, setName] = useState('')
  const [importSave, setImportSave] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const offerImport = canImport && localSave
  const { t } = useT()

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await rpc('set_username', { p_name: name })
      if (offerImport && importSave) {
        await rpc('import_local_save', {
          p_wallet: localSave.wallet,
          p_inventory: localSave.inventory,
          p_stats: localSave.stats,
        })
        clearLocalSave()
      }
      onDone()
    } catch (err) {
      setError(t(err.message))
      setBusy(false)
    }
  }

  return (
    <AuthCard>
      <form onSubmit={submit} className="auth__form">
        <h1>{t('Pick a username')}</h1>
        <p>{t('Other players see this name on your listings and offers.')}</p>
        <input
          className="text-input"
          required
          minLength={3}
          maxLength={20}
          pattern="[A-Za-z0-9_]{3,20}"
          title={t('3–20 letters, numbers or underscores')}
          placeholder="angel_collector"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {offerImport && (
          <label className="auth__import">
            <input type="checkbox" checked={importSave} onChange={(e) => setImportSave(e.target.checked)} />
            <span>
              {t('Bring my current shelf from this browser: {figures} figures and {amount}. This can only be done once.', { figures: localSave.figures, amount: euro(localSave.wallet) })}
            </span>
          </label>
        )}
        <button className="btn btn--primary btn--lg" disabled={busy}>
          {busy ? t('Saving…') : t('Start playing')}
        </button>
        {error && <p className="auth__error">{error}</p>}
      </form>
    </AuthCard>
  )
}
