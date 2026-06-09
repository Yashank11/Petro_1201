import { useEffect, useState, useCallback, useRef } from 'react'
import GlobalMap from './components/GlobalMap'
import KPICards from './components/KPICards'
import CompanyLeaderboard from './components/CompanyLeaderboard'
import AnomalyIntelligenceChart from './components/AnomalyIntelligenceChart'
import AlertFeed from './components/AlertFeed'
import Sidebar from './components/Sidebar'
import WellDatabase from './components/WellDatabase'
import OilPriceTicker from './components/OilPriceTicker'
import EmissionsPulse from './components/EmissionsPulse'
import FacilityCard from './components/FacilityCard'
import HistoricalFlaringChart from './components/HistoricalFlaringChart'
import PetroCopilot from './components/PetroCopilot'
import PlumeControls from './components/PlumeControls'
import {
  getSummary, getFlares, getEmitters, getAlerts,
  getTrends, getKnownWells, getOilPrices, getWind,
} from './api/client'

// ── Loading screen ──────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <div className="loading-logo">PETRO</div>
      <div className="loading-sub">Ingesting satellite + well data…</div>
    </div>
  )
}

// ── CSV Export ───────────────────────────────────────────────────────────────
function exportFlaresCSV(flares) {
  if (!flares?.features?.length) return
  const headers = ['Well/Basin','Company','Country','FRP_MW','CO2_t_day','Gas_Value_USD','Anomaly','Confidence','Date','Lat','Lon']
  const rows = flares.features.map(f => {
    const p = f.properties
    const [lon, lat] = f.geometry.coordinates
    return [
      p.well_name || p.basin,
      p.company, p.country,
      p.frp, p.co2_eq_t,
      p.gas_value_usd,
      p.is_anomaly ? 'YES' : 'NO',
      p.attr_confidence ?? '',
      p.date, lat.toFixed(5), lon.toFixed(5),
    ].map(v => `"${v}"`).join(',')
  })
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `petro_flares_${new Date().toISOString().slice(0,10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

// ── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [days,          setDays]          = useState(5)
  const [activeCountry, setActiveCountry] = useState('all')
  const [activeTab,     setActiveTab]     = useState('leaderboard')
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [wellDBOpen,    setWellDBOpen]    = useState(false)
  const [selectedSite,  setSelectedSite]  = useState(null)

  const [summary,    setSummary]    = useState(null)
  const [flares,     setFlares]     = useState(null)
  const [emitters,   setEmitters]   = useState([])
  const [alerts,     setAlerts]     = useState([])
  const [trends,     setTrends]     = useState([])
  const [knownWells, setKnownWells] = useState(null)
  const [oilPrices,  setOilPrices]  = useState(null)

  // Plume simulator state
  const [wind,         setWind]         = useState([])
  const [windLoading,  setWindLoading]  = useState(false)
  const [plumeVisible, setPlumeVisible] = useState(false)   // off by default until first wind fetch
  const [plumeOpacity, setPlumeOpacity] = useState(0.82)

  const mapRef = useRef(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sumRes, flareRes, emitRes, alertRes, trendRes, priceRes] = await Promise.all([
        getSummary(days),
        getFlares(days),
        getEmitters(days, 20),
        getAlerts(days),
        getTrends(days),
        getOilPrices(),
      ])
      setSummary(sumRes.data)
      setFlares(flareRes.data)
      setEmitters(emitRes.data)
      setAlerts(alertRes.data)
      setTrends(trendRes.data)
      setOilPrices(priceRes.data)
    } catch (e) {
      setError('Cannot reach the backend. Make sure Python API is running on port 8000.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [days])

  // Fetch known wells once (static data — no day dependency)
  useEffect(() => {
    getKnownWells()
      .then(res => setKnownWells(res.data))
      .catch(err => console.warn('Known wells fetch failed:', err))
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Fetch wind data (non-blocking, runs after flares load)
  useEffect(() => {
    if (loading) return   // wait for main data first
    setWindLoading(true)
    getWind(days)
      .then(res => {
        setWind(res.data || [])
        // Auto-enable plume on first successful fetch
        setPlumeVisible(v => v || (res.data?.length > 0))
      })
      .catch(err => console.warn('Wind fetch failed:', err))
      .finally(() => setWindLoading(false))
  }, [days, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  // PetroCopilot map filter event handler
  useEffect(() => {
    const handler = (e) => {
      const country = e.detail?.country
      if (country) setActiveCountry(country)
    }
    window.addEventListener('copilot:filter', handler)
    return () => window.removeEventListener('copilot:filter', handler)
  }, [])

  // Filter flares by active country only (basin filter removed)
  const visibleFlares = !flares ? null : {
    ...flares,
    features: flares.features.filter(f => {
      return activeCountry === 'all' || f.properties.country === activeCountry
    }),
  }

  // FlyTo handler for WellDatabase
  const handleFlyTo = useCallback((lon, lat) => {
    if (mapRef.current?.__flyTo) {
      mapRef.current.__flyTo(lon, lat, 12)
    }
    setWellDBOpen(false)
  }, [])

  // Handle map site selection → open FacilityCard
  const handleSelectSite = useCallback((props) => {
    setSelectedSite(props)
  }, [])

  return (
    <>
      {loading && <LoadingScreen />}

      <div className="app-shell">
        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <header className="topbar">
          <div className="topbar-logo">
            <div className="dot" />
            PETRO
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>
            Carbon Emissions Intelligence
          </span>

          {/* Live oil prices inline */}
          <OilPriceTicker />

          <div className="topbar-spacer" />
          <div className="live-pill">Live</div>
          <div className="topbar-badge">VIIRS NRT</div>
          <div className="topbar-badge" style={{ color: 'var(--orange)', borderColor: 'rgba(255,107,43,0.35)', background: 'var(--orange-dim)' }}>
            {days}d window
          </div>
          {summary?.unattributed_count > 0 && (
            <div className="topbar-badge" style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.1)' }}>
              ⚠ {summary.unattributed_count} Unattributed
            </div>
          )}
          <button
            onClick={() => exportFlaresCSV(flares)}
            title="Export current flares as CSV"
            style={{
              background: 'var(--green-dim)', border: '1px solid rgba(0,255,136,0.35)',
              color: 'var(--green)', borderRadius: 6, padding: '4px 10px',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              letterSpacing: 0.5,
            }}
          >
            ↓ CSV
          </button>
          <button
            onClick={fetchAll}
            style={{
              background: 'var(--cyan-dim)', border: '1px solid var(--border-glow)',
              color: 'var(--cyan)', borderRadius: 6, padding: '4px 12px',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              letterSpacing: 0.5,
            }}
          >
            ↻ Refresh
          </button>
        </header>

        {/* ── Left sidebar ──────────────────────────────────────────────── */}
        <Sidebar
          days={days}
          onDaysChange={setDays}
          activeCountry={activeCountry}
          onCountryChange={setActiveCountry}
          summary={summary}
          onOpenWellDB={() => setWellDBOpen(true)}
        />

        {/* ── Globe map ─────────────────────────────────────────────────── */}
        <main className="map-container">
          {error && (
            <div className="map-overlay top-left" style={{ pointerEvents: 'auto', maxWidth: 320 }}>
              <div style={{ color: 'var(--red)', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>⚠ Backend Offline</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{error}</div>
            </div>
          )}

          {/* Global Emissions Pulse — floating above the map */}
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            zIndex: 5, pointerEvents: 'none',
          }}>
            <EmissionsPulse />
          </div>

          {/* Plume Simulator Controls — floating top-left of map */}
          <div style={{
            position: 'absolute', top: 12, left: 12,
            zIndex: 6, pointerEvents: 'auto',
          }}>
            <PlumeControls
              visible={plumeVisible}
              onToggle={() => setPlumeVisible(v => !v)}
              opacity={plumeOpacity}
              onOpacityChange={setPlumeOpacity}
              wind={wind}
              loading={windLoading}
            />
          </div>

          <GlobalMap
            ref={mapRef}
            flares={visibleFlares}
            knownWells={knownWells}
            onSelectSite={handleSelectSite}
            wind={wind}
            plumeVisible={plumeVisible}
            plumeOpacity={plumeOpacity}
          />
        </main>


        {/* ── Right panel ───────────────────────────────────────────────── */}
        <aside className="right-panel">
          <nav className="tab-nav">
            <button
              className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('leaderboard')}
            >
              Emitters
            </button>
            <button
              className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
              onClick={() => setActiveTab('alerts')}
            >
              Alerts {alerts.length > 0 && (
                <span style={{
                  marginLeft: 4, background: 'var(--red)', color: '#fff',
                  borderRadius: 999, fontSize: 9, padding: '1px 5px', fontWeight: 700,
                }}>
                  {alerts.length}
                </span>
              )}
            </button>
          </nav>

          <div style={{ padding: '10px 16px 6px', borderBottom: '1px solid var(--border)' }}>
            <div className="leaderboard-header" style={{ padding: 0, border: 'none' }}>
              {activeTab === 'leaderboard' ? 'Top CO₂ Emitters' : 'ESG Anomaly Feed'}
            </div>
          </div>

          {activeTab === 'leaderboard' ? (
            <div className="leaderboard" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <CompanyLeaderboard emitters={emitters} loading={loading} />
            </div>
          ) : (
            <AlertFeed alerts={alerts} loading={loading} />
          )}
        </aside>

        {/* ── Bottom panel ──────────────────────────────────────────────── */}
        <section className="bottom-panel">
          <KPICards summary={summary} loading={loading} trends={trends} alerts={alerts} />

          <div className="trend-panel">
            <div style={{ 
              padding: '4px 10px 8px', 
              borderBottom: '1px solid var(--border)', 
              marginBottom: 6,
              fontSize: 10, fontWeight: 700, letterSpacing: '0.8px',
              textTransform: 'uppercase', color: 'var(--text-muted)'
            }}>
              Emissions Trend & Anomaly Intel
            </div>

            <div style={{ flex: 1, position: 'relative' }}>
              <AnomalyIntelligenceChart trends={trends} loading={loading} />
            </div>
          </div>
        </section>

        {/* ── World Bank Historical Flaring (2012-2024) ───────────────── */}
        <section className="bottom-panel-2">
          <div style={{
            padding: '4px 0 8px',
            borderBottom: '1px solid var(--border)',
            marginBottom: 6,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.8px',
            textTransform: 'uppercase', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>Historical Flaring</span>
            <span style={{ color: 'var(--cyan)', fontSize: 9, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
              2012 – 2024 • World Bank
            </span>
          </div>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <HistoricalFlaringChart />
          </div>
        </section>
      </div>

      {/* ── Facility Card (Digital Twin modal) ────────────────────────── */}
      {selectedSite && (
        <FacilityCard
          site={selectedSite}
          flares={flares}
          onClose={() => setSelectedSite(null)}
        />
      )}

      {/* ── Well Database modal ───────────────────────────────────────── */}
      {wellDBOpen && (
        <div className="well-modal-backdrop" onClick={() => setWellDBOpen(false)}>
          <div className="well-modal" onClick={e => e.stopPropagation()}>
            <div className="well-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--cyan)' }}>🗄 Well Database</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
                  Real-world oil & gas assets from Excel
                </span>
              </div>
              <button className="well-modal-close" onClick={() => setWellDBOpen(false)}>✕</button>
            </div>
            <WellDatabase
              knownWells={knownWells}
              flares={flares}
              onFlyTo={handleFlyTo}
            />
          </div>
        </div>
      )}

      {/* ── PetroCopilot AI Command Center ────────────────────────────── */}
      <PetroCopilot
        mapRef={mapRef}
        summary={summary}
        days={days}
      />

      {/* ── Disclaimer footer ─────────────────────────────────────────── */}
      <div className="disclaimer-footer">
        ⚠ Company names are approximated from publicly available resources and may not reflect actual operational attribution.
        All emissions estimates are derived from satellite thermal anomaly data using the Elvidge 2016 model and IPCC AR6 conversion factors.
        This platform is intended for research and awareness purposes only.
      </div>
    </>
  )
}
