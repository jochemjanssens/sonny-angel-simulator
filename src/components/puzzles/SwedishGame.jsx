import { useMemo, useRef, useState } from 'react'
import { useT } from '../../i18n'

const STEP = { across: [0, 1], down: [1, 0] }
const cellsOf = (w) => [...w.word].map((_, i) => [w.row + STEP[w.dir][0] * i, w.col + STEP[w.dir][1] * i])

// Swedish puzzle: tap a white cell and type. The clue sits in the cell before each word.
export default function SwedishGame({ puzzle, onSolved }) {
  const { t } = useT()
  const { n, cells, words } = puzzle
  // letters shown from the start on easier levels; they can't be changed
  const givenKeys = useMemo(() => {
    const set = new Set()
    cells.forEach((row, r) => row.forEach((cell, c) => cell.given && set.add(`${r},${c}`)))
    return set
  }, [cells])
  const [letters, setLetters] = useState(() =>
    Object.fromEntries([...givenKeys].map((k) => [k, cells[k.split(',')[0]][k.split(',')[1]].letter])),
  )
  const [active, setActive] = useState(null) // { word: index, pos: index within word }
  const [checked, setChecked] = useState(false)
  const inputRef = useRef(null)
  const solvedSent = useRef(false)

  const wordsAt = useMemo(() => {
    const map = new Map()
    words.forEach((w, wi) => cellsOf(w).forEach(([r, c], pos) => map.set(`${r},${c}`, [...(map.get(`${r},${c}`) || []), { wi, pos }])))
    return map
  }, [words])

  const activeCells = active ? cellsOf(words[active.word]) : []
  const activeSet = new Set(activeCells.map((c) => c.join(',')))
  const cursor = active ? activeCells[active.pos].join(',') : null

  // Keystrokes can arrive faster than React re-renders, so the latest
  // letters and cursor live in a ref that every handler reads and updates.
  const live = useRef({ letters, active })
  const update = (nextLetters, nextActive) => {
    live.current = { letters: nextLetters, active: nextActive }
    setLetters(nextLetters)
    setActive(nextActive)
  }

  const select = (r, c) => {
    const options = wordsAt.get(`${r},${c}`) || []
    if (!options.length) return
    // tapping the same cell again switches between the across and down word
    const cur = live.current.active
    const curKey = cur ? cellsOf(words[cur.word])[cur.pos].join(',') : null
    const current = cur && curKey === `${r},${c}` ? options.findIndex((o) => o.wi === cur.word) : -1
    const next = options[(current + 1) % options.length]
    update(live.current.letters, { word: next.wi, pos: next.pos })
    setChecked(false)
    inputRef.current?.focus({ preventScroll: true })
  }

  const write = (char) => {
    const { letters: prev, active: act } = live.current
    if (!act) return
    const wordCells = cellsOf(words[act.word])
    // skip over letters that were given
    let at = act.pos
    while (at < wordCells.length - 1 && givenKeys.has(wordCells[at].join(','))) at++
    const key = wordCells[at].join(',')
    if (givenKeys.has(key)) return
    const next = { ...prev, [key]: char }
    const pos = char && at < wordCells.length - 1 ? at + 1 : at
    update(next, { ...act, pos })
    const allRight = [...wordsAt.keys()].every((k) => {
      const [r, c] = k.split(',').map(Number)
      return next[k] === cells[r][c].letter
    })
    if (allRight && !solvedSent.current) {
      solvedSent.current = true
      setTimeout(onSolved, 400)
    }
  }

  const onKeyDown = (e) => {
    const { letters: prev, active: act } = live.current
    if (!act) return
    const wordCells = cellsOf(words[act.word])
    const key = wordCells[act.pos].join(',')
    if (e.key === 'Backspace') {
      e.preventDefault()
      const prevKey = act.pos > 0 ? wordCells[act.pos - 1].join(',') : null
      if (prev[key] && !givenKeys.has(key)) update({ ...prev, [key]: '' }, act)
      else if (prevKey) update(givenKeys.has(prevKey) ? prev : { ...prev, [prevKey]: '' }, { ...act, pos: act.pos - 1 })
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      update(prev, { ...act, pos: Math.min(wordCells.length - 1, act.pos + 1) })
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      update(prev, { ...act, pos: Math.max(0, act.pos - 1) })
    }
  }
  const onInput = (e) => {
    const chars = e.target.value.toUpperCase().replace(/[^A-Z]/g, '')
    e.target.value = ''
    for (const ch of chars) write(ch)
  }

  const pickWord = (i) => {
    update(live.current.letters, { word: i, pos: 0 })
    inputRef.current?.focus({ preventScroll: true })
  }

  const across = words.map((w, i) => ({ ...w, i })).filter((w) => w.dir === 'across')
  const down = words.map((w, i) => ({ ...w, i })).filter((w) => w.dir === 'down')

  return (
    <div className="sw">
      <p className="sw__active">{active ? `${active.word + 1}. ${words[active.word].clue} (${words[active.word].word.length})` : t('Tap a white cell to start')}</p>
      <div className="sw__grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, '--n': n }}>
        {cells.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r},${c}`
            if (cell.clue) {
              return (
                <div key={key} className="sw__clue">
                  {['across', 'down'].map((dir) =>
                    cell.clue[dir] ? (
                      <span key={dir} className={`sw__clue-part ${active && cell.clue[dir].index === active.word ? 'is-active' : ''}`}>
                        <b>{cell.clue[dir].index + 1}</b> {cell.clue[dir].text}
                        <i>{dir === 'across' ? '→' : '↓'}</i>
                      </span>
                    ) : null,
                  )}
                </div>
              )
            }
            if (cell.block) return <div key={key} className="sw__block" />
            const wrong = checked && letters[key] && letters[key] !== cell.letter
            return (
              <button
                key={key}
                className={`sw__cell ${givenKeys.has(key) ? 'is-given' : ''} ${activeSet.has(key) ? 'is-word' : ''} ${cursor === key ? 'is-cursor' : ''} ${wrong ? 'is-wrong' : ''}`}
                onClick={() => select(r, c)}
              >
                {letters[key] || ''}
              </button>
            )
          }),
        )}
      </div>
      <input ref={inputRef} className="sw__input" aria-label={t('Type a letter')} autoCapitalize="characters" autoComplete="off" onKeyDown={onKeyDown} onInput={onInput} />
      <div className="puzzle__bar">
        <span className="puzzle__hint">{t('Tap a cell twice to switch between across and down.')}</span>
        <button className="btn btn--ghost btn--sm" onClick={() => setChecked(true)}>
          {t('Check')}
        </button>
      </div>
      <div className="sw__lists">
        <div>
          <h4>{t('Across →')}</h4>
          <ol>
            {across.map((w) => (
              <li key={w.i} className={active?.word === w.i ? 'is-active' : ''} onClick={() => pickWord(w.i)}>
                <b>{w.i + 1}.</b> {w.clue} ({w.word.length})
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h4>{t('Down ↓')}</h4>
          <ol>
            {down.map((w) => (
              <li key={w.i} className={active?.word === w.i ? 'is-active' : ''} onClick={() => pickWord(w.i)}>
                <b>{w.i + 1}.</b> {w.clue} ({w.word.length})
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
