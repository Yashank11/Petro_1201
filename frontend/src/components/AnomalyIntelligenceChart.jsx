import { useMemo } from 'react'
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, Scatter
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  
  const actualData = payload.find(p => p.dataKey === 'co2_kt')?.payload
  if (!actualData) return null

  const { co2_kt, expectedMin, expectedMax, anomalyScore, isAnomaly } = actualData

  return (
    <div style={{
      background: 'rgba(11,17,32,0.97)', border: `1px solid ${isAnomaly ? 'rgba(255,51,102,0.5)' : 'rgba(0,212,255,0.3)'}`,
      borderRadius: 8, padding: '10px 14px', fontSize: 11, fontFamily: 'var(--font-sans)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: 'var(--text-muted)' }}>Expected:</span>
          <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {expectedMin.toFixed(2)} – {expectedMax.toFixed(2)} kt
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: 'var(--text-muted)' }}>Actual:</span>
          <span style={{ color: '#00d4ff', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {co2_kt.toFixed(2)} kt
          </span>
        </div>
        
        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <span style={{ 
            color: isAnomaly ? '#ff3366' : '#00ff88', 
            fontWeight: 700 
          }}>
            {isAnomaly ? '⚠️ Anomaly Detected' : '✓ Normal'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: 'var(--text-muted)' }}>Deviation:</span>
          <span style={{ 
            color: isAnomaly ? '#ff3366' : 'var(--text-secondary)', 
            fontFamily: 'var(--font-mono)', fontWeight: 600
          }}>
            {anomalyScore > 0 ? '+' : ''}{anomalyScore.toFixed(1)}σ
          </span>
        </div>
      </div>
    </div>
  )
}

const CustomizedDot = (props) => {
  const { cx, cy, payload } = props
  if (!payload.isAnomaly) return null
  return (
    <circle cx={cx} cy={cy} r={4} fill="#ff3366" stroke="rgba(255,51,102,0.4)" strokeWidth={4} />
  )
}

export default function AnomalyIntelligenceChart({ trends, loading }) {
  if (loading) return (
    <div style={{ color: 'var(--text-muted)', fontSize: 12, paddingTop: 40, textAlign: 'center' }}>
      Analyzing historical behavior…
    </div>
  )
  if (!trends?.length) return (
    <div style={{ color: 'var(--text-muted)', fontSize: 12, paddingTop: 40, textAlign: 'center' }}>
      No trend data available
    </div>
  )

  const data = useMemo(() => {
    // 1. Calculate population mean and stddev
    const n = trends.length
    const mean = trends.reduce((acc, curr) => acc + curr.co2_kt, 0) / n
    const variance = trends.reduce((acc, curr) => acc + Math.pow(curr.co2_kt - mean, 2), 0) / n
    const stdDev = Math.sqrt(variance) || 0.0001 // prevent div by zero

    // 2. Map data with Z-scores and expected ranges
    const zThreshold = 1.2
    return trends.map(t => {
      const anomalyScore = (t.co2_kt - mean) / stdDev
      const isAnomaly = anomalyScore > zThreshold
      const expectedMin = Math.max(0, mean - zThreshold * stdDev)
      const expectedMax = mean + zThreshold * stdDev
      
      return {
        date: t.date_str?.slice(5) ?? '',
        co2_kt: t.co2_kt,
        expectedRange: [expectedMin, expectedMax],
        expectedMin,
        expectedMax,
        anomalyScore,
        isAnomaly
      }
    })
  }, [trends])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{
        position: 'absolute', top: -2, right: 0, zIndex: 2,
        fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)',
        background: 'rgba(11,17,32,0.8)', padding: '2px 6px', borderRadius: 4,
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        Dynamic Baseline (μ ± 1.2σ)
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 14, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#00d4ff', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
          <Legend
            wrapperStyle={{ fontSize: 10, color: 'var(--text-muted)', paddingTop: 4 }}
            formatter={(value) => {
              if (value === 'expectedRange') return <span style={{ color: '#8892b0' }}>Expected Range</span>
              if (value === 'co2_kt') return <span style={{ color: '#00d4ff' }}>Actual Emissions</span>
              return value
            }}
          />
          {/* Expected Band */}
          <Area 
            type="monotone" 
            dataKey="expectedRange" 
            name="expectedRange"
            stroke="none" 
            fill="rgba(255,255,255,0.06)" 
            isAnimationActive={false}
          />
          {/* Actual Line */}
          <Area 
            type="monotone" 
            dataKey="co2_kt" 
            name="co2_kt"
            stroke="#00d4ff" 
            strokeWidth={2} 
            fill="url(#gradActual)" 
            dot={<CustomizedDot />}
            activeDot={{ r: 4, fill: '#00d4ff', stroke: 'rgba(0,212,255,0.4)', strokeWidth: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
