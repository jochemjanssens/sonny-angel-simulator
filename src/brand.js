// Which collectible the app is showing: 'sonny' (Sonny Angel), 'smiski' or
// 'cars' (Turbo Minis). All live in one app: ?brand=… (from the brand menu or
// an app shortcut) picks one and is remembered; otherwise the last choice is
// used. Accounts and money are shared between them.
const KEY = 'brand'

export const BRANDS = {
  sonny: { name: 'Sonny Angel', theme: '#E4002B' },
  smiski: { name: 'Smiski', theme: '#11131B' },
  cars: { name: 'Turbo Minis', theme: '#F25C05' },
}
const isBrand = (b) => Object.hasOwn(BRANDS, b)

function pickBrand() {
  if (typeof window === 'undefined') return 'sonny' // e.g. the catalog script in Node
  const url = new URL(window.location.href)
  const asked = url.searchParams.get('brand')
  if (isBrand(asked)) {
    try {
      localStorage.setItem(KEY, asked)
    } catch {
      /* storage unavailable */
    }
    // keep the address clean; sign-in links and reloads then keep the choice
    url.searchParams.delete('brand')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
    return asked
  }
  try {
    const saved = localStorage.getItem(KEY)
    if (isBrand(saved)) return saved
  } catch {
    /* storage unavailable */
  }
  return 'sonny'
}

export const BRAND = pickBrand()
export const BRAND_NAME = BRANDS[BRAND].name
export const isSmiski = BRAND === 'smiski'
export const isCars = BRAND === 'cars'
// the brand menu switches by loading the app with ?brand=…
export const brandUrl = (b) => `./?brand=${b}`
