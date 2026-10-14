import { makeRandom } from './random.js'

// Tafel-kampioen: answer as many times-table sums as you can in one minute.
// Every correct answer pays TABLES_SIZES[size].reward; the server pays it out.
export const TABLES_SECONDS = 60
export const TABLES_SIZES = {
  small: { tables: [1, 2, 3, 4, 5, 10], label: 'Tables 1–5 and 10', reward: 0.15 },
  medium: { tables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], label: 'Tables 1–10', reward: 0.3 },
  large: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], label: 'Tables 1–10 with dividing', divide: true, reward: 0.45 },
}

// Endless stream of sums, rebuilt from the seed. From level 3 the easy
// tables (×1 and ×10) drop out and the other factor is 2–9.
export function makeTables(size, seed, level = 0) {
  const { tables, divide } = TABLES_SIZES[size]
  const pool = level >= 3 && tables.length > 3 ? tables.filter((t) => t !== 1 && t !== 10) : tables
  const r = makeRandom(seed)
  let last = ''
  const next = () => {
    for (;;) {
      const a = r.pick(pool)
      const b = level >= 3 ? 2 + r.int(8) : 1 + r.int(10)
      const q = divide && r.next() < 0.5 ? { text: `${a * b} : ${a}`, answer: b } : r.next() < 0.5 ? { text: `${a} × ${b}`, answer: a * b } : { text: `${b} × ${a}`, answer: a * b }
      if (q.text !== last) return (last = q.text), q
    }
  }
  return { size, seed, level, next }
}
