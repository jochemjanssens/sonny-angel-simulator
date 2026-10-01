import { useEffect, useState } from 'react'
import Angel from './Angel'
import BoxArt from './BoxArt'
import Confetti from './Confetti'
import { euro } from '../data/collections'

// box -> shake -> lid -> foil (tap) -> tear -> reveal
const TIMINGS = { shake: 1000, lid: 900, tear: 750 }
const NEXT = { shake: 'lid', lid: 'foil', tear: 'reveal' }

export default function BlindBoxOpener({ series, figure, isNew, canAffordAnother, onAgain, onClose }) {
  const [phase, setPhase] = useState('box')

  useEffect(() => {
    if (!TIMINGS[phase]) return
    const t = setTimeout(() => setPhase(NEXT[phase]), TIMINGS[phase])
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && phase === 'reveal') onClose()
      if (e.key === ' ' || e.key === 'Enter') {
        if (phase === 'box') setPhase('shake')
        if (phase === 'foil') setPhase('tear')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, onClose])

  const revealed = phase === 'reveal'
  const boxGone = phase === 'foil' || phase === 'tear' || revealed

  return (
    <div className={`opener opener--${phase} ${figure.secret ? 'opener--secret' : ''}`} role="dialog" aria-modal="true" aria-label="Open blind box">
      <div className="opener__glow" />
      {revealed && <div className="opener__rays" />}
      {revealed && (isNew || figure.secret) && <Confetti gold={figure.secret} count={figure.secret ? 90 : 60} />}

      <div className="opener__stage">
        {!boxGone && (
          <button
            className="opener__box"
            onClick={() => phase === 'box' && setPhase('shake')}
            disabled={phase !== 'box'}
            aria-label="Open the box"
          >
            <BoxArt series={series} size="lg" lidClass={phase === 'lid' ? 'is-flying' : ''} />
            {phase === 'lid' && <div className="opener__burst" />}
          </button>
        )}

        {(phase === 'foil' || phase === 'tear') && (
          <button className="opener__foil" onClick={() => phase === 'foil' && setPhase('tear')} aria-label="Tear the foil">
            <div className="foil foil--left">
              <span className="foil__crimp" />
            </div>
            <div className="foil foil--right">
              <span className="foil__crimp" />
            </div>
            <div className="foil__label">Sonny Angel</div>
          </button>
        )}

        {revealed && (
          <div className="opener__figure">
            <Angel figure={figure} size={210} />
          </div>
        )}
      </div>

      <div className="opener__caption">
        {phase === 'box' && <p className="opener__hint">Tap the box to open it</p>}
        {phase === 'shake' && <p className="opener__hint">Who could it be…?</p>}
        {phase === 'lid' && <p className="opener__hint">&nbsp;</p>}
        {phase === 'foil' && <p className="opener__hint">Tap the foil to tear it open!</p>}
        {phase === 'tear' && <p className="opener__hint">&nbsp;</p>}

        {revealed && (
          <div className="reveal">
            <div className="reveal__badges">
              {figure.secret && <span className="badge badge--secret">★ Secret figure! ★</span>}
              {isNew ? <span className="badge badge--new">New!</span> : <span className="badge badge--dupe">Duplicate</span>}
            </div>
            <h2 className="reveal__name">{figure.name}</h2>
            <p className="reveal__series">{series.name}</p>
            <p className="reveal__value">
              Market value <strong>{euro(figure.value)}</strong>
            </p>
            <div className="reveal__actions">
              <button className="btn btn--ghost" onClick={onClose}>
                Put on my shelf
              </button>
              <button className="btn btn--primary" onClick={onAgain} disabled={!canAffordAnother}>
                Open another · {euro(series.price)}
              </button>
            </div>
          </div>
        )}
      </div>

      {!revealed && (
        <button className="opener__skip" onClick={() => setPhase('reveal')}>
          Skip animation
        </button>
      )}
    </div>
  )
}
