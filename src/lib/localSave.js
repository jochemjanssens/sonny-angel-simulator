// The pre-online version kept progress in the browser. It can be imported once.
const STORAGE_KEY = 'sonny-angel-sim-v1'

export function readLocalSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const save = JSON.parse(raw)
    const inventory = { ...save.inventory }
    // figures seen but sold keep a 0 count, so the line-up still shows them as Sold
    for (const id of Object.keys(save.firstSeen || {})) inventory[id] ??= 0
    const figures = Object.values(inventory).reduce((s, n) => s + n, 0)
    if (!figures && !save.stats?.opened) return null
    return { wallet: save.wallet ?? 0, inventory, stats: save.stats || {}, figures }
  } catch {
    return null
  }
}

export function clearLocalSave() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable */
  }
}
