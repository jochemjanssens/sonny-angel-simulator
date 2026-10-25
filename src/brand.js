// Which collectible the app is showing: 'sonny' (Sonny Angel) or 'smiski'.
// Both live in one app: ?brand=smiski (from the switch button or an app
// shortcut) picks one and is remembered; otherwise the last choice is used.
// Accounts and money are shared between the two.
const KEY = 'brand'

function pickBrand() {
  if (typeof window === 'undefined') return 'sonny' // e.g. the catalog script in Node
  const url = new URL(window.location.href)
  const asked = url.searchParams.get('brand')
  if (asked === 'sonny' || asked === 'smiski') {
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
    if (saved === 'sonny' || saved === 'smiski') return saved
  } catch {
    /* storage unavailable */
  }
  return 'sonny'
}

export const BRAND = pickBrand()
export const BRAND_NAME = BRAND === 'smiski' ? 'Smiski' : 'Sonny Angel'
export const isSmiski = BRAND === 'smiski'
// where the switch button goes: the same app, the other brand
export const otherBrandUrl = () => `./?brand=${isSmiski ? 'sonny' : 'smiski'}`
