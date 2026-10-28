import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import InstallBanner from './components/InstallBanner'
import { LanguageProvider } from './i18n'
import { BRAND, BRANDS, BRAND_NAME } from './brand'
import { applyInitialTheme } from './theme'
import './styles.css'

document.documentElement.dataset.brand = BRAND
document.title = `${BRAND_NAME} Simulator`
// the phone's status bar follows the brand
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BRANDS[BRAND].theme)
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
