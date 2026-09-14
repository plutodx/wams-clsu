import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'

function fmt(d) { return d ? new Date(d.replace(' ', 'T') + 'Z').toLocaleString() : '' }

export default function ApproverQueue() {
  const [rows, setRows] = useState([])
  useEffect(() => { api('/api/requests/pending').then(setRows).catch(() => {}) }, [])
  return (
    <div className="container">
      <h1 className="page-title">Approval Queue</h1>
      <p className="page-sub">Requests currently routed to you for action.</p>
      <div className="card">
        <table>
          <thead><tr><th>Ref No.</th><th>Type</th><th>Title</th><th>Step</th><th>Submitted</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan="6" className="muted">Nothing pending. You are all caught up.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.reference_no}</td><td>{r.doc_type}</td><td>{r.title}</td>
                <td>{r.step_label}</td><td className="small muted">{fmt(r.created_at)}</td>
                <td><Link to={`/requests/${r.id}`}><button className="small">Review &amp; Sign</button></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
