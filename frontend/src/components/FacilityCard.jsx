import { useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'

// ── Confidence bar ──────────────────────────────────────────────────────────
function ConfBar({ value = 0.5 }) {
  const pct = Math.round(value * 100)
  const color = value >= 0.8 ? '#00ff88' : value >= 0.5 ? '#ffcc00' : '#ff3366'
  return (
    <div className="conf-bar-wrap">
      <div className="conf-bar">
        <div className="conf-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="conf-bar-label" style={{ color }}>{pct}%</span>
    </div>
  )
}

// ── Attribution alternatives ────────────────────────────────────────────────
function AltsList({ alts }) {
  if (!alts?.length) return null
  return (
    <div className="alts-list">
      <div className="alts-label">Possible alternatives:</div>
      {alts.map((a, i) => (
        <div key={i} className="alt-row">
          <span className="alt-name">{a.operator}</span>
          <span className="alt-conf">{Math.round(a.confidence * 100)}%</span>
        </div>
      ))}
    </div>
  )
}

// ── Mini sparkline from flares data grouped by date ─────────────────────────
function Sparkline({ flares, clusterId }) {
  const data = useMemo(() => {
    if (!flares?.features) return []
    const byDate = {}
    flares.features.forEach(f => {
      const p = f.properties
      if (p.id === clusterId || (p.basin && p.basin !== 'Unknown')) {
        const date = p.date || ''
        if (!byDate[date]) byDate[date] = 0
        byDate[date] += p.co2_eq_t || 0
      }
    })
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, co2]) => ({ date: date.slice(5), co2: Math.round(co2 * 100) / 100 }))
  }, [flares, clusterId])

  if (!data.length) return (
    <div style={{ color: 'var(--text-muted)', fontSize: 11, paddingTop: 12 }}>No trend data</div>
  )

  return (
    <ResponsiveContainer width="100%" height={80}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'rgba(11,17,32,0.97)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 6, fontSize: 10 }}
          formatter={v => [`${v} t CO₂`, '']}
        />
        <Area type="monotone" dataKey="co2" stroke="#00d4ff" strokeWidth={1.5} fill="url(#sparkGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Main FacilityCard ────────────────────────────────────────────────────────
export default function FacilityCard({ site, flares, onClose }) {
  const [showProvenance, setShowProvenance] = useState(false)

  if (!site) return null

  const props = site
  const confidence = parseFloat(props.attr_confidence || 0.5)
  let alts = []
  try { alts = JSON.parse(props.attr_alternatives || '[]') } catch {}

  const isAnomaly  = props.is_anomaly === true || props.is_anomaly === 'true'
  const isMatched  = props.matched_well === true || props.matched_well === 'true'
  const co2Val     = parseFloat(props.co2_eq_t || 0)
  const frpVal     = parseFloat(props.frp || 0)
  const gasUSD     = parseFloat(props.gas_value_usd || 0)
  const anomScore  = parseFloat(props.anomaly_score || 0)

  // ── Derived gas-loss context ───────────────────────────────────────────────
  const gasAnnual    = gasUSD * 365
  const gasAnnualFmt = gasAnnual >= 1_000_000
    ? `$${(gasAnnual / 1_000_000).toFixed(2)}M`
    : gasAnnual >= 1_000
    ? `$${(gasAnnual / 1_000).toFixed(1)}K`
    : `$${Math.round(gasAnnual)}`
  // Approximate % above baseline from anomaly σ score (1σ ≈ 25% above mean)
  const gasVsBaseline = anomScore > 0.5 ? Math.round(anomScore * 25) : null

  const typicalFRP   = frpVal / (1 + (anomScore / 4 || 0))
  const typicalLabel = anomScore > 1
    ? `Current ${frpVal.toFixed(1)} MW vs typical ~${typicalFRP.toFixed(1)} MW (+${((frpVal / typicalFRP - 1) * 100).toFixed(0)}%)`
    : 'Within normal operating range'

  return (
    <div className="facility-backdrop" onClick={onClose}>
      <div className="facility-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="facility-header">
          <div>
            <div className="facility-title">
              {isMatched && props.well_name ? props.well_name : props.basin}
            </div>
            <div className="facility-sub">
              {isMatched
                ? <span style={{ color: '#00ff88', fontSize: 10, fontWeight: 700 }}>✓ MATCHED KNOWN ASSET</span>
                : <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>◉ SATELLITE DETECTED CLUSTER</span>
              }
              {isAnomaly && (
                <span style={{ color: '#ff3366', fontSize: 10, fontWeight: 700, marginLeft: 10 }}>
                  ⚠ ANOMALY {anomScore.toFixed(1)}σ
                </span>
              )}
            </div>
          </div>
          <button className="facility-close" onClick={onClose}>✕</button>
        </div>

        <div className="facility-body">
          {/* Left column */}
          <div className="facility-left">
            {/* Sparkline */}
            <div className="facility-section">
              <div className="facility-section-label">Emission Trend (observation window)</div>
              <Sparkline flares={flares} clusterId={props.id} />
            </div>

            {/* Typical vs current */}
            <div className="facility-section">
              <div className="facility-section-label">Behavior Analysis</div>
              <div className="behavior-box" style={{
                borderColor: isAnomaly ? '#ff336655' : '#00ff8830',
                background:  isAnomaly ? 'rgba(255,51,102,0.06)' : 'rgba(0,255,136,0.04)',
              }}>
                <div style={{ fontSize: 11, color: isAnomaly ? '#ff3366' : '#00ff88', fontWeight: 600, marginBottom: 4 }}>
                  {isAnomaly ? '⚡ Anomalous Behavior' : '✓ Normal Behavior'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{typicalLabel}</div>
              </div>
            </div>

            {/* Explainability */}
            <div className="facility-section">
              <button
                className="prov-toggle"
                onClick={() => setShowProvenance(v => !v)}
              >
                🔍 Data Provenance {showProvenance ? '▲' : '▼'}
              </button>
              {showProvenance && (
                <div className="prov-panel">
                  <div className="prov-row"><span>Satellite Source</span><span>{props.viirs_source || 'NASA FIRMS VIIRS NRT (375m)'}</span></div>
                  <div className="prov-row"><span>Acquisition Date</span><span>{props.acq_datetime || props.date || '—'}</span></div>
                  <div className="prov-row"><span>Raw FRP</span><span>{frpVal.toFixed(2)} MW</span></div>
                  <div className="prov-row"><span>Emission Model</span><span>{props.emission_model || 'Elvidge 2016'}</span></div>
                  <div className="prov-row"><span>CO₂ Factor</span><span>{props.co2_factor || 'IPCC AR6 — 0.8 kg/m³ × 2.86 kg/kg'}</span></div>
                  <div className="prov-row"><span>Value Method</span><span>{props.value_method || 'Elvidge Vₐ × 38 MJ/scm ÷ 1055 × $3.5/MMBtu'}</span></div>
                  <div className="prov-row"><span>Attribution Logic</span><span>{props.attr_method || (isMatched ? 'Exact well match (5km)' : 'Basin weighted probability')}</span></div>
                  <div className="prov-row"><span>Cluster ID</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{props.id}</span></div>
                  <div className="prov-row"><span>Coordinates</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{props._lat?.toFixed(4) || '—'}°, {props._lon?.toFixed(4) || '—'}°</span></div>
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="facility-right">
            {/* KPIs */}
            <div className="facility-kpis">
              <div className="fkpi">
                <div className="fkpi-label">FRP Intensity</div>
                <div className="fkpi-val" style={{ color: frpVal > 50 ? '#ff3366' : frpVal > 15 ? '#ff6b2b' : '#00d4ff' }}>
                  {frpVal.toFixed(1)} <span style={{ fontSize: 14 }}>MW</span>
                </div>
              </div>
              <div className="fkpi">
                <div className="fkpi-label">CO₂-eq Estimate</div>
                <div className="fkpi-val orange">{co2Val.toFixed(2)} <span style={{ fontSize: 14 }}>t/day</span></div>
              </div>
              <div className="fkpi fkpi--gas">
                <div className="fkpi-label">Gas Loss (Est.)</div>
                <div className="fkpi-val yellow">
                  {gasUSD > 0 ? `$${gasUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
                  <span style={{ fontSize: 12 }}>/day</span>
                </div>
                {gasUSD > 0 && (
                  <div className="fkpi-sub">
                    <span className="fkpi-annual">≈ {gasAnnualFmt}/year potential loss</span>
                    {gasVsBaseline !== null ? (
                      <span className={`fkpi-trend ${isAnomaly ? 'fkpi-trend--up' : 'fkpi-trend--ok'}`}>
                        {isAnomaly ? `↑ ${gasVsBaseline}% vs baseline` : '↓ within normal range'}
                      </span>
                    ) : (
                      <span className="fkpi-trend fkpi-trend--ok">↓ within normal range</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="facility-section">
              <div className="facility-section-label">Asset Details</div>
              <div className="fc-rows">
                <div className="fc-row"><span>Operator</span><span>{props.company}</span></div>
                {props.well_name && <div className="fc-row"><span>Well</span><span>{props.well_name}</span></div>}
                {props.landmark && <div className="fc-row"><span>Landmark</span><span>{props.landmark}</span></div>}
                <div className="fc-row"><span>Basin</span><span>{props.basin}</span></div>
                <div className="fc-row"><span>Country</span><span>{props.country}</span></div>
                <div className="fc-row"><span>Date</span><span>{props.date}</span></div>
                <div className="fc-row"><span>Cluster Size</span><span>{props.cluster_size} detections</span></div>
              </div>
            </div>

            {/* Attribution confidence */}
            <div className="facility-section">
              <div className="facility-section-label">Attribution Confidence</div>
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  {props.company}
                </div>
                <ConfBar value={confidence} />
              </div>
              <AltsList alts={alts} />
              {!isMatched && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, fontStyle: 'italic' }}>
                  ⚠ Company names approximated from publicly available resources.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
