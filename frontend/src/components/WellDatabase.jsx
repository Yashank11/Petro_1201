import { useState, useMemo } from 'react'

const COMMON_FLAGS = {
  'United States': '🇺🇸',
  USA:             '🇺🇸',
  Canada:          '🇨🇦',
  Russia:          '🇷🇺',
  'Saudi Arabia':  '🇸🇦',
  China:           '🇨🇳',
  Brazil:          '🇧🇷',
  Norway:          '🇳🇴',
  Mexico:          '🇲🇽',
  Iran:            '🇮🇷',
  Iraq:            '🇮🇶',
  Kuwait:          '🇰🇼',
  'United Arab Emirates': '🇦🇪',
  India:           '🇮🇳',
  Nigeria:         '🇳🇬',
  Angola:          '🇦🇴',
  Australia:       '🇦🇺',
  Indonesia:       '🇮🇩',
  Malaysia:        '🇲🇾',
  Qatar:           '🇶🇦',
  Oman:            '🇴🇲',
  Algeria:         '🇩🇿',
  Libya:           '🇱🇾',
  Egypt:           '🇪🇬',
  'United Kingdom': '🇬🇧',
  Kazakhstan:      '🇰🇿',
}

export default function WellDatabase({ knownWells, flares, onFlyTo }) {
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all') // all | offshore | onshore
  const [statusFilter, setStatusFilter] = useState('all') // all | active | dormant
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 100

  // Build a set of detected well coordinates from flare data
  const detectedCoords = useMemo(() => {
    if (!flares?.features) return new Set()
    const set = new Set()
    flares.features.forEach(f => {
      if (f.properties.matched_well && f.properties.well_name) {
        set.add(f.properties.well_name.toLowerCase())
      }
    })
    return set
  }, [flares])

  const wells = useMemo(() => {
    if (!knownWells?.features) return []
    return knownWells.features.map(f => {
      const name = f.properties.name || ''
      const isOffshore = Boolean(f.properties.is_offshore || !f.properties.onshore)
      return {
        ...f.properties,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        is_offshore: isOffshore,
        active: detectedCoords.has(name.toLowerCase()),
      }
    })
  }, [knownWells, detectedCoords])

  const countries = useMemo(() => {
    const counts = {}
    wells.forEach(w => {
      if (w.country) counts[w.country] = (counts[w.country] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [wells])

  const filtered = useMemo(() => {
    let list = wells
    if (country !== 'all') list = list.filter(w => w.country === country)
    if (typeFilter === 'offshore') list = list.filter(w => w.is_offshore)
    if (typeFilter === 'onshore') list = list.filter(w => !w.is_offshore)
    if (statusFilter === 'active') list = list.filter(w => w.active)
    if (statusFilter === 'dormant') list = list.filter(w => !w.active)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(w =>
        (w.name && w.name.toLowerCase().includes(q)) ||
        (w.company && w.company.toLowerCase().includes(q)) ||
        (w.country && w.country.toLowerCase().includes(q)) ||
        (w.landmark && w.landmark.toLowerCase().includes(q))
      )
    }
    return list
  }, [wells, country, typeFilter, statusFilter, search])

  // Reset to page 1 on filter/search change
  useMemo(() => {
    setPage(1)
  }, [search, country, typeFilter, statusFilter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const activeCount = useMemo(() => wells.filter(w => w.active).length, [wells])
  const offshoreCount = useMemo(() => wells.filter(w => w.is_offshore).length, [wells])

  return (
    <div className="well-db">
      {/* Controls */}
      <div className="well-db-controls">
        <input
          className="well-search"
          type="text"
          placeholder="Search 7,110+ oil & gas fields, operators, rigs, offshore basins…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="well-db-filters" style={{ flexWrap: 'wrap', gap: '8px' }}>
          {/* Country selector */}
          <select
            className="well-select"
            value={country}
            onChange={e => setCountry(e.target.value)}
          >
            <option value="all">Global ({countries.length} Countries)</option>
            {countries.map(([c, count]) => (
              <option key={c} value={c}>
                {COMMON_FLAGS[c] || '🌐'} {c} ({count.toLocaleString()})
              </option>
            ))}
          </select>

          {/* Type Toggle */}
          <div className="status-toggle">
            {[
              { id: 'all', label: 'All Types' },
              { id: 'offshore', label: `⚓ Offshore (${offshoreCount})` },
              { id: 'onshore', label: '🏭 Onshore' },
            ].map(t => (
              <button
                key={t.id}
                className={`status-btn ${typeFilter === t.id ? 'active' : ''}`}
                onClick={() => setTypeFilter(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Activity Status Toggle */}
          <div className="status-toggle">
            {[
              { id: 'all', label: 'All Status' },
              { id: 'active', label: `⚡ Active (${activeCount})` },
              { id: 'dormant', label: '◯ Dormant' },
            ].map(s => (
              <button
                key={s.id}
                className={`status-btn ${statusFilter === s.id ? 'active' : ''}`}
                onClick={() => setStatusFilter(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="well-db-count" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            Showing <strong>{filtered.length.toLocaleString()}</strong> of {wells.length.toLocaleString()} fields
            {' · '}
            <span style={{ color: 'var(--green)' }}>
              {activeCount} with active flares
            </span>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                className="status-btn"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{ opacity: page <= 1 ? 0.4 : 1 }}
              >
                ◀ Prev
              </button>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="status-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                style={{ opacity: page >= totalPages ? 0.4 : 1 }}
              >
                Next ▶
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="well-table-wrap">
        <table className="well-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Field / Asset Name</th>
              <th>Type</th>
              <th>Operating Company</th>
              <th>Country</th>
              <th>Capacity</th>
              <th>Coords</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                  No oil & gas fields or platforms match your filters.
                </td>
              </tr>
            )}
            {paginated.map((w, i) => (
              <tr key={`${w.id || w.name}-${i}`} className={`well-row ${w.active ? 'active' : ''}`}>
                <td>
                  <div
                    className={`well-status-dot ${w.active ? 'active' : 'dormant'}`}
                    title={w.active ? 'Active thermal flaring detected' : 'No recent flare detection'}
                  />
                </td>
                <td className="well-name-cell" title={w.name}>
                  <strong>{w.name || '—'}</strong>
                </td>
                <td>
                  <span style={{
                    fontSize: '9px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                    background: w.is_offshore ? 'rgba(34, 211, 238, 0.12)' : 'rgba(163, 230, 53, 0.12)',
                    color: w.is_offshore ? '#22d3ee' : '#a3e635',
                    border: `1px solid ${w.is_offshore ? 'rgba(34, 211, 238, 0.3)' : 'rgba(163, 230, 53, 0.3)'}`
                  }}>
                    {w.is_offshore ? '⚓ OFFSHORE RIG' : '🏭 ONSHORE'}
                  </span>
                </td>
                <td className="well-co-cell" title={w.company}>{w.company || '—'}</td>
                <td>
                  <span className="country-badge">
                    {COMMON_FLAGS[w.country] || '🌐'} {w.country}
                  </span>
                </td>
                <td style={{ fontSize: '11px', color: w.production_kboed ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {w.production_kboed ? `${w.production_kboed} kboed` : '—'}
                </td>
                <td className="well-coords-cell">
                  {w.lat?.toFixed(3)}, {w.lon?.toFixed(3)}
                </td>
                <td>
                  {onFlyTo && (
                    <button
                      className="fly-btn"
                      onClick={() => onFlyTo(w.lon, w.lat, w.name)}
                      title="Fly to location on map"
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
