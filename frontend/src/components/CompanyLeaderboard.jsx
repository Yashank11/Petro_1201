function RiskBadge({ level }) {
  const map = {
    high:   { label: '🔴 High',   color: '#ff3366', bg: 'rgba(255,51,102,0.15)' },
    medium: { label: '🟡 Med',    color: '#ffcc00', bg: 'rgba(255,204,0,0.13)' },
    low:    { label: '🟢 Low',    color: '#00ff88', bg: 'rgba(0,255,136,0.12)' },
  }
  const t = map[level] || map.low
  return (
    <span className="risk-badge" style={{ color: t.color, background: t.bg, borderColor: `${t.color}44` }}>
      {t.label}
    </span>
  )
}

function ConfBar({ value = 0.5 }) {
  const pct   = Math.round(value * 100)
  const color = value >= 0.8 ? '#00ff88' : value >= 0.5 ? '#ffcc00' : '#ff3366'
  return (
    <div className="conf-bar-wrap" style={{ marginTop: 3 }}>
      <div className="conf-bar">
        <div className="conf-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="conf-bar-label" style={{ color, fontSize: 9 }}>{pct}%</span>
    </div>
  )
}

export default function CompanyLeaderboard({ emitters, loading, onSelect }) {
  if (loading) return (
    <div className="leaderboard-list" style={{ padding: 20, color: 'var(--text-muted)', fontSize: 12 }}>
      Loading emitters…
    </div>
  )
  if (!emitters?.length) return (
    <div className="leaderboard-list" style={{ padding: 20, color: 'var(--text-muted)', fontSize: 12 }}>
      No data
    </div>
  )

  return (
    <div className="leaderboard-list">
      {/* Column headers — 4 columns */}
      <div className="lb-header-row">
        <span>#</span>
        <span>Company / Basin</span>
        <span style={{ textAlign: 'right' }}>CO₂</span>
        <span style={{ textAlign: 'right' }}>Risk</span>
      </div>

      {emitters.map((e, i) => {
        const changePct = e.change_pct ?? 0
        const isUp      = changePct > 0
        const isDown    = changePct < 0
        const changeStr = changePct === 0 ? '' : `${isUp ? '↑' : '↓'} ${Math.abs(changePct).toFixed(1)}%`
        const changeClr = isUp ? '#ff3366' : isDown ? '#00ff88' : 'var(--text-muted)'
        const conf      = e.attr_confidence ?? 0.5

        return (
          <div
            key={`${e.company}-${i}`}
            className="lb-row"
            onClick={() => onSelect && onSelect(e)}
          >
            {/* Rank */}
            <div className={`rank ${i < 3 ? 'top' : ''}`}>{i + 1}</div>

            {/* Company + meta + confidence */}
            <div className="company-info">
              <div className="company-name" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {e.anomaly_flag && (
                  <span className="anomaly-flash" title="Anomaly detected" style={{ fontSize: 10 }}>⚡</span>
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.company}
                </span>
              </div>
              <div className="company-meta">
                {e.basin} · {e.country}
                {changeStr && (
                  <span style={{ color: changeClr, marginLeft: 6, fontWeight: 700 }}>{changeStr}</span>
                )}
              </div>
              <ConfBar value={conf} />
            </div>

            {/* CO₂ */}
            <div className="co2-badge" style={{ textAlign: 'right' }}>
              {Number(e.co2_eq_kt).toFixed(2)}
              <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block' }}>kt CO₂</span>
            </div>

            {/* Risk */}
            <div style={{ textAlign: 'right' }}>
              <RiskBadge level={e.risk_level || 'low'} />
            </div>
          </div>
        )
      })}

      {/* Disclaimer */}
      <div style={{
        padding: '8px 14px', fontSize: 9, color: 'var(--text-muted)',
        borderTop: '1px solid var(--border)', fontStyle: 'italic',
      }}>
        ⚠ Company names approximated from public data.
      </div>
    </div>
  )
}
