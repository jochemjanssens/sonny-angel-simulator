import { useCallback, useEffect, useRef, useState } from 'react'
import { TABLES_SECONDS, TABLES_SIZES } from '../../puzzles/tables.js'
import { euro } from '../../data/collections'
import { useT } from '../../i18n'

// One minute of times tables. Type the answer with the keypad (or keyboard);
// it is checked as soon as it has as many digits as the right answer.
export default function TablesGame({ puzzle, onSolved }) {
  const { t } = useT()
  const reward = TABLES_SIZES[puzzle.size].reward
  const [countdown, setCountdown] = useState(3)
  const [endsAt, setEndsAt] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [question, setQuestion] = useState(() => puzzle.next())
  const [input, setInput] = useState('')
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [flash, setFlash] = useState(null) // { ok, answer }
  const sent = useRef(false)

  const left = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : TABLES_SECONDS
  const over = endsAt !== null && left === 0
  const playing = endsAt !== null && !over

  // 3-2-1, then the minute starts
  useEffect(() => {
    if (countdown === 0) return setEndsAt(Date.now() + TABLES_SECONDS * 1000)
    const id = setTimeout(() => setCountdown((c) => c - 1), 800)
    return () => clearTimeout(id)
  }, [countdown])

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(id)
  }, [playing])

  useEffect(() => {
    if (!over || sent.current) return
    sent.current = true
    setTimeout(() => onSolved(correct), 1500)
  }, [over, correct, onSolved])

  const press = useCallback(
    (key) => {
      if (!playing) return
      if (key === 'del') return setInput((s) => s.slice(0, -1))
      const typed = (input + key).slice(0, 3)
      if (typed.length < String(question.answer).length) return setInput(typed)
      const ok = Number(typed) === question.answer
      if (ok) setCorrect((n) => n + 1)
      else setWrong((n) => n + 1)
      setFlash({ ok, answer: question.answer, id: Date.now() })
      setInput('')
      setQuestion(puzzle.next())
    },
    [playing, input, question, puzzle],
  )

  useEffect(() => {
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('del')
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [press])

  return (
    <div className="tab">
      <div className="tab__stats">
        <span>
          ✅ <strong>{correct}</strong>
        </span>
        <span className={`tab__clock ${playing && left <= 10 ? 'is-low' : ''}`}>⏱️ 0:{String(left).padStart(2, '0')}</span>
        <span>
          💰 <strong>{euro(correct * reward)}</strong>
        </span>
      </div>
      <div className="tab__bar">
        <span style={{ width: `${(left / TABLES_SECONDS) * 100}%` }} />
      </div>

      <div className="tab__card">
        {countdown > 0 ? (
          <span key={countdown} className="tab__count">
            {countdown}
          </span>
        ) : over ? (
          <div className="tab__over">
            <strong>{t("Time's up!")}</strong>
            <span>{t('{correct} right · {wrong} wrong', { correct, wrong })}</span>
          </div>
        ) : (
          <>
            <span className="tab__sum">{question.text} =</span>
            <span className="tab__answer">{input || '?'}</span>
            {flash && (
              <span key={flash.id} className={`tab__flash ${flash.ok ? 'is-ok' : 'is-bad'}`}>
                {flash.ok ? '+' + euro(reward) : t('It was {n}', { n: flash.answer })}
              </span>
            )}
          </>
        )}
      </div>

      <div className="tab__pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0'].map((k) => (
          <button key={k} className={`tab__key ${k === 'del' ? 'tab__key--del' : ''}`} onClick={() => press(k)} disabled={!playing} aria-label={k === 'del' ? t('Delete') : k}>
            {k === 'del' ? '⌫' : k}
          </button>
        ))}
      </div>
      <p className="puzzle__hint">{t('Every correct sum earns {amount}. The answer is checked as soon as you have typed enough digits.', { amount: euro(reward) })}</p>
    </div>
  )
}
