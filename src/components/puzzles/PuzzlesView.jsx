import { useCallback, useEffect, useState } from 'react'
import WordSearchGame from './WordSearchGame'
import BinaryGame from './BinaryGame'
import SwedishGame from './SwedishGame'
import { WORD_CATEGORIES, CATEGORY_BY_ID } from '../../puzzles/words.js'
import { makeWordSearch } from '../../puzzles/wordsearch.js'
import { makeBinary, BINARY_SIZES } from '../../puzzles/binary.js'
import { makeSwedish } from '../../puzzles/swedish.js'
import { PUZZLE_DAILY_LIMIT, PUZZLE_REWARDS, euro } from '../../data/collections'
import { rpc, supabase } from '../../lib/supabase'

const KINDS = [
  { id: 'wordsearch', name: 'Word search', icon: '🔎', text: 'Find the hidden Dutch words in the letter grid.', words: true },
  { id: 'swedish', name: 'Swedish puzzle', icon: '✏️', text: 'An arrow-word crossword with Dutch clues.', words: true },
  { id: 'binary', name: 'Binary puzzle', icon: '🔢', text: 'Fill the grid with 0s and 1s by the rules.', words: false },
]
const SIZE_LABEL = { small: 'Small', medium: 'Medium', large: 'Large' }
const GRID = {
  wordsearch: { small: '8×8', medium: '11×11', large: '14×14' },
  swedish: { small: '7×7', medium: '9×9', large: '11×11' },
  binary: Object.fromEntries(Object.entries(BINARY_SIZES).map(([k, n]) => [k, `${n}×${n}`])),
}

function build(kind, category, size, seed) {
  if (kind === 'wordsearch') return makeWordSearch(CATEGORY_BY_ID[category], size, seed)
  if (kind === 'swedish') return makeSwedish(CATEGORY_BY_ID[category], size, seed)
  return makeBinary(size, seed)
}

export default function PuzzlesView({ userId, notify, onEarned }) {
  const [kind, setKind] = useState('wordsearch')
  const [category, setCategory] = useState(WORD_CATEGORIES[0].id)
  const [size, setSize] = useState('small')
  const [session, setSession] = useState(null) // { id, kind, category, size, puzzle, startedAt }
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [today, setToday] = useState(0)
  const [, tick] = useState(0)

  const loadToday = useCallback(async () => {
    const start = new Date().toISOString().slice(0, 10) + 'T00:00:00Z'
    const { count } = await supabase
      .from('puzzle_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('finished_at', start)
    setToday(count || 0)
  }, [userId])

  useEffect(() => {
    loadToday()
  }, [loadToday])

  // refresh the timer every second while playing
  useEffect(() => {
    if (!session || result) return
    const t = setInterval(() => tick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [session, result])

  const start = async () => {
    setBusy(true)
    try {
      const id = await rpc('start_puzzle', { p_kind: kind, p_size: size })
      setSession({ id, kind, category, size, puzzle: build(kind, category, size, id), startedAt: Date.now() })
      setResult(null)
    } catch (err) {
      notify(err.message)
    }
    setBusy(false)
  }

  const solved = async () => {
    try {
      const amount = Number(await rpc('finish_puzzle', { p_session: session.id }))
      setResult({ amount })
      notify(`Puzzle solved! +${euro(amount)}`)
      onEarned()
      loadToday()
    } catch (err) {
      setResult({ error: err.message })
    }
  }

  if (session) {
    const k = KINDS.find((x) => x.id === session.kind)
    const secs = Math.floor((Date.now() - session.startedAt) / 1000)
    return (
      <section className="puzzle">
        <div className="puzzle__head">
          <button className="link-back" onClick={() => setSession(null)}>
            ← All puzzles
          </button>
          <h1>
            {k.icon} {k.name}
          </h1>
          <p className="puzzle__meta">
            {k.words && <span>{CATEGORY_BY_ID[session.category].name}</span>}
            <span>
              {SIZE_LABEL[session.size]} · {GRID[session.kind][session.size]}
            </span>
            <span className="puzzle__reward">{euro(PUZZLE_REWARDS[session.size])}</span>
            {!result && (
              <span className="puzzle__time">
                {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
              </span>
            )}
          </p>
        </div>

        {result ? (
          <div className={`puzzle__done ${result.error ? 'is-error' : ''}`}>
            <span className="puzzle__done-icon">{result.error ? '🙈' : '🎉'}</span>
            <h2>{result.error ? 'No reward this time' : `You earned ${euro(result.amount)}!`}</h2>
            <p>{result.error || 'The money is in your budget. Up for another one?'}</p>
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setSession(null)}>
                Choose another
              </button>
              <button className="btn btn--primary" onClick={start} disabled={busy}>
                Same again
              </button>
            </div>
          </div>
        ) : session.kind === 'wordsearch' ? (
          <WordSearchGame key={session.id} puzzle={session.puzzle} onSolved={solved} />
        ) : session.kind === 'swedish' ? (
          <SwedishGame key={session.id} puzzle={session.puzzle} onSolved={solved} />
        ) : (
          <BinaryGame key={session.id} puzzle={session.puzzle} onSolved={solved} />
        )}
      </section>
    )
  }

  const current = KINDS.find((x) => x.id === kind)
  return (
    <section className="puzzles">
      <div className="hero">
        <div>
          <h1 className="hero__title">Puzzle for pocket money</h1>
          <p className="hero__text">
            Solve a puzzle to earn money for blind boxes: {euro(PUZZLE_REWARDS.small)} for small, {euro(PUZZLE_REWARDS.medium)} for
            medium and {euro(PUZZLE_REWARDS.large)} for large. You've been paid for{' '}
            <strong>
              {today}/{PUZZLE_DAILY_LIMIT}
            </strong>{' '}
            puzzles today.
          </p>
        </div>
      </div>

      <h2 className="section-title">1. Pick a puzzle</h2>
      <div className="choice-grid">
        {KINDS.map((k) => (
          <button key={k.id} className={`choice ${kind === k.id ? 'is-active' : ''}`} onClick={() => setKind(k.id)}>
            <span className="choice__icon">{k.icon}</span>
            <strong>{k.name}</strong>
            <span>{k.text}</span>
          </button>
        ))}
      </div>

      {current.words && (
        <>
          <h2 className="section-title">2. Pick a category</h2>
          <div className="chips">
            {WORD_CATEGORIES.map((c) => (
              <button key={c.id} className={`chip ${category === c.id ? 'is-active' : ''}`} onClick={() => setCategory(c.id)}>
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        </>
      )}

      <h2 className="section-title">{current.words ? '3' : '2'}. Pick a size</h2>
      <div className="choice-grid choice-grid--sizes">
        {Object.keys(PUZZLE_REWARDS).map((s) => (
          <button key={s} className={`choice ${size === s ? 'is-active' : ''}`} onClick={() => setSize(s)}>
            <strong>{SIZE_LABEL[s]}</strong>
            <span>{GRID[kind][s]}</span>
            <span className="choice__reward">{euro(PUZZLE_REWARDS[s])}</span>
          </button>
        ))}
      </div>

      <div className="puzzles__start">
        <button className="btn btn--primary btn--lg" onClick={start} disabled={busy || today >= PUZZLE_DAILY_LIMIT}>
          {today >= PUZZLE_DAILY_LIMIT ? 'Daily limit reached' : `Start puzzle · earn ${euro(PUZZLE_REWARDS[size])}`}
        </button>
      </div>
    </section>
  )
}
