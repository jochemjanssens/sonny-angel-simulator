import Angel from './Angel'
import { BRAND_NAME } from '../brand'
import { useT } from '../i18n'

export default function BoxArt({ series, size = 'md', className = '', lidClass = '' }) {
  const { t } = useT()
  return (
    <div className={`boxart boxart--${size} ${className}`} style={{ '--theme': series.theme }}>
      <div className={`boxart__lid ${lidClass}`}>
        <span className="boxart__lid-logo">{BRAND_NAME}</span>
      </div>
      <div className="boxart__front">
        <div className="boxart__brand">{BRAND_NAME}</div>
        <div className="boxart__window">
          <Angel figure={series.figures[0]} silhouette size={size === 'lg' ? 92 : size === 'sm' ? 46 : 64} />
        </div>
        <div className="boxart__series">{series.name}</div>
        {series.limited && <div className="boxart__limited">{t('Limited')}</div>}
      </div>
    </div>
  )
}
