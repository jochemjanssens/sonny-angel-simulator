// Prices go to the cent and accept a comma or a dot as decimal separator
// ("12,35" and "12.35" are both €12.35).
const PRICE_RE = /^\d{1,6}([.,]\d{1,2})?$/

export const parsePrice = (v) => {
  const s = String(v).trim().replace(/\s|€/g, '')
  if (!PRICE_RE.test(s)) return null
  const n = Math.round(Number(s.replace(',', '.')) * 100) / 100
  return n > 0 && n <= 100000 ? n : null
}

// Shows an amount the Dutch way, ready for editing: 12.5 → "12,50".
export const formatPrice = (n) => Number(n).toFixed(2).replace('.', ',')

export default function PriceInput({ value, onChange, autoFocus = false, label = 'Price in euros' }) {
  const change = (raw) => {
    // keep digits and one decimal separator with at most two decimals
    const cleaned = raw.replace(/[^\d.,]/g, '')
    const m = cleaned.match(/^(\d{0,6})([.,]\d{0,2})?/)
    onChange(m ? m[1] + (m[2] || '') : '')
  }
  return (
    <label className="price-input">
      <span aria-hidden>€</span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        aria-label={label}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => change(e.target.value)}
      />
    </label>
  )
}
