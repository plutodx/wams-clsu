// Inline-SVG donut/pie chart. No chart library, so it works offline and in the
// standalone demo build.
const PALETTE = ['#0e7a3b', '#2a7d5f', '#c08a2d', '#1a56b3', '#6b21a8', '#b3261e', '#0d9488', '#9a6700']

export default function PieChart({ title, data, labelKey, size = 170 }) {
  const items = (data || []).filter((d) => d && Number(d.count) > 0)
  const total = items.reduce((s, d) => s + Number(d.count), 0)
  const r = size / 2
  const cx = r, cy = r

  let start = -Math.PI / 2 // start at top
  const slices = items.map((d, i) => {
    const frac = Number(d.count) / total
    const end = start + frac * Math.PI * 2
    const large = end - start > Math.PI ? 1 : 0
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end)
    const path = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`
    start = end
    return { path, color: PALETTE[i % PALETTE.length], label: String(d[labelKey]), count: Number(d.count), pct: Math.round(frac * 100) }
  })

  return (
    <div className="card">
      <strong>{title}</strong>
      {total === 0 ? (
        <p className="muted" style={{ marginTop: 8 }}>No data yet.</p>
      ) : (
        <div className="pie-wrap" style={{ marginTop: 12 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={title}>
            {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth="2" />)}
            <circle cx={cx} cy={cy} r={r * 0.55} fill="#fff" />
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="700" fill="#1f2a24">{total}</text>
            <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="#6b7c73">total</text>
          </svg>
          <div className="pie-legend">
            {slices.map((s, i) => (
              <div className="li" key={i}>
                <span className="sw" style={{ background: s.color }} />
                <span>{s.label}</span>
                <span className="muted">· {s.count} ({s.pct}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
