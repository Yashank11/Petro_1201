const COUNTRIES = [
  { label: 'All Countries', flag: '🌍', value: 'all' },
  { label: 'India',         flag: '🇮🇳', value: 'India' },
  { label: 'Iran',          flag: '🇮🇷', value: 'Iran' },
  { label: 'Iraq',          flag: '🇮🇶', value: 'Iraq' },
  { label: 'Saudi Arabia',  flag: '🇸🇦', value: 'Saudi Arabia' },
  { label: 'USA',           flag: '🇺🇸', value: 'USA' },
]

export default function Sidebar({
  days, onDaysChange,
  activeCountry, onCountryChange,
  summary,
  onOpenWellDB,
}) {
  return (
    <div className="sidebar">
      {/* Data window */}
      <div style={{ marginBottom: 4 }}>
        <div className="section-label">Data Window</div>
        <div className="slider-row">
          <div className="slider-label">
            <span>Last {days} days</span>
            <span style={{ color: 'var(--cyan)' }}>{days}d</span>
          </div>
          <input
            type="range" min={1} max={5} value={days}
            onChange={e => onDaysChange(Number(e.target.value))}
          />
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />

      {/* Country filter */}
      <div>
        <div className="section-label">Country Focus</div>
        <div className="filter-group">
          {COUNTRIES.map(c => (
            <button
              key={c.value}
              className={`filter-btn ${activeCountry === c.value ? 'active' : ''}`}
              onClick={() => onCountryChange(c.value)}
            >
              <span style={{ marginRight: 4 }}>{c.flag}</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />

      {/* Well DB toggle */}
      <button
        onClick={onOpenWellDB}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'var(--cyan-dim)',
          border: '1px solid var(--border-glow)',
          borderRadius: 8,
          color: 'var(--cyan)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          letterSpacing: 0.3,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        🗄 Well Database
        {summary?.known_wells_tracked > 0 && (
          <span style={{
            marginLeft: 'auto',
            background: 'var(--cyan)',
            color: '#050810',
            borderRadius: 999,
            fontSize: 9,
            padding: '1px 6px',
            fontWeight: 700,
          }}>
            {summary.known_wells_tracked}
          </span>
        )}
      </button>

      <div style={{ flex: 1 }} />

      {/* Data sources */}
      <div>
        <div className="section-label">Data Sources</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.9 }}>
          <div>📡 NASA FIRMS VIIRS NRT</div>
          <div>🌍 Climate TRACE v6 API</div>
          <div>🛢 Real Well Database (Excel)</div>
          <div>📈 Yahoo Finance (Prices)</div>
          <div>📐 Elvidge 2016 calibration</div>
          <div>⚗️ IPCC AR6 EF: 2.86 kg/kg</div>
          <div>
            <a
              href="https://www.worldbank.org/en/programs/gasflaringreduction/global-flaring-data"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--cyan)', textDecoration: 'none' }}
            >
              🌐 World Bank Flaring Data
            </a>
          </div>
        </div>
      </div>

      {/* Refresh hint */}
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
        Data cached 1 hr<br />
        <span style={{ color: 'var(--cyan)' }}>VIIRS NRT latency ≈ 3 hrs</span>
      </div>
    </div>
  )
}
