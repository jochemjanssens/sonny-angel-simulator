import { useEffect, useState } from 'react'
import Angel from './Angel'
import Confetti from './Confetti'
import { BRAND_NAME } from '../brand'
import { FIGURE_BY_ID, euro } from '../data/collections'
import { useT } from '../i18n'

const FLIP_MS = 260

// Several blind boxes at once: the boxes flip open one by one, followed by a
// summary. results: [{ fig_id, is_new }]
export default function MultiBoxOpener({ series, results, canAffordAgain, onAgain, onReveal, onClose }) {
  const { t } = useT()
  const [shown, setShown] = useState(0)
  const done = shown >= results.length

  useEffect(() => {
    if (done) return
    const id = setTimeout(() => setShown((n) => n + 1), FLIP_MS)
    return () => clearTimeout(id)
  }, [shown, done])

  // the rest of the app may show the new figures once they're all revealed
  useEffect(() => {
    if (done) onReveal()
  }, [done, onReveal])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') (done ? onClose : () => setShown(results.length))()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done, onClose, results.length])

  const figures = results.map((r) => FIGURE_BY_ID[r.fig_id])
  const fresh = results.filter((r) => r.is_new).length
  const value = figures.reduce((sum, f) => sum + f.value, 0)
  const secrets = figures.filter((f) => f.secret).length

  return (
    <div className="multi" role="dialog" aria-modal="true" aria-label={t('{n} blind boxes', { n: results.length })} style={{ '--theme': series.theme }}>
      {done && (fresh > 0 || secrets > 0) && <Confetti gold={secrets > 0} count={secrets ? 90 : 50} />}
      <div className="multi__inner">
        <h2 className="multi__title">{series.name}</h2>
        <div className="multi__grid">
          {results.map((r, i) => {
            const f = figures[i]
            const open = i < shown
            return (
              <div key={i} className={`multi__card ${open ? 'is-open' : ''} ${open && f.secret ? 'is-secret' : ''}`}>
                {open ? (
                  <>
                    {f.secret ? <span className="badge badge--secret">{t('Secret')}</span> : r.is_new ? <span className="badge badge--new">{t('New!')}</span> : <span className="badge badge--dupe">{t('Duplicate')}</span>}
                    <Angel figure={f} size={76} />
                    <span className="multi__name">{f.name}</span>
                    <span className="multi__value">{euro(f.value)}</span>
                  </>
                ) : (
                  <span className="multi__box">{BRAND_NAME}</span>
                )}
              </div>
            )
          })}
        </div>
        {done ? (
          <>
            <p className="multi__summary">
              {t('{new} new · {dupes} duplicates · total value {value}', { new: fresh, dupes: results.length - fresh, value: euro(value) })}
            </p>
            <div className="multi__actions">
              <button className="btn btn--ghost" onClick={onClose}>
                {t('Close')}
              </button>
              {canAffordAgain && (
                <button className="btn btn--primary" onClick={onAgain}>
                  {t('Open {n} more', { n: results.length })}
                </button>
              )}
            </div>
          </>
        ) : (
          <button className="opener__skip multi__skip" onClick={() => setShown(results.length)}>
            {t('Show all')}
          </button>
        )}
      </div>
    </div>
  )
}
