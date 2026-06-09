import { useState, useMemo } from 'react'

const COUNTRY_FLAGS = {
  India:        '🇮🇳',
  Iran:         '🇮🇷',
  Iraq:         '🇮🇶',
  'Saudi Arabia': '🇸🇦',
  USA:          '🇺🇸',
}

export default function WellDatabase({ knownWells, flares, onFlyTo }) {
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all') // all | active | dormant

  // Build a set of detected well coordinates from flare data
  const detectedCoords = useMemo(() => {
    if (!flares?.features) return new Set()
    const set = new Set()
    flares.features.forEach(f => {
      if (f.properties.matched_well && f.properties.well_name) {
        set.add(f.properties.well_name)
      }
    })
    return set
  }, [flares])

  const wells = useMemo(() => {
    if (!knownWells?.features) return []
    return knownWells.features.map(f => ({
      ...f.properties,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      active: detectedCoords.has(f.properties.name),
    }))
  }, [knownWells, detectedCoords])

  const countries = useMemo(() => {
    const cs = [...new Set(wells.map(w => w.country))].filter(Boolean).sort()
    return cs
  }, [wells])

  const filtered = useMemo(() => {
    let list = wells
    if (country !== 'all')  list = list.filter(w => w.country === country)
    if (statusFilter === 'active')  list = list.filter(w => w.active)
    if (statusFilter === 'dormant') list = list.filter(w => !w.active)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(w =>
        w.name?.toLowerCase().includes(q) ||
        w.company?.toLowerCase().includes(q) ||
        w.landmark?.toLowerCase().includes(q)
      )
    }
    return list
  }, [wells, country, statusFilter, search])

  return (
    <div className="well-db">
      {/* Controls */}
      <div className="well-db-controls">
        <input
          className="well-search"
          type="text"
          placeholder="Search wells, companies, landmarks…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="well-db-filters">
          <select
            className="well-select"
            value={country}
            onChange={e => setCountry(e.target.value)}
          >
            <option value="all">All Countries</option>
            {countries.map(c => (
              <option key={c} value={c}>{COUNTRY_FLAGS[c] || ''} {c}</option>
            ))}
          </select>
          <div className="status-toggle">
            {['all', 'active', 'dormant'].map(s => (
              <button
                key={s}
                className={`status-btn ${statusFilter === s ? 'active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? 'All' : s === 'active' ? '⚡ Active' : '◯ Dormant'}
              </button>
            ))}
          </div>
        </div>
        <div className="well-db-count">
          {filtered.length} of {wells.length} wells
          {' · '}
          <span style={{ color: 'var(--green)' }}>
            {wells.filter(w => w.active).length} active
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="well-table-wrap">
        <table className="well-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Well / Facility</th>
              <th>Company</th>
              <th>Country</th>
              <th>Landmark</th>
              <th>Coords</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                  No wells match your search.
                </td>
              </tr>
            )}
            {filtered.map((w, i) => (
              <tr key={`${w.name}-${i}`} className={`well-row ${w.active ? 'active' : ''}`}>
                <td>
                  <div
                    className={`well-status-dot ${w.active ? 'active' : 'dormant'}`}
                    title={w.active ? 'Thermal anomaly detected' : 'No detection'}
                  />
                </td>
                <td className="well-name-cell" title={w.name}>{w.name || '—'}</td>
                <td className="well-co-cell" title={w.company}>{w.company || '—'}</td>
                <td>
                  <span className="country-badge">
                    {COUNTRY_FLAGS[w.country] || ''} {w.country}
                  </span>
                </td>
                <td className="well-landmark-cell" title={w.landmark}>{w.landmark || '—'}</td>
                <td className="well-coords-cell">
                  {w.lat?.toFixed(4)}, {w.lon?.toFixed(4)}
                </td>
                <td>
                  {onFlyTo && (
                    <button
                      className="fly-btn"
                      onClick={() => onFlyTo(w.lon, w.lat, w.name)}
                      title="Fly to on map"
                    >
                      🗺
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
