/**
 * PlumeLayer — Atmospheric Carbon Plume Particle Simulator
 *
 * Renders animated gas dispersion plumes over the Mapbox map using a Canvas2D
 * overlay. Each active flare site emits particles that stream in the real-time
 * wind direction (u10, v10 from Open-Meteo), fading from a hot orange core to
 * a cool cyan dispersal cloud.
 *
 * Uses additive blending (ctx.globalCompositeOperation = 'lighter') to achieve
 * a volumetric glow effect without WebGL.
 */

import { useEffect, useRef, useCallback } from 'react'

// ── Particle system constants ────────────────────────────────────────────────
const MAX_PARTICLES_PER_SITE = 45     // hard cap per flare site
const PARTICLE_LIFETIME_MS   = 4500  // ms before a particle resets
const WIND_SCALE             = 0.12  // world m/s → px/frame scaling factor (zoom-adjusted)
const TURBULENCE             = 0.6   // lateral spread (px/frame noise amplitude)
const EMIT_RATE              = 0.4   // probability of emitting a new particle each frame
const RISE_SPEED             = -0.35 // slight upward drift (px/frame, negative = up)
const FPS_THROTTLE           = 60    // target frame rate

// ── Colour ramp: hot (core) → diffuse (dispersal) ────────────────────────────
// These map particle age 0→1 to a color. We use inline rgba strings for perf.
function particleColor(ageNorm, frpNorm, isAnomaly) {
  // ageNorm: 0 = just born, 1 = about to die
  // frpNorm: 0 = low intensity, 1 = extreme
  const heat = Math.max(0, 1 - ageNorm)     // decreases with age
  const alpha = heat * (0.55 + frpNorm * 0.35)

  if (isAnomaly) {
    // Critical sites: red-magenta plumes
    const r = 255
    const g = Math.round(20  + heat * 30)
    const b = Math.round(80  + heat * 60)
    return `rgba(${r},${g},${b},${alpha.toFixed(2)})`
  }

  if (ageNorm < 0.3) {
    // Hot core: orange → yellow
    const r = 255
    const g = Math.round(80 + heat * 150)
    const b = Math.round(20 + heat * 40)
    return `rgba(${r},${g},${b},${alpha.toFixed(2)})`
  } else if (ageNorm < 0.65) {
    // Mid-plume: blend towards cyan-green
    const t = (ageNorm - 0.3) / 0.35
    const r = Math.round(255 * (1 - t) + 0 * t)
    const g = Math.round(150 * (1 - t) + 220 * t)
    const b = Math.round(30  * (1 - t) + 180 * t)
    return `rgba(${r},${g},${b},${alpha.toFixed(2)})`
  } else {
    // Dispersal tail: faint cyan
    const r = Math.round(0  + frpNorm * 20)
    const g = Math.round(180 - ageNorm * 120)
    const b = Math.round(210 + frpNorm * 45)
    return `rgba(${r},${g},${b},${alpha.toFixed(2)})`
  }
}

