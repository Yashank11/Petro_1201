import { useEffect, useRef } from 'react'

function formatDateLabel(dateStr) {
  if (!dateStr || dateStr === 'all') return 'All Days'
  try {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  } catch {}
  return dateStr
}

function formatCount(num) {
  if (num === undefined || num === null) return ''
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
  return String(num)
}

export default function TimeLapsePlayer({
  dates = [],
  dateStats = {},
  selectedDate = 'all',
  onSelectDate,
  isPlaying = false,
  onTogglePlay,
}) {
  const timerRef = useRef(null)

  // Handle time-lapse auto-play interval
  useEffect(() => {
    if (!isPlaying || !dates.length) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      onSelectDate(prev => {
        if (!prev || prev === 'all') return dates[0]
        const idx = dates.indexOf(prev)
        if (idx === -1 || idx >= dates.length - 1) {
          return dates[0] // Loop back to start
        }
        return dates[idx + 1]
      })
    }, 1500)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, dates, onSelectDate])

  if (!dates.length) return null

  const activeStats = selectedDate !== 'all' ? dateStats[selectedDate] : null
  const totalFlares = Object.values(dateStats).reduce((acc, s) => acc + (s.count || 0), 0)
  const totalCo2 = Object.values(dateStats).reduce((acc, s) => acc + (s.co2 || 0), 0)

  return (
    <div className="time-lapse-player">
      <div className="tl-inner">
        {/* Play/Pause & All buttons */}
        <div className="tl-controls">
          <button
            type="button"
            className={`tl-play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause orbital time-lapse' : 'Play orbital time-lapse day-by-day'}
          >
            {isPlaying ? (
              <>
                <span className="tl-icon">⏸</span>
                <span className="tl-btn-text">Pause</span>
              </>
            ) : (
              <>
                <span className="tl-icon">▶</span>
                <span className="tl-btn-text">Time-Lapse</span>
              </>
            )}
          </button>

          <button
            type="button"
            className={`tl-chip tl-chip-all ${selectedDate === 'all' ? 'active' : ''}`}
            onClick={() => {
              if (isPlaying) onTogglePlay()
              onSelectDate('all')
            }}
            title="View all days aggregated"
          >
            All Days ({dates.length}d)
          </button>
        </div>

        {/* Date Track / Chips */}
        <div className="tl-track-wrap">
          <div className="tl-track">
            {dates.map((date) => {
              const isSelected = selectedDate === date
              const stats = dateStats[date] || {}
              const label = formatDateLabel(date)

              return (
                <button
                  key={date}
                  type="button"
                  className={`tl-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    if (isPlaying) onTogglePlay()
                    onSelectDate(date)
                  }}
                  title={`${date}: ${stats.count || 0} active flares`}
                >
                  <span className="tl-chip-dot" />
                  <span className="tl-chip-label">{label}</span>
                  {stats.count !== undefined && (
                    <span className="tl-chip-count">{formatCount(stats.count)}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Status / Metric pill */}
        <div className="tl-status">
          {selectedDate === 'all' ? (
            <div className="tl-status-text">
              <span className="tl-status-date">Combined 5-Day View</span>
              <span className="tl-status-sep">•</span>
              <span>{totalFlares} Detections</span>
              <span className="tl-status-sep">•</span>
              <span className="tl-status-co2">{(totalCo2 / 1000).toFixed(1)} kt CO₂</span>
            </div>
          ) : (
            <div className="tl-status-text">
              <span className="tl-status-date">{formatDateLabel(selectedDate)}</span>
              <span className="tl-status-sep">•</span>
              <span>{activeStats?.count || 0} Flares</span>
              {activeStats?.co2 !== undefined && (
                <>
                  <span className="tl-status-sep">•</span>
                  <span className="tl-status-co2">{(activeStats.co2 / 1000).toFixed(2)} kt CO₂</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
