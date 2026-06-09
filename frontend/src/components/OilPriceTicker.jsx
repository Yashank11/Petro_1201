import { useEffect, useState } from 'react'
import { getOilPrices } from '../api/client'

function PriceChip({ label, data }) {
  if (!data) return null
  const up = data.change >= 0
  const color = up ? 'var(--green)' : 'var(--red)'
  const arrow = up ? '▲' : '▼'

  return (
    <div className="oil-chip" title={`${label}: ${data.symbol}`}>
      <span className="oil-chip-label">{label}</span>
      <span className="oil-chip-price" style={{ color }}>
        ${data.price.toFixed(2)}
      </span>
      <span className="oil-chip-change" style={{ color, fontSize: 10 }}>
        {arrow} {Math.abs(data.change_pct).toFixed(2)}%
      </span>
    </div>
  )
}

export default function OilPriceTicker() {
  const [prices, setPrices] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchPrices = async () => {
    try {
      setLoading(true)
      const res = await getOilPrices()
      setPrices(res.data)
      setLastUpdate(new Date())
    } catch (e) {
      console.warn('Oil prices unavailable:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrices()
    const interval = setInterval(fetchPrices, 15 * 60 * 1000) // refresh every 15 min
    return () => clearInterval(interval)
  }, [])

  const timeStr = lastUpdate
    ? lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="oil-ticker">
      <span className="oil-ticker-label">CRUDE</span>
      {loading && !prices ? (
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Fetching…</span>
      ) : prices ? (
        <>
          <PriceChip label="WTI"    data={prices.WTI} />
          <PriceChip label="Brent"  data={prices.Brent} />
          <PriceChip label="NatGas" data={prices.NatGas} />
          {timeStr && (
            <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 2 }}>
              @ {timeStr}
            </span>
          )}
        </>
      ) : (
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Prices unavailable</span>
      )}
    </div>
  )
}
