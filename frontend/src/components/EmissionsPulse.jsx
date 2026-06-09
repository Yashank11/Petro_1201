import { useEffect, useState } from 'react'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TREND_COLORS = {
  critical: { color: '#ff3366', bg: 'rgba(255,51,102,0.12)', label: 'CRITICAL' },
  elevated: { color: '#ff6b2b', bg: 'rgba(255,107,43,0.12)', label: 'ELEVATED' },
  declining: { color: '#00ff88', bg: 'rgba(0,255,136,0.10)', label: 'DECLINING' },
  normal:    { color: '#00d4ff', bg: 'rgba(0,212,255,0.08)', label: 'NORMAL' },
}

export default function EmissionsPulse() {
  const [pulse, setPulse] = useState(null)

  useEffect(() => {
    const load = () =>
      fetch(`${BASE}/api/pulse?days=5`)
        .then(r => r.json())
        .then(setPulse)
        .catch(() => {})
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  if (!pulse) return null

  const theme = TREND_COLORS[pulse.trend] || TREND_COLORS.normal
  const sign  = pulse.change_pct > 0 ? '+' : ''
  const arrow = pulse.change_pct > 0 ? '▲' : pulse.change_pct < 0 ? '▼' : '—'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '6px 14px',
      border: `1px solid ${theme.color}55`,
      borderRadius: 10,
      background: theme.bg,
      backdropFilter: 'blur(12px)',
      boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 20px ${theme.color}22`,
    }}>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '1.2px',
        textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap',
      }}>
        🔥 Global Pulse
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800,
          letterSpacing: '-0.5px', color: theme.color,
        }}>
          {(pulse.total_kt / 1000).toFixed(2)}M
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>t CO₂</span>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: theme.color,
      }}>
        <span>{arrow} {sign}{pulse.change_pct}%</span>
        <span style={{
          fontSize: 8, fontWeight: 700, padding: '2px 6px',
          borderRadius: 999, background: theme.color, color: '#050810',
          letterSpacing: '0.5px', textTransform: 'uppercase',
        }}>
          {theme.label}
        </span>
      </div>
    </div>
  )
}
