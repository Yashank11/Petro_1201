import { useEffect, useRef, useState, useCallback, forwardRef } from 'react'
import mapboxgl from 'mapbox-gl'
import PlumeLayer from './PlumeLayer'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const EMPTY_FC = { type: 'FeatureCollection', features: [] }

const GlobalMap = forwardRef(function GlobalMap(
  { flares, knownWells, onSelectSite, wind, plumeVisible, plumeOpacity, onMapReady },
  ref
) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const popupRef     = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const [mapInstance, setMapInstance] = useState(null)

  // ── Expose flyTo via ref ───────────────────────────────────────────────────
  const flyTo = useCallback((lon, lat, zoom = 12) => {
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [lon, lat], zoom, duration: 1800, essential: true })
    }
  }, [])

  useEffect(() => {
    if (ref && containerRef.current) {
      containerRef.current.__flyTo = flyTo
      if (typeof ref === 'function') ref(containerRef.current)
      else ref.current = containerRef.current
    }
  }, [flyTo, ref])

  // ── Initialise map once ───────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return
    const map = new mapboxgl.Map({
      container:  containerRef.current,
      style:      'mapbox://styles/mapbox/dark-v11',
      center:     [50, 26],
      zoom:       2.4,
      projection: 'globe',
    })

    map.on('style.load', () => {
      // Globe atmosphere
      map.setFog({
        color:           'rgb(5, 8, 16)',
        'high-color':    'rgb(0, 30, 60)',
        'horizon-blend': 0.05,
        'space-color':   'rgb(5, 8, 16)',
        'star-intensity': 0.8,
      })

      // ── Source: all known wells (from Excel) ──────────────────────────
      map.addSource('known-wells', { type: 'geojson', data: EMPTY_FC, cluster: false })

      map.addLayer({
        id: 'known-wells-dormant',
        type: 'circle',
        source: 'known-wells',
        filter: ['!', ['get', 'is_active']],
        minzoom: 3,
        paint: {
          'circle-color': 'rgba(60, 80, 110, 0.6)',
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 3, 10, 8],
          'circle-stroke-width': 1.2,
          'circle-stroke-color': 'rgba(100, 150, 200, 0.5)',
          'circle-opacity': 0.75,
        },
      })

      map.addLayer({
        id: 'known-wells-label',
        type: 'symbol',
        source: 'known-wells',
        filter: ['!', ['get', 'is_active']],
        minzoom: 7,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 9,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-font': ['DIN Offc Pro Regular', 'Arial Unicode MS Regular'],
        },
        paint: {
          'text-color': 'rgba(130, 160, 200, 0.8)',
          'text-halo-color': 'rgba(5, 8, 16, 0.9)',
          'text-halo-width': 1,
        },
      })

      // ── Source: heatmap (satellite VIIRS) ─────────────────────────────
      map.addSource('flares-heat', { type: 'geojson', data: EMPTY_FC })
      map.addLayer({
        id:   'flares-heatmap',
        type: 'heatmap',
        source: 'flares-heat',
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'frp'], 0, 0, 100, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0,   'rgba(0,212,255,0)',
            0.2, 'rgba(0,212,255,0.5)',
            0.4, 'rgba(0,255,136,0.7)',
            0.6, 'rgba(255,204,0,0.85)',
            0.8, 'rgba(255,107,43,0.95)',
            1,   'rgba(255,51,102,1)',
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 8, 9, 30],
          'heatmap-opacity': 0.85,
        },
      })

      // ── Source: flare points ──────────────────────────────────────────
      map.addSource('flares-pts', {
        type: 'geojson', data: EMPTY_FC,
        cluster: true, clusterMaxZoom: 6, clusterRadius: 40,
      })

      map.addLayer({
        id: 'clusters', type: 'circle', source: 'flares-pts',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color':   ['step', ['get', 'point_count'], '#00d4ff', 10, '#ffcc00', 30, '#ff6b2b'],
          'circle-radius':  ['step', ['get', 'point_count'], 12, 10, 18, 30, 26],
          'circle-opacity': 0.8,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(255,255,255,0.25)',
        },
      })

      map.addLayer({
        id: 'cluster-count', type: 'symbol', source: 'flares-pts',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 11,
        },
        paint: { 'text-color': '#ffffff' },
      })

      map.addLayer({
        id: 'unclustered-point', type: 'circle', source: 'flares-pts',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'interpolate', ['linear'], ['get', 'frp'],
            1, '#00d4ff', 10, '#00ff88', 30, '#ffcc00', 60, '#ff6b2b', 100, '#ff3366',
          ],
          'circle-radius': ['interpolate', ['linear'], ['get', 'frp'], 0, 5, 100, 16],
          'circle-opacity': 0.9,
          'circle-stroke-width': ['case', ['get', 'matched_well'], 2, 1],
          'circle-stroke-color': ['case', ['get', 'matched_well'], '#00ff88', 'rgba(255,255,255,0.3)'],
          'circle-blur': 0.1,
        },
      })

      // Anomaly pulse ring
      map.addLayer({
        id: 'anomaly-ring', type: 'circle', source: 'flares-pts',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'is_anomaly'], true]],
        paint: {
          'circle-color': 'transparent',
          'circle-radius': ['interpolate', ['linear'], ['get', 'frp'], 0, 12, 100, 24],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ff3366',
          'circle-stroke-opacity': 0.75,
        },
      })

      // Matched-well ring
      map.addLayer({
        id: 'matched-ring', type: 'circle', source: 'flares-pts',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'matched_well'], true]],
        paint: {
          'circle-color': 'transparent',
          'circle-radius': ['interpolate', ['linear'], ['get', 'frp'], 0, 14, 100, 26],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#00ff88',
          'circle-stroke-opacity': 0.5,
        },
      })

      // ── Unattributed / Unknown Emitters layer ─────────────────────────
      map.addSource('unattributed', { type: 'geojson', data: EMPTY_FC })

      map.addLayer({
        id: 'unattributed-glow', type: 'circle', source: 'unattributed',
        paint: {
          'circle-color': 'transparent',
          'circle-radius': 16,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#f59e0b',
          'circle-stroke-opacity': 0.45,
          'circle-blur': 0.4,
        },
      })

      map.addLayer({
        id: 'unattributed-point', type: 'circle', source: 'unattributed',
        paint: {
          'circle-color': '#f59e0b',
          'circle-radius': 6,
          'circle-opacity': 0.85,
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(255,255,255,0.3)',
        },
      })

      map.addLayer({
        id: 'unattributed-label', type: 'symbol', source: 'unattributed',
        minzoom: 5,
        layout: {
          'text-field': 'Unattributed',
          'text-size': 9,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-font': ['DIN Offc Pro Regular', 'Arial Unicode MS Regular'],
        },
        paint: {
          'text-color': '#f59e0b',
          'text-halo-color': 'rgba(5, 8, 16, 0.9)',
          'text-halo-width': 1,
        },
      })

      // ── Click → open FacilityCard (flare point) ───────────────────────
      map.on('click', 'unclustered-point', (e) => {
        const props  = e.features[0].properties
        const coords = e.features[0].geometry.coordinates
        // Attach lat/lon for provenance display
        props._lat = coords[1]
        props._lon = coords[0]
        if (onSelectSite) onSelectSite(props)
      })

      // ── Click → simple popup (unattributed point) ─────────────────────
      map.on('click', 'unattributed-point', (e) => {
        const props  = e.features[0].properties
        const coords = e.features[0].geometry.coordinates
        if (popupRef.current) popupRef.current.remove()
        const html = `
          <div class="popup-title" style="color:#f59e0b">⚠ Unattributed Industrial Activity</div>
          <div style="color:var(--text-muted);font-size:10px;font-weight:600;margin-bottom:8px;letter-spacing:0.5px;">
            NO KNOWN ASSET MATCH WITHIN 5km
          </div>
          <div class="popup-row"><span>FRP</span><span>${Number(props.frp).toFixed(1)} MW</span></div>
          <div class="popup-row"><span>CO₂-eq</span><span>${Number(props.co2_eq_t).toFixed(2)} t/day</span></div>
          <div class="popup-row"><span>Coords</span><span>${coords[1].toFixed(4)}°, ${coords[0].toFixed(4)}°</span></div>
          <div class="popup-row"><span>Date</span><span>${props.date}</span></div>
          <div style="margin-top:8px;font-size:9px;color:var(--text-muted);font-style:italic">
            Possible unreported or informal industrial activity. Flagged for investigation.
          </div>
        `
        popupRef.current = new mapboxgl.Popup({ maxWidth: '280px' })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(map)
      })

      // ── Click → popup (known dormant well) ───────────────────────────
      map.on('click', 'known-wells-dormant', (e) => {
        const props  = e.features[0].properties
        const coords = e.features[0].geometry.coordinates
        if (popupRef.current) popupRef.current.remove()
        const html = `
          <div class="popup-title" style="color:rgba(130,160,200,0.9)">${props.name || 'Unknown Well'}</div>
          <div style="color:var(--text-muted);font-size:10px;font-weight:600;margin-bottom:8px;letter-spacing:0.5px;">◯ NO THERMAL ANOMALY DETECTED</div>
          <div class="popup-row"><span>Company</span><span>${props.company || '—'}</span></div>
          <div class="popup-row"><span>Country</span><span>${props.country || '—'}</span></div>
          <div class="popup-row"><span>Landmark</span><span>${props.landmark || '—'}</span></div>
          <div class="popup-row"><span>Coords</span><span>${coords[1].toFixed(4)}°, ${coords[0].toFixed(4)}°</span></div>
          <div style="margin-top:8px;font-size:9px;color:var(--text-muted)">Source: ${props.source || '—'}</div>
          <div style="margin-top:4px;font-size:9px;color:var(--text-muted);font-style:italic">
            ⚠ Company names approximated from public data.
          </div>
        `
        popupRef.current = new mapboxgl.Popup({ maxWidth: '280px' })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(map)
      })

      // Cursors
      const hoverLayers = ['unclustered-point', 'known-wells-dormant', 'unattributed-point']
      hoverLayers.forEach(layer => {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = '' })
      })

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')
      map.addControl(new mapboxgl.ScaleControl(), 'bottom-left')

      setLoaded(true)
      setMapInstance(map)
      if (onMapReady) onMapReady(map)
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update flares sources ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loaded || !flares) return
    const heatSrc       = map.getSource('flares-heat')
    const ptsSrc        = map.getSource('flares-pts')
    const unattribSrc   = map.getSource('unattributed')

    if (heatSrc) heatSrc.setData(flares)
    if (ptsSrc)  ptsSrc.setData(flares)

    // Unattributed = no matched well AND basin is Unknown
    if (unattribSrc) {
      const unattr = {
        type: 'FeatureCollection',
        features: (flares.features || []).filter(
          f => f.properties.matched_well === false && f.properties.basin === 'Unknown'
        ),
      }
      unattribSrc.setData(unattr)
    }
  }, [flares, loaded])

  // ── Update known wells source ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loaded || !knownWells) return

    const activeNames = new Set()
    if (flares?.features) {
      flares.features.forEach(f => {
        if (f.properties.matched_well && f.properties.well_name) {
          activeNames.add(f.properties.well_name)
        }
      })
    }

    const dormantFeatures = {
      type: 'FeatureCollection',
      features: (knownWells.features || []).filter(
        f => !activeNames.has(f.properties.name)
      ).map(f => ({ ...f, properties: { ...f.properties, is_active: false } })),
    }

    const src = map.getSource('known-wells')
    if (src) src.setData(dormantFeatures)
  }, [knownWells, flares, loaded])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Atmospheric Plume Simulation overlay */}
      {mapInstance && (
        <PlumeLayer
          map={mapInstance}
          wind={wind}
          visible={plumeVisible}
          opacity={plumeOpacity}
        />
      )}

      {/* Legend */}
      <div className="map-overlay bot-right" style={{ pointerEvents: 'none' }}>
        <div className="section-label" style={{ marginBottom: 8 }}>FRP Intensity</div>
        {[['< 5 MW', '#00d4ff'], ['5–15 MW', '#00ff88'], ['15–40 MW', '#ffcc00'],
          ['40–100 MW', '#ff6b2b'], ['> 100 MW', '#ff3366']].map(([label, color]) => (
          <div key={label} className="legend-row">
            <div className="legend-swatch" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            <span style={{ fontSize: 10 }}>{label}</span>
          </div>
        ))}
        <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
        <div className="legend-row">
          <div style={{ width: 12, height: 12, borderRadius: 3, border: '1.5px solid #ff3366', boxShadow: '0 0 6px #ff3366' }} />
          <span style={{ fontSize: 10, color: '#ff3366' }}>Anomaly</span>
        </div>
        <div className="legend-row">
          <div style={{ width: 12, height: 12, borderRadius: 3, border: '1.5px solid #00ff88', boxShadow: '0 0 6px #00ff88' }} />
          <span style={{ fontSize: 10, color: '#00ff88' }}>Matched Well</span>
        </div>
        <div className="legend-row">
          <div style={{ width: 12, height: 12, borderRadius: '50%', border: '1.2px solid rgba(100,150,200,0.5)', background: 'rgba(60,80,110,0.6)' }} />
          <span style={{ fontSize: 10, color: 'rgba(130,160,200,0.8)' }}>Known Well (Dormant)</span>
        </div>
        <div className="legend-row">
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 6px #f59e0b' }} />
          <span style={{ fontSize: 10, color: '#f59e0b' }}>Unattributed</span>
        </div>
      </div>
    </div>
  )
})

export default GlobalMap
