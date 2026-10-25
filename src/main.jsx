import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { LanguageProvider } from './i18n'
import { BRAND, BRAND_NAME } from './brand'
import { applyInitialTheme } from './theme'
import './styles.css'

document.documentElement.dataset.brand = BRAND
document.title = `${BRAND_NAME} Simulator`
applyInitialTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
)
