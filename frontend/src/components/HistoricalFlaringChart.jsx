/**
 * HistoricalFlaringChart
 * ======================
 * Renders the World Bank 2012-2024 annual gas-flaring trends.
 * Data source: offline Excel (backend/data/wb_flaring_by_economy_2012_2024.xlsx)
 *
 * Shows:
 *  • Global total BCM as a filled area (top track)
 *  • Per-country selectable lines (bottom track)
 *  • Hover tooltip with year + value
 */
import { useEffect, useState, useRef } from 'react'
import { getWBTrends, getWBCountryHistory, getWBCountries } from '../api/client'

const COUNTRY_COLORS = [
  '#00d4ff', '#ff3366', '#00ff88', '#ffcc00',
  '#ff6b2b', '#a855f7', '#06b6d4', '#f59e0b',
  '#10b981', '#ec4899',
]

const TOP_COUNTRIES = ['Russia', 'Iran', 'Iraq', 'USA', 'Nigeria', 'Algeria', 'Venezuela', 'Libya', 'Mexico', 'Saudi Arabia']

export default function HistoricalFlaringChart() {
  const [trends,       setTrends]       = useState([])   // [{year, global_bcm, top_countries}]
  const [countries,    setCountries]    = useState([])   // all country names
  const [selected,     setSelected]     = useState(['Russia', 'Iran', 'Iraq', 'USA', 'Nigeria'])
  const [countryData,  setCountryData]  = useState({})  // {country: [{year, bcm}]}
  const [loading,      setLoading]      = useState(true)
  const [tooltip,      setTooltip]      = useState(null)
  const [mode,         setMode]         = useState('global') // 'global' | 'country'
  const svgRef = useRef(null)

  // ── Fetch global trends + country list once ───────────────────────────────
  useEffect(() => {
    setLoading(true)
    Promise.all([getWBTrends(10), getWBCountries()])
      .then(([tRes, cRes]) => {
        setTrends(tRes.data)
        setCountries(cRes.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // ── Fetch per-country history when selection changes ──────────────────────
  useEffect(() => {
    if (!selected.length) return
    const missing = selected.filter(c => !countryData[c])
    if (!missing.length) return

    Promise.all(missing.map(c => getWBCountryHistory(c).then(r => ({ country: c, data: r.data }))))
      .then(results => {
        setCountryData(prev => {
          const updated = { ...prev }
          results.forEach(({ country, data }) => { updated[country] = data })
          return updated
        })
      })
      .catch(console.error)
  }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── SVG dimensions ────────────────────────────────────────────────────────
  const W = 1200, H = 340, PAD = { top: 24, right: 40, bottom: 40, left: 60 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const years = trends.map(t => t.year)

  // ── Scale helpers ─────────────────────────────────────────────────────────
  const xScale = (yr) => PAD.left + ((yr - (years[0] || 2012)) / Math.max(1, (years[years.length - 1] || 2024) - (years[0] || 2012))) * innerW
  const yScaleGlobal = (() => {
    const max = Math.max(...trends.map(t => t.global_bcm), 1)
    return (v) => PAD.top + innerH - (v / max) * innerH
  })()
  const yScaleCountry = (() => {
    const allVals = selected.flatMap(c => (countryData[c] || []).map(d => d.bcm))
    const max = Math.max(...allVals, 1)
    return (v) => PAD.top + innerH - (v / max) * innerH
  })()

  const yScale = mode === 'global' ? yScaleGlobal : yScaleCountry

  // ── Path builder ──────────────────────────────────────────────────────────
  const buildPath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const buildArea  = (pts, yBase) => {
    if (!pts.length) return ''
    const top  = buildPath(pts)
    const back = [...pts].reverse().map(p => `L${p.x.toFixed(1)},${yBase.toFixed(1)}`).join(' ')
    return `${top} ${back} Z`
  }

  // ── Hover ─────────────────────────────────────────────────────────────────
  const handleMouseMove = (e) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || !years.length) return
    const mx = e.clientX - rect.left - PAD.left
    const pct = Math.max(0, Math.min(1, mx / innerW))
    const yr = Math.round(years[0] + pct * (years[years.length - 1] - years[0]))
    const snap = years.reduce((a, b) => Math.abs(b - yr) < Math.abs(a - yr) ? b : a, years[0])
    const t = trends.find(d => d.year === snap)
    if (t) setTooltip({ year: snap, global_bcm: t.global_bcm, x: xScale(snap), y: PAD.top })
  }

  // ── Toggle country ────────────────────────────────────────────────────────
  const toggleCountry = (c) => {
    setSelected(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-muted)', fontSize: 11 }}>
      Loading World Bank historical data…
    </div>
  )

  if (!trends.length) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-muted)', fontSize: 11 }}>
      Historical data unavailable
    </div>
  )

  const globalPts = trends.map(t => ({ x: xScale(t.year), y: yScaleGlobal(t.global_bcm), ...t }))
  const baseY = PAD.top + innerH

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>

      {/* ── Mode toggle ── */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>View:</span>
        {['global', 'country'].map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
            border: mode === m ? '1px solid var(--cyan)' : '1px solid var(--border)',
            background: mode === m ? 'var(--cyan-dim)' : 'transparent',
            color: mode === m ? 'var(--cyan)' : 'var(--text-muted)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {m === 'global' ? '🌍 Global Total' : '🏳 By Country'}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Source: World Bank GFMR / NOAA VIIRS • 2012–2024
        </span>
      </div>

      {/* ── Country selector (only in country mode) ── */}
      {mode === 'country' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {Array.from(new Set([...TOP_COUNTRIES, ...selected])).map((c, i) => (
            <button key={c} onClick={() => toggleCountry(c)} style={{
              padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
              border: `1px solid ${selected.includes(c) ? COUNTRY_COLORS[i % COUNTRY_COLORS.length] : 'var(--border)'}`,
              background: selected.includes(c) ? `${COUNTRY_COLORS[i % COUNTRY_COLORS.length]}22` : 'transparent',
              color: selected.includes(c) ? COUNTRY_COLORS[i % COUNTRY_COLORS.length] : 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {c}
            </button>
          ))}
          <select 
            value=""
            onChange={e => {
              if (e.target.value && !selected.includes(e.target.value)) {
                toggleCountry(e.target.value)
              }
            }}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              borderRadius: 99,
              padding: '3px 10px',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              outline: 'none',
              marginLeft: 4,
            }}
          >
            <option value="" disabled>+ More Countries</option>
            {countries.filter(c => !TOP_COUNTRIES.includes(c) && !selected.includes(c)).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── SVG Chart ── */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(f => {
            const y = PAD.top + innerH * (1 - f)
            return (
              <g key={f}>
                <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y}
                  stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
              </g>
            )
          })}

          {/* Year axis labels */}
          {years.filter((_, i) => i % 2 === 0 || i === years.length - 1).map(yr => (
            <text key={yr} x={xScale(yr)} y={PAD.top + innerH + 24}
              textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.4)">
              {yr}
            </text>
          ))}

          {/* ── Global mode: filled area ── */}
          {mode === 'global' && globalPts.length > 0 && (
            <>
              <defs>
                <linearGradient id="wbAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#00d4ff" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#00d4ff" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <path d={buildArea(globalPts, baseY)} fill="url(#wbAreaGrad)" />
              <path d={buildPath(globalPts)} fill="none" stroke="#00d4ff" strokeWidth={1.8}
                strokeLinejoin="round" strokeLinecap="round" />
              {/* Data dots */}
              {globalPts.map(p => (
                <circle key={p.year} cx={p.x} cy={p.y} r={4}
                  fill="#00d4ff" stroke="#050810" strokeWidth={1.5} />
              ))}
              {/* Y-axis labels */}
              {globalPts.filter((_, i) => i % 3 === 0).map(p => (
                <text key={p.year} x={PAD.left - 8} y={p.y + 4}
                  textAnchor="end" fontSize={11} fill="rgba(255,255,255,0.5)">
                  {p.global_bcm.toFixed(0)}
                </text>
              ))}
            </>
          )}

          {/* ── Country mode: multi-line ── */}
          {mode === 'country' && selected.map((country, ci) => {
            const cdata = countryData[country]
            if (!cdata || !cdata.length) return null
            const pts = cdata.map(d => ({ x: xScale(d.year), y: yScaleCountry(d.bcm), ...d }))
            const color = COUNTRY_COLORS[TOP_COUNTRIES.indexOf(country) % COUNTRY_COLORS.length] || COUNTRY_COLORS[ci % COUNTRY_COLORS.length]
            return (
              <g key={country}>
                <path d={buildPath(pts)} fill="none" stroke={color} strokeWidth={2.5}
                  strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
                {pts.map(p => (
                  <circle key={p.year} cx={p.x} cy={p.y} r={3}
                    fill={color} stroke="#050810" strokeWidth={1} />
                ))}
                {/* Country label at last point */}
                <text x={pts[pts.length - 1].x + 6} y={pts[pts.length - 1].y + 4}
                  fontSize={11} fill={color} fontWeight={700}>
                  {country.length > 10 ? country.slice(0, 10) : country}
                </text>
              </g>
            )
          })}

          {/* ── Hover tooltip line ── */}
          {tooltip && (
            <>
              <line x1={tooltip.x} y1={PAD.top} x2={tooltip.x} y2={baseY}
                stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} strokeDasharray="4 4" />
              <rect x={tooltip.x + 8} y={PAD.top} width={110} height={mode === 'global' ? 44 : 32}
                rx={6} fill="rgba(5,8,22,0.92)" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
              <text x={tooltip.x + 16} y={PAD.top + 16} fontSize={12} fontWeight={700} fill="#ffffff">
                {tooltip.year}
              </text>
              {mode === 'global' && (
                <text x={tooltip.x + 16} y={PAD.top + 32} fontSize={10} fill="#00d4ff">
                  {tooltip.global_bcm?.toFixed(1)} BCM global
                </text>
              )}
            </>
          )}
        </svg>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
        {mode === 'global' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#00d4ff', fontWeight: 600 }}>
            <div style={{ width: 24, height: 3, background: '#00d4ff', borderRadius: 2 }} />
            Global flaring volume (BCM/yr)
          </div>
        ) : selected.map((c, i) => {
          const color = COUNTRY_COLORS[TOP_COUNTRIES.indexOf(c) % COUNTRY_COLORS.length] || COUNTRY_COLORS[i % COUNTRY_COLORS.length]
          const latest = countryData[c]?.[countryData[c].length - 1]
          return (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color, fontWeight: 600 }}>
              <div style={{ width: 16, height: 3, background: color, borderRadius: 2 }} />
              {c}{latest ? ` (${latest.bcm.toFixed(1)} BCM)` : ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}
