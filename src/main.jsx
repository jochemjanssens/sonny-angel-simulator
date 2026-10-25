import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import InstallBanner from './components/InstallBanner'
import { LanguageProvider } from './i18n'
import { BRAND, BRAND_NAME } from './brand'
import { applyInitialTheme } from './theme'
import './styles.css'

document.documentElement.dataset.brand = BRAND
document.title = `${BRAND_NAME} Simulator`
applyInitialTheme()

// installable app: the service worker gives a quick start and an offline fallback
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}))
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <App />
      <InstallBanner />
    </LanguageProvider>
  </StrictMode>,
)
