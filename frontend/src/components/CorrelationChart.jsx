import { useEffect, useRef } from 'react'
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'

function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length)
  if (n < 2) return null
  const meanX = xs.slice(0, n).reduce((a, b) => a + b, 0) / n
  const meanY = ys.slice(0, n).reduce((a, b) => a + b, 0) / n
  let cov = 0, varX = 0, varY = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX, dy = ys[i] - meanY
    cov  += dx * dy
    varX += dx * dx
    varY += dy * dy
  }
  const denom = Math.sqrt(varX * varY)
  return denom === 0 ? 0 : cov / denom
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(11,17,32,0.97)', border: '1px solid rgba(0,212,255,0.3)',
      borderRadius: 8, padding: '8px 12px', fontSize: 11,
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
          {p.name === 'CO₂ kt' ? ' kt' : p.name === 'Brent $' ? ' USD' : ''}
        </div>
      ))}
    </div>
  )
}

export default function CorrelationChart({ trends, oilPrices, loading }) {
  if (loading) return (
    <div style={{ color: 'var(--text-muted)', fontSize: 12, paddingTop: 40, textAlign: 'center' }}>
      Loading correlation data…
    </div>
  )
  if (!trends?.length) return (
    <div style={{ color: 'var(--text-muted)', fontSize: 12, paddingTop: 40, textAlign: 'center' }}>
      No trend data available
    </div>
  )

  // Build aligned dataset
  const brentHistory = oilPrices?.Brent?.history || []
  const brentMap = {}
  brentHistory.forEach(h => { brentMap[h.date] = h.price })

  const data = trends.map(t => ({
    date:    t.date_str?.slice(5) ?? '',
    co2_kt:  t.co2_kt,
    brent:   brentMap[t.date_str] ?? null,
  })).filter(d => d.brent !== null)

  // Pearson r
  const co2s   = data.map(d => d.co2_kt)
  const brents = data.map(d => d.brent)
  const r = pearson(co2s, brents)

  const rColor = r === null ? 'var(--text-muted)'
    : Math.abs(r) > 0.6 ? '#00ff88'
    : Math.abs(r) > 0.3 ? '#ffcc00'
    : 'var(--text-muted)'

  const rLabel = r === null
    ? 'Insufficient overlap'
    : `r = ${r.toFixed(2)} ${Math.abs(r) > 0.6 ? '(strong)' : Math.abs(r) > 0.3 ? '(moderate)' : '(weak)'}`

  const noOverlap = data.length < 2

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Correlation badge */}
      <div style={{
        position: 'absolute', top: -2, right: 0, zIndex: 2,
        fontSize: 10, fontWeight: 700, color: rColor,
        fontFamily: 'var(--font-mono)',
        background: 'rgba(11,17,32,0.8)', padding: '2px 6px', borderRadius: 4,
        border: `1px solid ${rColor}55`,
      }}>
        {noOverlap ? 'Indicative (low sample size)' : rLabel}
      </div>

      {noOverlap ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', gap: 6,
          color: 'var(--text-muted)', fontSize: 11,
        }}>
          <div>Insufficient temporal overlap between FIRMS & oil price data</div>
          <div style={{ fontSize: 10 }}>
            Short-term Brent history aligned with daily emissions — indicative analysis only
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 16, right: 44, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="gradCo2Corr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left"  tick={{ fill: '#00d4ff', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#ff6b2b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 10, color: 'var(--text-muted)', paddingTop: 4 }}
              formatter={v => <span style={{ color: v === 'CO₂ kt' ? '#00d4ff' : '#ff6b2b' }}>{v}</span>}
            />
            <Area yAxisId="left" type="monotone" dataKey="co2_kt" name="CO₂ kt"
              stroke="#00d4ff" strokeWidth={2} fill="url(#gradCo2Corr)" dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="brent" name="Brent $"
              stroke="#ff6b2b" strokeWidth={2} dot={{ r: 3, fill: '#ff6b2b' }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
