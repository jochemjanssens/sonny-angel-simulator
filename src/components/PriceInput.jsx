export const parsePrice = (v) => {
  const n = Math.round(Number(v) * 100) / 100
  return n > 0 && n <= 100000 ? n : null
}

export default function PriceInput({ value, onChange, autoFocus = false, label = 'Price in euros' }) {
  return (
    <label className="price-input">
      <span aria-hidden>€</span>
      <input
        type="number"
        min="0.5"
        max="100000"
        step="0.5"
        inputMode="decimal"
        aria-label={label}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
