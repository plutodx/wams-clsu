import { useEffect, useState } from 'react'
import { api } from '../api.js'
import PieChart from '../components/PieChart.jsx'

function Bar({ label, value, max }) {
  const pct = max ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span>{label}</span><span className="muted">{value}</span>
      </div>
      <div style={{ background: '#eef2ef', borderRadius: 6, height: 12 }}>
        <div style={{ width: `${pct}%`, background: 'var(--green)', height: 12, borderRadius: 6 }} />
      </div>
    </div>
  )
}

export default function Reports() {
  const [sum, setSum] = useState(null)
  useEffect(() => { api('/api/reports/summary').then(setSum).catch(() => {}) }, [])
  if (!sum) return <div className="center muted">Loading...</div>
  const maxStatus = Math.max(1, ...sum.byStatus.map((x) => x.count))
  const maxType = Math.max(1, ...sum.byType.map((x) => x.count))
  const byCategory = sum.byCategory || []
  const maxCat = Math.max(1, ...byCategory.map((x) => x.count))

  return (
    <div className="container">
      <h1 className="page-title">Reports &amp; Analytics</h1>
      <p className="page-sub">Consolidated data on request volume and status across offices.</p>
      <div className="grid cols-3" style={{ marginBottom: 20 }}>
        <div className="card stat"><div className="num">{sum.total}</div><div className="lbl">Total requests</div></div>
        <div className="card stat"><div className="num">{sum.pending}</div><div className="lbl">In progress</div></div>
        <div className="card stat"><div className="num">{sum.approved}</div><div className="lbl">Approved</div></div>
      </div>
      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        <PieChart title="Share by status" data={sum.byStatus} labelKey="status" />
        <PieChart title="Share by requestor category" data={byCategory} labelKey="category" />
      </div>

      <div className="grid cols-2">
        <div className="card">
          <strong>Requests by status</strong>
          <div style={{ marginTop: 12 }}>
            {sum.byStatus.map((s) => <Bar key={s.status} label={s.status} value={s.count} max={maxStatus} />)}
            {sum.byStatus.length === 0 && <p className="muted">No data yet.</p>}
          </div>
        </div>
        <div className="card">
          <strong>Requests by document type</strong>
          <div style={{ marginTop: 12 }}>
            {sum.byType.map((s) => <Bar key={s.doc_type} label={s.doc_type} value={s.count} max={maxType} />)}
            {sum.byType.length === 0 && <p className="muted">No data yet.</p>}
          </div>
        </div>
        <div className="card">
          <strong>Requests by requestor category</strong>
          <div style={{ marginTop: 12 }}>
            {byCategory.map((s) => <Bar key={s.category} label={s.category} value={s.count} max={maxCat} />)}
            {byCategory.length === 0 && <p className="muted">No data yet.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
