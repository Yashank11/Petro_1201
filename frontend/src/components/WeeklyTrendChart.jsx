import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(11,17,32,0.95)', border: '1px solid rgba(0,212,255,0.3)',
      borderRadius: 8, padding: '8px 12px', fontSize: 11,
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--cyan)', fontWeight: 700 }}>
        {Number(payload[0].value).toFixed(2)} kt CO₂
      </div>
      {payload[1] && (
        <div style={{ color: 'var(--orange)' }}>{payload[1].value} flares</div>
      )}
    </div>
  )
}

export default function WeeklyTrendChart({ trends, loading }) {
  if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: 12, paddingTop: 40, textAlign: 'center' }}>Loading trends…</div>
  if (!trends?.length) return <div style={{ color: 'var(--text-muted)', fontSize: 12, paddingTop: 40, textAlign: 'center' }}>No trend data</div>

  const data = trends.map(t => ({
    date:   t.date_str?.slice(5) ?? '',   // MM-DD
    co2_kt: t.co2_kt,
    flares: t.flares,
  }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
        <defs>
          <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradOrange" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#ff6b2b" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#ff6b2b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="co2_kt" stroke="#00d4ff" strokeWidth={2} fill="url(#gradCyan)" dot={false} name="CO₂ kt" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
