import { useMemo, useEffect, useState } from 'react'

function AnimatedNumber({ value, decimals = 0, prefix = '' }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (value === 0 || value === undefined) return
    const steps = 40
    const delta = (value - 0) / steps
    let current = 0
    let step = 0
    const timer = setInterval(() => {
      step++
      current += delta
      setDisplay(current)
      if (step >= steps) { setDisplay(value); clearInterval(timer) }
    }, 20)
    return () => clearInterval(timer)
  }, [value])

  return <>{prefix}{display.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}</>
}

function calcTrend(dataArray) {
  if (!dataArray || dataArray.length < 2) return { pct: 0, series: [] }
  const today = dataArray[dataArray.length - 1]
  const prior = dataArray.slice(0, -1)
  const priorAvg = prior.reduce((a, b) => a + b, 0) / prior.length
  const pct = priorAvg === 0 ? 0 : ((today - priorAvg) / priorAvg) * 100
  return { pct, series: dataArray }
}

export default function KPICards({ summary, loading, trends = [], alerts = [], flares }) {
  const data = useMemo(() => {
    const flareTrend = calcTrend(trends.map(t => t.flares || 0))
    const co2Trend   = calcTrend(trends.map(t => t.co2_kt || 0))
    const gasTrend   = calcTrend(trends.map(t => t.gas_usd || 0))
    const intensityTrend = calcTrend(trends.map(t => t.flares ? ((t.co2_kt * 1000) / t.flares) : 0))

    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length

    // Gas formatting
    const gasDaily = summary?.total_gas_value_usd || 0
    const gasAnnual = gasDaily * 365
    const gasAnnualStr = gasAnnual >= 1_000_000 
      ? `$${(gasAnnual / 1_000_000).toFixed(1)}M` 
      : `$${(gasAnnual / 1_000).toFixed(1)}K`
    const gasDailyStr = gasDaily >= 1_000
      ? `$${Math.round(gasDaily / 1000)}K`
      : `$${gasDaily}`

    // Intensity calculation
    const currentIntensity = summary?.active_sites ? ((summary.total_co2_kt * 1000) / summary.active_sites) : 0

    return {
      flareTrend, co2Trend, gasTrend, intensityTrend,
      criticalAlerts, gasDailyStr, gasAnnualStr,
      currentIntensity
    }
  }, [trends, summary, alerts, flares])

  if (loading || !summary) return (
    <div style={{ padding: 20, color: 'var(--text-muted)' }}>Loading intelligence...</div>
  )

  const { flareTrend, co2Trend, gasTrend, intensityTrend, criticalAlerts, gasDailyStr, gasAnnualStr, currentIntensity } = data

  const formatPct = (pct) => `${pct > 0 ? '↑ +' : pct < 0 ? '↓ ' : ''}${Math.abs(pct).toFixed(1)}%`
  const trendClass = (pct) => pct > 5 ? 'up' : pct < -5 ? 'down' : 'neutral'

  return (
    <>
      {/* 1. Active Flare Sites */}
      <div className="kpi-card">
        <div className="kpi-label">Active Flare Sites</div>
        <div className="kpi-main-row">
          <div className="kpi-value cyan"><AnimatedNumber value={summary.active_sites} /></div>
        </div>
        <div className="kpi-trend-row">
          <span className={`kpi-trend-val ${trendClass(flareTrend.pct)}`}>
            {formatPct(flareTrend.pct)}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>vs prior avg</span>
        </div>
        <div className="kpi-status">{flareTrend.pct > 10 ? 'High activity' : flareTrend.pct < -10 ? 'Decreasing' : 'Normal volume'}</div>
      </div>

      {/* 2. Total CO2 */}
      <div className="kpi-card">
        <div className="kpi-label">Total CO₂ This Period</div>
        <div className="kpi-main-row">
          <div className="kpi-value orange"><AnimatedNumber value={summary.total_co2_kt} decimals={1} /></div>
          <div style={{ color: 'var(--orange)', fontSize: 12, fontWeight: 700, paddingBottom: 4 }}>kt</div>
        </div>
        <div className="kpi-trend-row">
          <span className={`kpi-trend-val ${trendClass(co2Trend.pct)}`}>
            {formatPct(co2Trend.pct)}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>vs baseline</span>
        </div>
        <div className="kpi-status">{co2Trend.pct > 5 ? 'Above normal' : 'Expected range'}</div>
      </div>

      {/* 3. Anomalies Detected */}
      <div className="kpi-card">
        <div className="kpi-label">Anomalies Detected</div>
        <div className="kpi-main-row">
          <div className="kpi-value red"><AnimatedNumber value={summary.anomaly_count} /></div>
        </div>
        {summary.anomaly_count > 0 ? (
          <>
            <div className="kpi-trend-row">
              <span className="kpi-trend-val up">⚠️ {criticalAlerts} critical spikes</span>
            </div>
            <div className="kpi-status">Action recommended</div>
          </>
        ) : (
          <>
            <div className="kpi-trend-row">
              <span className="kpi-trend-val down">✓ No active alerts</span>
            </div>
            <div className="kpi-status">System stable</div>
          </>
        )}
      </div>

      {/* 4. Emission Intensity Index */}
      <div className="kpi-card">
        <div className="kpi-label">Emission Intensity</div>
        <div className="kpi-main-row">
          <div className="kpi-value cyan"><AnimatedNumber value={currentIntensity} decimals={2} /></div>
          <div style={{ color: 'var(--cyan)', fontSize: 12, fontWeight: 700, paddingBottom: 4 }}>t/flare</div>
        </div>
        <div className="kpi-trend-row">
          <span className={`kpi-trend-val ${trendClass(intensityTrend.pct)}`}>
            {formatPct(intensityTrend.pct)}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>vs prior avg</span>
        </div>
        <div className="kpi-status">
          {intensityTrend.pct > 5 ? 'Efficiency declining' : intensityTrend.pct < -5 ? 'Efficiency improving' : 'Stable intensity'}
        </div>
      </div>

      {/* 5. Gas Loss */}
      <div className="kpi-card">
        <div className="kpi-label">Recoverable Energy Value</div>
        <div className="kpi-main-row">
          <div className="kpi-value yellow">{gasDailyStr}</div>
          <div style={{ color: 'var(--yellow)', fontSize: 12, fontWeight: 700, paddingBottom: 4 }}>/day</div>
        </div>
        <div className="kpi-trend-row">
          <span className={`kpi-trend-val ${trendClass(gasTrend.pct)}`}>
            {formatPct(gasTrend.pct)} vs baseline
          </span>
        </div>
        <div className="kpi-status">≈ {gasAnnualStr}/year</div>
      </div>
    </>
  )
}
