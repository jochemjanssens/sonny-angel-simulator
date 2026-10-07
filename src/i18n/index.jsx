import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { setMoneyLocale } from '../data/collections'
import NL from './nl.js'

// English text is the key; Dutch translations live in nl.js. Missing
// translations fall back to the English text.
const LangContext = createContext({ lang: 'en', setLang: () => {}, t: (s) => s })
const STORAGE_KEY = 'sonny-angel-lang'

function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'nl' || saved === 'en') return saved
  } catch {
    /* storage unavailable */
  }
  return (navigator.language || '').toLowerCase().startsWith('nl') ? 'nl' : 'en'
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(initialLang)
  // amounts follow the language: € 12,35 in Dutch, €12.35 in English
  useMemo(() => setMoneyLocale(lang), [lang])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* storage unavailable */
    }
    document.documentElement.lang = lang
  }, [lang])

  const t = useCallback(
    (text, vars) => {
      let s = lang === 'nl' ? (NL[text] ?? text) : text
      if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''))
      return s
    },
    [lang],
  )

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

export const useT = () => useContext(LangContext)

export function LanguageSwitch() {
  const { lang, setLang } = useT()
  return (
    <div className="lang" role="group" aria-label="Language / Taal">
      {['nl', 'en'].map((l) => (
        <button key={l} className={lang === l ? 'is-active' : ''} onClick={() => setLang(l)} aria-pressed={lang === l}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
