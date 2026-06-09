/**
 * CompareBaseline2024
 * ===================
 * Compares present satellite-detected flaring (annualised) against the
 * 2024 World Bank baseline BCM for each country.
 *
 * Three panels:
 *  1. DEVIATION BARS — horizontal bar chart showing % above/below 2024
 *  2. BCM COMPARISON — grouped bar chart (live vs WB 2024)
 *  3. INSIGHT CARDS  — smart auto-generated observations per country
 */
import { useEffect, useState, useMemo, useRef } from 'react'
import { getCompare2024 } from '../api/client'

// ── Risk theme palette ────────────────────────────────────────────────────────
const RISK = {
  critical: { color: '#ff3366', glow: 'rgba(255,51,102,0.35)',  bg: 'rgba(255,51,102,0.10)',  label: 'SURGE'     },
  high:     { color: '#ff6b2b', glow: 'rgba(255,107,43,0.30)', bg: 'rgba(255,107,43,0.10)',  label: 'ELEVATED'  },
  medium:   { color: '#ffcc00', glow: 'rgba(255,204,0,0.25)',   bg: 'rgba(255,204,0,0.08)',   label: 'ABOVE'     },
  low:      { color: '#00ff88', glow: 'rgba(0,255,136,0.25)',   bg: 'rgba(0,255,136,0.08)',   label: 'BELOW'     },
}

const TREND_COLOR = {
  SURGE:    '#ff3366',
  ELEVATED: '#ff6b2b',
  ABOVE:    '#ffcc00',
  'ON PACE':'#00d4ff',
  BELOW:    '#00ff88',
  DECLINING:'#00ff88',
  LOW:      '#00ff88',
}

function DevBar({ d, maxAbs }) {
  const theme = RISK[d.risk] || RISK.low
  const pct   = Math.min(Math.abs(d.deviation_pct) / maxAbs, 1)
  const isPos = d.deviation_pct > 0

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '110px 1fr 70px',
      alignItems: 'center',
      gap: 10,
      padding: '7px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      {/* Country name */}
      <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {d.country}
      </div>

      {/* Divergence bar centred at zero */}
      <div style={{ position: 'relative', height: 20 }}>
        {/* Centre line */}
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.12)' }} />
        {/* Bar */}
        <div style={{
          position: 'absolute',
          top: '20%',
          height: '60%',
          left:  isPos ? '50%' : `${50 - pct * 50}%`,
          width: `${pct * 50}%`,
          background: theme.color,
          boxShadow: `0 0 8px ${theme.glow}`,
          borderRadius: isPos ? '0 3px 3px 0' : '3px 0 0 3px',
          transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>

      {/* Deviation % */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        fontWeight: 700,
        color: theme.color,
        textAlign: 'right',
        textShadow: `0 0 8px ${theme.glow}`,
      }}>
        {d.deviation_pct > 0 ? '+' : ''}{d.deviation_pct.toFixed(1)}%
      </div>
    </div>
  )
}

function GroupedBar({ d, maxBCM }) {
  const theme   = RISK[d.risk] || RISK.low
  const liveH   = Math.max(4, (d.live_bcm_annual / maxBCM) * 140)
  const baseH   = Math.max(4, (d.wb_2024_bcm    / maxBCM) * 140)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      flex: '0 0 auto',
      width: 64,
    }}>
      {/* Bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 150 }}>
        {/* Live */}
        <div style={{ position: 'relative', width: 18 }}>
          <div style={{
            width: 18,
            height: liveH,
            background: `linear-gradient(to top, ${theme.color}cc, ${theme.color}44)`,
            boxShadow: `0 0 8px ${theme.glow}`,
            borderRadius: '3px 3px 0 0',
            transition: 'height 0.7s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>
        {/* WB 2024 */}
        <div style={{ position: 'relative', width: 18 }}>
          <div style={{
            width: 18,
            height: baseH,
            background: 'linear-gradient(to top, rgba(0,212,255,0.6), rgba(0,212,255,0.15))',
            boxShadow: '0 0 6px rgba(0,212,255,0.2)',
            borderRadius: '3px 3px 0 0',
            transition: 'height 0.7s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>
      </div>

      {/* Country label */}
      <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 64, lineHeight: 1.2 }}>
        {d.country.length > 8 ? d.country.slice(0, 8) : d.country}
      </div>

      {/* Trend pill */}
      <div style={{
        fontSize: 8, fontWeight: 700, padding: '1px 5px',
        borderRadius: 99, letterSpacing: '0.3px',
        background: theme.bg, color: theme.color,
        border: `1px solid ${theme.color}55`,
      }}>
        {d.trend_label}
      </div>
    </div>
  )
}

