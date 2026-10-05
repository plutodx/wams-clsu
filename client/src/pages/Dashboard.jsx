import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { StatusBadge } from '../App.jsx'
import PieChart from '../components/PieChart.jsx'

export default function Dashboard() {
  const { user } = useAuth()
  if (user.role === 'requestor') return <RequestorDash />
  if (user.role === 'approver') return <ApproverDash />
  return <AdminDash />
}

function fmt(d) {
  if (!d) return ''
  const iso = d.includes('T') ? d : d.replace(' ', 'T') + 'Z'
  const dt = new Date(iso)
  return isNaN(dt.getTime()) ? d : dt.toLocaleString()
}

function RequestorDash() {
  const [rows, setRows] = useState([])
  useEffect(() => { api('/api/requests/mine').then(setRows).catch(() => {}) }, [])
  const by = (s) => rows.filter((r) => r.status === s).length
  return (
    <div className="container">
      <h1 className="page-title">My Requests</h1>
      <p className="page-sub">Track the status of every request you submitted.</p>
      <div className="grid cols-3" style={{ marginBottom: 20 }}>
        <div className="card stat"><div className="num">{rows.length}</div><div className="lbl">Total</div></div>
        <div className="card stat"><div className="num">{by('In Progress') + by('Pending')}</div><div className="lbl">In Progress</div></div>
        <div className="card stat"><div className="num">{by('Approved')}</div><div className="lbl">Approved</div></div>
      </div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <strong>Recent requests</strong>
          <Link to="/submit"><button>+ New Request</button></Link>
        </div>
        <RequestTable rows={rows} emptyText="No requests yet. Submit your first one." />
      </div>
    </div>
  )
}

function ApproverDash() {
  const [rows, setRows] = useState([])
  useEffect(() => { api('/api/requests/pending').then(setRows).catch(() => {}) }, [])
  return (
    <div className="container">
      <h1 className="page-title">Approver Dashboard</h1>
      <p className="page-sub">Requests waiting for your action.</p>
      <div className="grid cols-3" style={{ marginBottom: 20 }}>
        <div className="card stat"><div className="num">{rows.length}</div><div className="lbl">Awaiting my approval</div></div>
      </div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <strong>My approval queue</strong>
          <Link to="/approvals"><button>Open queue</button></Link>
        </div>
        <table>
          <thead><tr><th>Ref No.</th><th>Type</th><th>Title</th><th>Step</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan="5" className="muted">Nothing pending. You are all caught up.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.reference_no}</td><td>{r.doc_type}</td><td>{r.title}</td>
                <td>{r.step_label}</td>
                <td><Link to={`/requests/${r.id}`}>Review</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminDash() {
  const [sum, setSum] = useState(null)
  const [rows, setRows] = useState([])
  useEffect(() => {
    api('/api/reports/summary').then(setSum).catch(() => {})
    api('/api/requests').then(setRows).catch(() => {})
  }, [])
  return (
    <div className="container">
      <h1 className="page-title">System Overview</h1>
      <p className="page-sub">All administrative requests across offices.</p>
      {sum && (
        <div className="grid cols-3" style={{ marginBottom: 20 }}>
          <div className="card stat"><div className="num">{sum.total}</div><div className="lbl">Total requests</div></div>
          <div className="card stat"><div className="num">{sum.pending}</div><div className="lbl">In progress</div></div>
          <div className="card stat"><div className="num">{sum.approved}</div><div className="lbl">Approved</div></div>
        </div>
      )}
      {sum && (
        <div className="grid cols-2" style={{ marginBottom: 20 }}>
          <PieChart title="Requests by category" data={sum.byCategory} labelKey="category" />
          <PieChart title="Requests by status" data={sum.byStatus} labelKey="status" />
          <BarChart title="Requests by document type" data={sum.byType} labelKey="doc_type" color="#c08a2d" />
        </div>
      )}
      <div className="card">
        <strong>Recent activity</strong>
        <table style={{ marginTop: 8 }}>
          <thead><tr><th>Ref No.</th><th>Requestor</th><th>Type</th><th>Status</th><th>Updated</th><th></th></tr></thead>
          <tbody>
            {rows.slice(0, 15).map((r) => (
              <tr key={r.id}>
                <td>{r.reference_no}</td><td>{r.requestor_name}</td><td>{r.doc_type}</td>
                <td><StatusBadge status={r.status} /></td><td className="small muted">{fmt(r.updated_at)}</td>
                <td><Link to={`/requests/${r.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Lightweight inline-SVG bar chart. No chart library needed, so the graph works
// offline and in the standalone demo build.
function BarChart({ title, data, labelKey, color = '#0e7a3b' }) {
  const items = (data || []).filter((d) => d && d[labelKey] != null)
  const max = Math.max(1, ...items.map((d) => d.count))
  const barH = 26, gap = 14, padL = 150, padR = 46, top = 8
  const height = items.length ? items.length * (barH + gap) + top : 60
  const width = 560, plot = width - padL - padR
  return (
    <div className="card chart-card">
      <strong>{title}</strong>
      {items.length === 0 ? (
        <p className="muted" style={{ marginTop: 8 }}>No data yet.</p>
      ) : (
        <svg className="barchart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
          {items.map((d, i) => {
            const y = top + i * (barH + gap)
            const w = Math.max(2, (d.count / max) * plot)
            return (
              <g key={i}>
                <text x={padL - 10} y={y + barH / 2} textAnchor="end" dominantBaseline="middle"
                  fontSize="13" fill="#42524a">{String(d[labelKey])}</text>
                <rect x={padL} y={y} width={w} height={barH} rx="5" fill={color} />
                <text x={padL + w + 8} y={y + barH / 2} dominantBaseline="middle"
                  fontSize="13" fontWeight="700" fill="#1f2a24">{d.count}</text>
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}

export function RequestTable({ rows, emptyText }) {
  return (
    <table>
      <thead><tr><th>Ref No.</th><th>Type</th><th>Title</th><th>Status</th><th></th></tr></thead>
      <tbody>
        {(!rows || rows.length === 0) && <tr><td colSpan="5" className="muted">{emptyText}</td></tr>}
        {rows && rows.map((r) => (
          <tr key={r.id}>
            <td>{r.reference_no}</td><td>{r.doc_type}</td><td>{r.title}</td>
            <td><StatusBadge status={r.status} /></td>
            <td><Link to={`/requests/${r.id}`}>View</Link></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
