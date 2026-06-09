function timeAgo(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

function ConfBar({ value = 0.5 }) {
  const pct   = Math.round((value) * 100)
  const color = value >= 0.8 ? '#00ff88' : value >= 0.5 ? '#ffcc00' : '#ff3366'
  return (
    <div className="conf-bar-wrap" style={{ marginTop: 4 }}>
      <div className="conf-bar">
        <div className="conf-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="conf-bar-label" style={{ color, fontSize: 9 }}>{pct}% confidence</span>
    </div>
  )
}

const SEVERITY_STYLE = {
  critical: { border: '#ff3366', icon: '🔴', label: 'CRITICAL' },
  high:     { border: '#ff6b2b', icon: '🟠', label: 'HIGH' },
  medium:   { border: '#ffcc00', icon: '🟡', label: 'ALERT' },
}

export default function AlertFeed({ alerts, loading }) {
  if (loading) return (
    <div className="alert-feed" style={{ padding: 20, color: 'var(--text-muted)', fontSize: 12 }}>
      Scanning for anomalies…
    </div>
  )
  if (!alerts?.length) return (
    <div className="alert-feed" style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 20, marginBottom: 8 }}>✅</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>No active alerts</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>All sites within normal range</div>
    </div>
  )

  return (
    <div className="alert-feed">
      {alerts.map((a, i) => {
        const sev     = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.medium
        const conf    = parseFloat(a.attr_confidence || 0.5)
        const spikeP  = a.co2_spike_pct ?? Math.round((a.anomaly_score || 1) * 75)
        const co2t    = parseFloat(a.co2_eq_t || 0).toFixed(0)
        const ago     = timeAgo(a.acq_date)

        return (
          <div
            key={i}
            className="esg-alert-card"
            style={{ borderLeftColor: sev.border }}
          >
            {/* Headline */}
            <div className="esg-headline">
              <span className="esg-icon">{sev.icon}</span>
              <span className="esg-badge" style={{ background: `${sev.border}22`, color: sev.border, borderColor: `${sev.border}55` }}>
                {sev.label}
              </span>
              <span className="esg-ago">{ago}</span>
            </div>

            <div className="esg-title">
              {a.well_name || a.basin} spiked +{spikeP}%
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>
                (last 24h vs baseline)
              </span>
            </div>

            {/* Operator + confidence */}
            <div className="esg-operator">
              <span style={{ color: 'var(--text-secondary)' }}>Operator:</span>{' '}
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{a.company}</span>
            </div>
            <ConfBar value={conf} />

            {/* Stats */}
            <div className="esg-stats">
              <span>
                <span style={{ color: 'var(--text-muted)' }}>Est. </span>
                <span style={{ color: '#ff6b2b', fontWeight: 700 }}>
                  {Number(co2t).toLocaleString()} t CO₂-eq
                </span>
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                {a.country} · {a.frp?.toFixed(1)} MW FRP
              </span>
            </div>
          </div>
        )
      })}

      {/* Disclaimer */}
      <div style={{
        padding: '10px 14px',
        fontSize: 9,
        color: 'var(--text-muted)',
        borderTop: '1px solid var(--border)',
        fontStyle: 'italic',
      }}>
        ⚠ Company names are approximated from publicly available resources and may not reflect actual operational attribution.
      </div>
    </div>
  )
}