function InsightCard({ d }) {
  const theme = RISK[d.risk] || RISK.low
  return (
    <div style={{
      padding: '12px 14px',
      background: theme.bg,
      border: `1px solid ${theme.color}30`,
      borderLeft: `3px solid ${theme.color}`,
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minWidth: 200,
      flex: '1 1 200px',
      boxShadow: `0 2px 16px ${theme.glow}`,
      transition: 'box-shadow 0.2s',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{d.country}</span>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 7px',
          borderRadius: 99, background: theme.color, color: '#050810', letterSpacing: '0.5px',
        }}>
          {d.trend_label}
        </span>
      </div>

      {/* Insight text */}
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {d.insight}
      </div>

      {/* Metrics row */}
      <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Live Rate</span>
          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: theme.color }}>
            {d.live_bcm_annual.toFixed(2)} BCM
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>2024 Baseline</span>
          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>
            {d.wb_2024_bcm.toFixed(2)} BCM
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Flares</span>
          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {d.flare_count}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Summary observations ──────────────────────────────────────────────────────
function generateObservations(data) {
  if (!data.length) return []
  const obs = []

  const surges    = data.filter(d => d.trend_label === 'SURGE')
  const elevated  = data.filter(d => d.trend_label === 'ELEVATED')
  const declining = data.filter(d => ['DECLINING','LOW'].includes(d.trend_label))
  const onPace    = data.filter(d => d.trend_label === 'ON PACE')

  const maxDev  = data.reduce((a, b) => Math.abs(b.deviation_pct) > Math.abs(a.deviation_pct) ? b : a, data[0])
  const topLive = [...data].sort((a, b) => b.live_bcm_annual - a.live_bcm_annual)[0]

  if (surges.length)
    obs.push({ icon: '⚡', color: '#ff3366', text: `${surges.map(d=>d.country).join(', ')} ${surges.length===1?'is':'are'} experiencing extreme flaring surges — far above their 2024 annual baseline.` })
  if (elevated.length)
    obs.push({ icon: '📈', color: '#ff6b2b', text: `${elevated.map(d=>d.country).join(', ')} ${elevated.length===1?'is':'are'} running above the 2024 pace — monitor for escalation.` })
  if (declining.length)
    obs.push({ icon: '📉', color: '#00ff88', text: `${declining.map(d=>d.country).join(', ')} ${declining.length===1?'shows':'show'} encouraging below-baseline flaring — potential improvement.` })
  if (onPace.length)
    obs.push({ icon: '≈', color: '#00d4ff', text: `${onPace.map(d=>d.country).join(', ')} ${onPace.length===1?'is':'are'} tracking closely with the 2024 baseline.` })
  if (maxDev)
    obs.push({ icon: '🔎', color: '#a855f7', text: `Largest divergence: ${maxDev.country} at ${maxDev.deviation_pct > 0 ? '+' : ''}${maxDev.deviation_pct.toFixed(0)}% vs 2024 baseline.` })
  if (topLive)
    obs.push({ icon: '🏭', color: '#ffcc00', text: `Highest active flaring intensity: ${topLive.country} at ${topLive.live_bcm_annual.toFixed(2)} BCM/yr (annualised rate from ${topLive.flare_count} detections).` })

  return obs
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CompareBaseline2024({ days = 5 }) {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [view,    setView]    = useState('deviation') // 'deviation' | 'grouped' | 'insights'

  useEffect(() => {
    setLoading(true)
    setError(null)
    getCompare2024(days)
      .then(r => setData(r.data || []))
      .catch(() => setError('Unable to load comparison data'))
      .finally(() => setLoading(false))
  }, [days])

  const observations  = useMemo(() => generateObservations(data), [data])
  const maxAbs        = useMemo(() => Math.max(...data.map(d => Math.abs(d.deviation_pct)), 1), [data])
  const maxBCM        = useMemo(() => Math.max(...data.map(d => Math.max(d.live_bcm_annual, d.wb_2024_bcm)), 1), [data])

  // Sorted displays
  const devSorted     = useMemo(() => [...data].sort((a, b) => Math.abs(b.deviation_pct) - Math.abs(a.deviation_pct)).slice(0, 20), [data])
  const groupedTop    = useMemo(() => [...data].sort((a, b) => b.wb_2024_bcm - a.wb_2024_bcm).slice(0, 14), [data])
  const insightTop    = useMemo(() => [...data].filter(d => d.trend_label !== 'ON PACE').slice(0, 12), [data])

  const surplus = data.filter(d => d.deviation_pct > 0)
  const deficit = data.filter(d => d.deviation_pct < 0)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flexDirection: 'column', gap: 16 }}>
      <div className="spinner" />
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Computing vs 2024 World Bank baseline…</div>
    </div>
  )
  if (error) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--red)', fontSize: 12 }}>{error}</div>
  if (!data.length) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 12 }}>No comparison data available for this window.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        padding: '16px 24px 12px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {/* Title */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.2px' }}>
            🛢 Live vs 2024 Baseline
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            Current VIIRS flaring rate (annualised) vs World Bank 2024 country BCM — {data.length} countries matched
          </div>
        </div>

        {/* Stats pills */}
        <div style={{ display: 'flex', gap: 8, marginLeft: 8, flexWrap: 'wrap' }}>
          {[
            { label: `${surplus.length} Above`, color: '#ff3366', bg: 'rgba(255,51,102,0.12)' },
            { label: `${deficit.length} Below`, color: '#00ff88', bg: 'rgba(0,255,136,0.10)' },
            { label: `Annualised from ${days}d window`, color: '#00d4ff', bg: 'rgba(0,212,255,0.08)' },
          ].map(p => (
            <div key={p.label} style={{
              padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600,
              background: p.bg, color: p.color,
              border: `1px solid ${p.color}40`,
            }}>{p.label}</div>
          ))}
        </div>

        {/* View toggles */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {[
            { key: 'deviation', label: '⟺ Deviation' },
            { key: 'grouped',   label: '▥ Comparison' },
            { key: 'insights',  label: '💡 Insights' },
          ].map(v => (
            <button key={v.key} onClick={() => setView(v.key)} style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600,
              border: view === v.key ? '1px solid var(--cyan)' : '1px solid var(--border)',
              background: view === v.key ? 'var(--cyan-dim)' : 'transparent',
              color: view === v.key ? 'var(--cyan)' : 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>{v.label}</button>
          ))}
        </div>
      </div>

      {/* ── Observation banner ── */}
      {observations.length > 0 && (
        <div style={{
          display: 'flex', gap: 10, overflowX: 'auto', padding: '10px 24px',
          borderBottom: '1px solid var(--border)', flexShrink: 0,
          scrollbarWidth: 'none',
        }}>
          {observations.map((o, i) => (
            <div key={i} style={{
              flex: '0 0 auto', maxWidth: 280,
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.45,
            }}>
              <span style={{ fontSize: 15, flexShrink: 0, color: o.color }}>{o.icon}</span>
              {o.text}
            </div>
          ))}
        </div>
      )}

      {/* ── Main content area ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* ── DEVIATION BARS VIEW ── */}
        {view === 'deviation' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', gap: 0 }}>

            {/* Left: Bars */}
            <div style={{ borderRight: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Axis header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '110px 1fr 70px',
                padding: '8px 24px 4px', gap: 10,
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', flexShrink: 0,
              }}>
                <span>Country</span>
                <span style={{ textAlign: 'center' }}>← Below 2024   |   Above 2024 →</span>
                <span style={{ textAlign: 'right' }}>Δ %</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 24px 16px' }}>
                {devSorted.map(d => <DevBar key={d.country} d={d} maxAbs={maxAbs} />)}
              </div>
            </div>

            {/* Right: Country detail on click / hover — for now show sorted data table */}
            <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                padding: '8px 24px 4px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', flexShrink: 0,
                display: 'grid', gridTemplateColumns: '100px 80px 80px 80px 1fr',
                gap: 8,
              }}>
                <span>Country</span>
                <span style={{ textAlign: 'right' }}>Live BCM</span>
                <span style={{ textAlign: 'right' }}>WB 2024</span>
                <span style={{ textAlign: 'right' }}>Δ BCM</span>
                <span>Status</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 16px' }}>
                {devSorted.map(d => {
                  const theme = RISK[d.risk] || RISK.low
                  return (
                    <div key={d.country} style={{
                      display: 'grid', gridTemplateColumns: '100px 80px 80px 80px 1fr',
                      gap: 8, padding: '7px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      alignItems: 'center',
                      fontSize: 11,
                    }}>
                      <span style={{ fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.country}</span>
                      <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: theme.color }}>{d.live_bcm_annual.toFixed(2)}</span>
                      <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>{d.wb_2024_bcm.toFixed(2)}</span>
                      <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: d.delta_bcm > 0 ? '#ff6b2b' : '#00ff88', fontWeight: 700 }}>
                        {d.delta_bcm > 0 ? '+' : ''}{d.delta_bcm.toFixed(2)}
                      </span>
                      <div style={{
                        display: 'inline-flex', padding: '1px 8px', borderRadius: 99, fontSize: 9, fontWeight: 700,
                        background: theme.bg, color: theme.color, border: `1px solid ${theme.color}40`,
                        width: 'fit-content',
                      }}>
                        {d.trend_label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── GROUPED BAR VIEW ── */}
        {view === 'grouped' && (
          <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '16px 24px' }}>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                <div style={{ width: 14, height: 10, background: 'rgba(255,51,102,0.6)', borderRadius: 2 }} />
                Live rate (annualised)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                <div style={{ width: 14, height: 10, background: 'rgba(0,212,255,0.5)', borderRadius: 2 }} />
                2024 WB Baseline
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Showing top {groupedTop.length} countries by 2024 baseline volume
              </div>
            </div>
            {/* Bars */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 16,
              overflowX: 'auto',
              paddingBottom: 8,
              scrollbarWidth: 'thin',
            }}>
              {groupedTop.map(d => <GroupedBar key={d.country} d={d} maxBCM={maxBCM} />)}
            </div>
            {/* Y-axis label */}
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
              BCM / year  •  annualised from {days}-day VIIRS window
            </div>
          </div>
        )}

        {/* ── INSIGHTS VIEW ── */}
        {view === 'insights' && (
          <div style={{ height: '100%', overflowY: 'auto', padding: '16px 24px' }}>
            {insightTop.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>
                All tracked countries are on-pace with 2024 baseline ✅
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {insightTop.map(d => <InsightCard key={d.country} d={d} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
