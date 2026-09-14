import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'

function fmt(d) { return d ? new Date(d.replace(' ', 'T') + 'Z').toLocaleString() : '' }

export default function Notifications() {
  const [rows, setRows] = useState([])
  const load = () => api('/api/notifications').then(setRows).catch(() => {})
  useEffect(() => { load() }, [])
  const markRead = async (id) => { await api(`/api/notifications/${id}/read`, { method: 'POST' }); load() }

  return (
    <div className="container">
      <h1 className="page-title">Notifications</h1>
      <p className="page-sub">In-app alerts for every stage of your requests.</p>
      <div className="card">
        {rows.length === 0 && <p className="muted">No notifications yet.</p>}
        {rows.map((n) => (
          <div key={n.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line)', opacity: n.is_read ? 0.6 : 1 }}>
            <div style={{ flex: 1 }}>
              <div>{n.message}</div>
              <div className="small muted">{fmt(n.created_at)}</div>
            </div>
            {n.request_id && <Link to={`/requests/${n.request_id}`} className="small">Open</Link>}
            {!n.is_read && <button className="secondary small" onClick={() => markRead(n.id)}>Mark read</button>}
          </div>
        ))}
      </div>
    </div>
  )
}
