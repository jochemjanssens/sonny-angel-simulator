import { useEffect, useState } from 'react'
import { BRAND_NAME } from '../brand'
import { useT } from '../i18n'

const KEY = 'install-banner-dismissed'

// "Install the app" banner. Chrome on Android tells the page when the app can
// be installed; the banner shows until it's installed or dismissed.
export default function InstallBanner() {
  const { t } = useT()
  const [prompt, setPrompt] = useState(null)

  useEffect(() => {
    let dismissed = false
    try {
      dismissed = localStorage.getItem(KEY) === '1'
    } catch {
      /* storage unavailable */
    }
    if (dismissed) return
    const onPrompt = (e) => {
      e.preventDefault()
      setPrompt(e)
    }
    const onInstalled = () => setPrompt(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!prompt) return null

  const dismiss = () => {
    setPrompt(null)
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* storage unavailable */
    }
  }

  return (
    <div className="install" role="dialog" aria-label={t('Install the app')}>
      <img src={document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href') || ''} alt="" className="install__icon" />
      <span className="install__text">
        <strong>{t('Install the app')}</strong>
        <span>{t('Put {name} on your home screen, full screen and one tap away.', { name: BRAND_NAME })}</span>
      </span>
      <button
        className="btn btn--primary btn--sm"
        onClick={async () => {
          prompt.prompt()
          await prompt.userChoice
          setPrompt(null)
        }}
      >
        {t('Install')}
      </button>
      <button className="install__close" onClick={dismiss} aria-label={t('Not now')}>
        ×
      </button>
    </div>
  )
}