// ── Pseudo-noise for turbulence ───────────────────────────────────────────────
function noise(x, y, t) {
  return Math.sin(x * 0.3 + t * 0.8) * Math.cos(y * 0.25 - t * 0.6) +
         Math.sin(x * 0.7 - t * 1.1) * 0.5
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PlumeLayer({ map, wind, visible, opacity }) {
  const canvasRef    = useRef(null)
  const particlesRef = useRef([])   // flat particle pool
  const rafRef       = useRef(null)
  const timeRef      = useRef(0)
  const siteDataRef  = useRef([])   // pre-processed site data

  // ── Resize canvas to match map ─────────────────────────────────────────────
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !map) return
    const container = map.getContainer()
    canvas.width  = container.clientWidth
    canvas.height = container.clientHeight
  }, [map])

  // ── Pre-process wind sites into particle seeds ─────────────────────────────
  const buildSites = useCallback(() => {
    if (!wind?.length || !map) return

    const maxFRP = Math.max(...wind.map(w => w.frp), 1)
    siteDataRef.current = wind.map(w => {
      const frpNorm    = Math.min(w.frp / maxFRP, 1)
      const numParticles = Math.max(5, Math.round(frpNorm * MAX_PARTICLES_PER_SITE))
      const point        = map.project([w.lon, w.lat])
      return {
        lon:         w.lon,
        lat:         w.lat,
        px:          point.x,
        py:          point.y,
        u10:         w.u10,
        v10:         w.v10,
        windSpeed:   w.wind_speed_ms,
        frpNorm,
        numParticles,
        isAnomaly:   w.is_anomaly,
        radius:      3 + frpNorm * 8,  // source radius jitter
      }
    }).filter(s => s.px > -200 && s.py > -200)  // skip off-screen sites
  }, [wind, map])

  // ── Particle factory ───────────────────────────────────────────────────────
  function spawnParticle(site) {
    const angle = Math.random() * Math.PI * 2
    const r     = Math.random() * site.radius
    return {
      // Screen position (origin near the flare, randomised within source radius)
      x: site.px + Math.cos(angle) * r,
      y: site.py + Math.sin(angle) * r,
      // Wind velocity in screen-pixels/frame
      vx:       site.u10 * WIND_SCALE + (Math.random() - 0.5) * TURBULENCE,
      vy:      -site.v10 * WIND_SCALE + RISE_SPEED + (Math.random() - 0.5) * TURBULENCE,
      age:      0,
      maxAge:   PARTICLE_LIFETIME_MS * (0.6 + Math.random() * 0.8),
      size:     1.5 + Math.random() * (2.5 + site.frpNorm * 3),
      frpNorm:  site.frpNorm,
      isAnomaly: site.isAnomaly,
      siteIndex: site._idx,
      seed:      Math.random() * 1000,
    }
  }

  // ── Re-project site screen positions on map move ───────────────────────────
  const reprojectSites = useCallback(() => {
    if (!map) return
    siteDataRef.current.forEach(s => {
      const p = map.project([s.lon, s.lat])
      s.px = p.x
      s.py = p.y
    })
  }, [map])

  // ── Main animation loop ───────────────────────────────────────────────────
  const animate = useCallback((timestamp) => {
    const canvas = canvasRef.current
    if (!canvas || !map) { rafRef.current = requestAnimationFrame(animate); return }
    const ctx    = canvas.getContext('2d')
    const DT     = 16.67 // ~60fps frame time in ms

    timeRef.current += DT / 1000  // time in seconds

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!visible || !siteDataRef.current.length) {
      rafRef.current = requestAnimationFrame(animate)
      return
    }

    // Set additive blending for volumetric glow
    ctx.globalCompositeOperation = 'lighter'

    const sites    = siteDataRef.current
    const particles = particlesRef.current
    const t        = timeRef.current

    // ── Per-site: count alive particles, emit new ones ──────────────────────
    const siteCounts = new Array(sites.length).fill(0)
    particles.forEach(p => { if (p.age < p.maxAge) siteCounts[p.siteIndex] = (siteCounts[p.siteIndex] || 0) + 1 })

    sites.forEach((site, i) => {
      site._idx = i
      if (siteCounts[i] < site.numParticles && Math.random() < EMIT_RATE) {
        particles.push(spawnParticle(site))
      }
    })

    // ── Update & draw each particle ─────────────────────────────────────────
    let alive = 0
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      p.age += DT

      if (p.age >= p.maxAge) continue  // dead — will be culled below

      alive++
      const ageNorm = p.age / p.maxAge

      // Turbulence nudge (Perlin-like sine noise)
      const n = noise(p.x * 0.01, p.y * 0.01, t + p.seed) * TURBULENCE
      p.x += p.vx + n * 0.5
      p.y += p.vy

      // Slight wind acceleration over time (plume spreads laterally)
      p.vx *= 0.998

      // Draw particle as glowing soft circle
      const r    = p.size * (1 + ageNorm * 1.5)  // expand with age
      const color = particleColor(ageNorm, p.frpNorm, p.isAnomaly)

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r)
      grad.addColorStop(0,   color)
      grad.addColorStop(0.5, color.replace(/[\d.]+\)$/, v => `${(parseFloat(v) * 0.4).toFixed(2)})`))
      grad.addColorStop(1,   'rgba(0,0,0,0)')

      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()
    }

    // Cull dead particles every 120 frames to avoid unbounded growth
    if (Math.round(t * 60) % 120 === 0) {
      particlesRef.current = particles.filter(p => p.age < p.maxAge)
    }

    ctx.globalCompositeOperation = 'source-over'

    rafRef.current = requestAnimationFrame(animate)
  }, [map, visible]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lifecycle: setup canvas, attach map events ─────────────────────────────
  useEffect(() => {
    if (!map || !canvasRef.current) return

    resizeCanvas()
    buildSites()

    const onResize = () => { resizeCanvas(); reprojectSites() }
    const onMove   = ()  => reprojectSites()

    map.on('move',   onMove)
    map.on('zoom',   onMove)
    map.on('resize', onResize)
    window.addEventListener('resize', onResize)

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      map.off('move',   onMove)
      map.off('zoom',   onMove)
      map.off('resize', onResize)
      window.removeEventListener('resize', onResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [map, animate, buildSites, reprojectSites, resizeCanvas])

  // ── Rebuild site data when wind data changes ───────────────────────────────
  useEffect(() => {
    particlesRef.current = []   // flush stale particles
    buildSites()
  }, [wind, buildSites])

  // ── Apply opacity ──────────────────────────────────────────────────────────
  const canvasStyle = {
    position:       'absolute',
    inset:          0,
    zIndex:         3,
    pointerEvents:  'none',
    opacity:        visible ? (opacity ?? 0.85) : 0,
    transition:     'opacity 0.5s ease',
  }

  return (
    <canvas
      ref={canvasRef}
      id="plume-canvas"
      style={canvasStyle}
      aria-hidden="true"
    />
  )
}
