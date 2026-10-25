// Which collectible this build is about: 'sonny' (Sonny Angel) or 'smiski'.
// Set with VITE_BRAND at build time; both versions share accounts and money.
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {}
export const BRAND = env.VITE_BRAND === 'smiski' ? 'smiski' : 'sonny'
export const BRAND_NAME = BRAND === 'smiski' ? 'Smiski' : 'Sonny Angel'
export const isSmiski = BRAND === 'smiski'
