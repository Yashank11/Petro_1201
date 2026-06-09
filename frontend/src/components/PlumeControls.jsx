/**
 * PlumeControls — Floating toggle panel for the atmospheric plume simulator.
 * Shows wind stats, particle count, and controls for the PlumeLayer.
 */

import { useState, useEffect } from 'react'

// Compass rose direction label from degrees
function compassDir(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW','N']
  return dirs[Math.round(deg / 45) % 8]
}

// Wind speed to Beaufort-like label
function windLabel(ms) {
  if (ms < 0.3) return 'Calm'
  if (ms < 1.5) return 'Light Air'
  if (ms < 3.3) return 'Light Breeze'
  if (ms < 5.4) return 'Gentle Breeze'
  if (ms < 7.9) return 'Moderate Breeze'
  if (ms < 10.7) return 'Fresh Breeze'
  if (ms < 13.8) return 'Strong Breeze'
  return 'Near Gale'
}

// Animated wind arrow SVG
function WindArrow({ deg, speed }) {
  const scale = Math.min(1.4, 0.5 + speed / 15)
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform:  `rotate(${deg}deg) scale(${scale})`,
        transition: 'transform 0.8s ease',
        color:       speed > 10 ? '#ff6b2b' : speed > 5 ? '#ffcc00' : '#00d4ff',
      }}
    >
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  )
}

export default function PlumeControls({
  visible,
  onToggle,
  opacity,
  onOpacityChange,
  wind,
  loading,
}) {
  const [expanded, setExpanded] = useState(false)

  // Compute aggregate wind stats from site array
  const avgSpeed  = wind?.length
    ? wind.reduce((s, w) => s + w.wind_speed_ms, 0) / wind.length
    : 0
  const avgDir    = wind?.length
    ? wind.reduce((s, w) => s + w.wind_dir_deg, 0) / wind.length
    : 0
  const siteCount = wind?.length ?? 0
  const maxGust   = wind?.length
    ? Math.max(...wind.map(w => w.wind_gusts_ms))
    : 0

  // Anomaly sites with wind
  const anomalySites = wind?.filter(w => w.is_anomaly).length ?? 0

  return (
    <div className="plume-controls" id="plume-controls">
      {/* ── Collapsed header row ─────────────────────────────────────── */}
      <div className="plume-controls-header" onClick={() => setExpanded(e => !e)}>
        <div className="plume-controls-left">
          {/* Live/Offline indicator */}
          <div
            className="plume-status-dot"
            style={{ background: visible ? 'var(--orange)' : 'var(--text-muted)' }}
          />
          <span className="plume-title">Plume Sim</span>
          {wind?.length > 0 && (
            <span className="plume-site-count">{siteCount} sites</span>
          )}
        </div>

        <div className="plume-controls-right" onClick={e => e.stopPropagation()}>
          {/* Wind speed readout */}
          {avgSpeed > 0 && (
            <div className="plume-wind-readout">
              <WindArrow deg={avgDir} speed={avgSpeed} />
              <span className="plume-wind-speed">{avgSpeed.toFixed(1)}<small> m/s</small></span>
            </div>
          )}

          {/* Toggle button */}
          <button
            id="plume-toggle-btn"
            className={`plume-toggle-btn ${visible ? 'active' : ''}`}
            onClick={onToggle}
            title={visible ? 'Hide atmospheric plumes' : 'Show atmospheric plumes'}
            aria-label={visible ? 'Disable plume simulation' : 'Enable plume simulation'}
          >
            {visible ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                </svg>
                ON
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                </svg>
                OFF
              </>
            )}
          </button>

          {/* Expand chevron */}
          <button
            className="plume-expand-btn"
            onClick={() => setExpanded(e => !e)}
            aria-label="Expand plume controls"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Expanded detail panel ────────────────────────────────────── */}
      {expanded && (
        <div className="plume-controls-body">
          {/* Opacity slider */}
          <div className="plume-row">
            <span className="plume-row-label">Opacity</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={opacity}
              onChange={e => onOpacityChange(parseFloat(e.target.value))}
              className="plume-slider"
              aria-label="Plume opacity"
            />
            <span className="plume-row-val">{Math.round(opacity * 100)}%</span>
          </div>

          {/* Wind stats grid */}
          <div className="plume-stats-grid">
            <div className="plume-stat">
              <div className="plume-stat-val" style={{ color: 'var(--cyan)' }}>
                {avgSpeed.toFixed(1)}<span style={{ fontSize: 9 }}> m/s</span>
              </div>
              <div className="plume-stat-label">Avg Wind</div>
            </div>
            <div className="plume-stat">
              <div className="plume-stat-val" style={{ color: 'var(--orange)' }}>
                {maxGust.toFixed(1)}<span style={{ fontSize: 9 }}> m/s</span>
              </div>
              <div className="plume-stat-label">Max Gusts</div>
            </div>
            <div className="plume-stat">
              <div className="plume-stat-val" style={{ color: 'var(--text-primary)' }}>
                {compassDir(avgDir)}
              </div>
              <div className="plume-stat-label">Direction</div>
            </div>
            <div className="plume-stat">
              <div className="plume-stat-val" style={{ color: anomalySites > 0 ? 'var(--red)' : 'var(--green)' }}>
                {anomalySites}
              </div>
              <div className="plume-stat-label">⚡ Anomaly</div>
            </div>
          </div>

          {/* Beaufort label */}
          {avgSpeed > 0 && (
            <div className="plume-beaufort">
              <span style={{ color: 'var(--text-muted)' }}>Conditions:</span>
              <span style={{ color: 'var(--cyan)', fontWeight: 600 }}> {windLabel(avgSpeed)}</span>
            </div>
          )}

          {/* Colour legend */}
          <div className="plume-legend">
            <div className="plume-legend-label">Plume Colour</div>
            <div className="plume-legend-bar">
              <div className="plume-legend-gradient" />
              <div className="plume-legend-ticks">
                <span>Low CO₂</span>
                <span>High CO₂</span>
              </div>
            </div>
            <div className="plume-legend-anomaly">
              <div className="plume-legend-dot" style={{ background: '#ff3366' }} />
              <span>Critical anomaly site</span>
            </div>
          </div>

          {/* Data source attribution */}
          <div className="plume-attribution">
            Wind: Open-Meteo Forecast API · real-time 10m
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="plume-loading">
          <div className="plume-loading-dot" />
          Fetching wind vectors…
        </div>
      )}
    </div>
  )
}
