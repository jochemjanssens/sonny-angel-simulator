import Angel from './Angel'

export default function BoxArt({ series, size = 'md', className = '', lidClass = '' }) {
  return (
    <div className={`boxart boxart--${size} ${className}`} style={{ '--theme': series.theme }}>
      <div className={`boxart__lid ${lidClass}`}>
        <span className="boxart__lid-logo">Sonny Angel</span>
      </div>
      <div className="boxart__front">
        <div className="boxart__brand">Sonny Angel</div>
        <div className="boxart__window">
          <Angel figure={series.figures[0]} silhouette size={size === 'lg' ? 92 : size === 'sm' ? 46 : 64} />
        </div>
        <div className="boxart__series">{series.name}</div>
        {series.limited && <div className="boxart__limited">Limited</div>}
      </div>
    </div>
  )
}
