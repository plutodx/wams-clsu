import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'

const APPROVER_ROLES = ['supervisor', 'dept_head', 'hr_office', 'dean', 'budget_office', 'instructor', 'registrar', 'gso']
const ROLES = ['requestor', 'staff', 'approver', 'admin']

function fmt(d) {
  if (!d) return ''
  const iso = d.includes('T') ? d : d.replace(' ', 'T') + 'Z'
  const dt = new Date(iso)
  return isNaN(dt.getTime()) ? d : dt.toLocaleString()
}
function ago(d) {
  if (!d) return ''
  const iso = d.includes('T') ? d : d.replace(' ', 'T') + 'Z'
  const t = new Date(iso).getTime()
  if (isNaN(t)) return d
  const s = Math.floor((Date.now() - t) / 1000)
  if (s < 60) return `${s} second${s === 1 ? '' : 's'} ago`
  const m = Math.floor(s / 60); if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const dd = Math.floor(h / 24); return `${dd} day${dd === 1 ? '' : 's'} ago`
}
function initials(name) {
  return (name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={wide ? 'modal-box wide' : 'modal-box'}>
        <div className="modal-head"><h3>{title}</h3><button className="modal-x" onClick={onClose}>×</button></div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export default function Admin() {
  const [tab, setTab] = useState('users')
  return (
    <div className="container">
      <h1 className="page-title">Administration</h1>
      <p className="page-sub">Manage users, configure approval workflows, and review the audit trail.</p>
      <div className="tabs">
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Users</button>
        <button className={tab === 'workflows' ? 'active' : ''} onClick={() => setTab('workflows')}>Workflows</button>
        <button className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}>Audit Trail</button>
      </div>
      {tab === 'users' && <Users />}
      {tab === 'workflows' && <Workflows />}
      {tab === 'audit' && <Audit />}
    </div>
  )
}

/* ------------------------------- USERS (modal) ------------------------------- */
function Users() {
  const [rows, setRows] = useState([])
  const [open, setOpen] = useState(null) // 'add' | user object | null
  const load = () => api('/api/users').then(setRows).catch(() => {})
  useEffect(() => { load() }, [])

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <strong>All users</strong>
        <button onClick={() => setOpen('add')}>+ Add user</button>
      </div>
      <table>
        <thead><tr><th>Name</th><th>Role</th><th>Approver role</th><th>Office</th><th></th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan="5" className="muted">No users.</td></tr>}
          {rows.map((u) => (
            <tr key={u.id}>
              <td><div className="user-cell"><span className="avatar soft">{initials(u.name)}</span><div>{u.name}<div className="small muted">{u.email}</div></div></div></td>
              <td><span className="pill">{u.role}</span></td>
              <td>{u.approver_role || <span className="muted small">—</span>}</td>
              <td className="small muted">{u.office || '—'}</td>
              <td style={{ textAlign: 'right' }}><button className="secondary small" onClick={() => setOpen(u)}>Edit</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {open && <UserModal user={open === 'add' ? null : open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); load() }} />}
    </div>
  )
}

function UserModal({ user, onClose, onSaved }) {
  const editing = Boolean(user)
  const [form, setForm] = useState(editing
    ? { name: user.name, email: user.email, role: user.role, approver_role: user.approver_role || 'supervisor', office: user.office || '' }
    : { name: '', email: '', password: 'password123', role: 'approver', approver_role: 'supervisor', office: '' })
  const [msg, setMsg] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const save = async (e) => {
    e.preventDefault(); setMsg('')
    try {
      if (editing) {
        await api(`/api/users/${user.id}`, { method: 'PATCH', body: { role: form.role, approver_role: form.role === 'approver' ? form.approver_role : null } })
      } else {
        await api('/api/users', { method: 'POST', body: { ...form, approver_role: form.role === 'approver' ? form.approver_role : null } })
      }
      onSaved()
    } catch (e) { setMsg(e.message) }
  }

  return (
    <Modal title={editing ? `Edit ${user.name}` : 'Add user'} onClose={onClose}>
      <form onSubmit={save}>
        {!editing && <>
          <label>Full name</label><input value={form.name} onChange={set('name')} />
          <label>Email</label><input value={form.email} onChange={set('email')} />
          <label>Temporary password</label><input value={form.password} onChange={set('password')} />
        </>}
        <label>Role</label>
        <select value={form.role} onChange={set('role')}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
        {form.role === 'approver' && <>
          <label>Approver role</label>
          <select value={form.approver_role} onChange={set('approver_role')}>{APPROVER_ROLES.map((r) => <option key={r}>{r}</option>)}</select>
        </>}
        {!editing && <><label>Office / College</label><input value={form.office} onChange={set('office')} /></>}
        {msg && <div className="err">{msg}</div>}
        <div className="row-actions" style={{ marginTop: 16 }}>
          <button>{editing ? 'Save changes' : 'Create user'}</button>
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

/* ----------------------------- WORKFLOWS (modal) ---------------------------- */
function Workflows() {
  const [rows, setRows] = useState([])
  const [open, setOpen] = useState(false)
  const load = () => api('/api/workflows').then(setRows).catch(() => {})
  useEffect(() => { load() }, [])

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <strong>Configured workflows (approval matrix)</strong>
        <button onClick={() => setOpen(true)}>+ Add workflow</button>
      </div>
      {rows.length === 0 && <p className="muted">No workflows configured.</p>}
      {rows.map((w) => (
        <div key={w.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontWeight: 600 }}>{w.doc_type}</div>
            {w.originating_group && <span className="pill">{w.originating_group}</span>}
          </div>
          <div className="small muted">{w.description}</div>
          <div className="small">{w.steps.map((s) => s.label).join('  →  ')}</div>
        </div>
      ))}
      {open && <WorkflowModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load() }} />}
    </div>
  )
}

function WorkflowModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ doc_type: '', description: '', originating_group: 'Faculty', stepsText: 'dept_head:Department Head\ndean:College Dean' })
  const [msg, setMsg] = useState('')
  const save = async (e) => {
    e.preventDefault(); setMsg('')
    const steps = form.stepsText.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const [approver_role, ...rest] = l.split(':')
      return { approver_role: approver_role.trim(), label: (rest.join(':') || approver_role).trim() }
    })
    try {
      await api('/api/workflows', { method: 'POST', body: { doc_type: form.doc_type, description: form.description, originating_group: form.originating_group, steps } })
      onSaved()
    } catch (e) { setMsg(e.message) }
  }
  return (
    <Modal title="Add workflow" onClose={onClose}>
      <form onSubmit={save}>
        <label>Document type</label><input value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })} />
        <label>Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <label>Category (originating group)</label>
        <select value={form.originating_group} onChange={(e) => setForm({ ...form, originating_group: e.target.value })}>
          {['Faculty', 'Student', 'Staff'].map((g) => <option key={g}>{g}</option>)}
        </select>
        <label>Steps (one per line, format role:Label)</label>
        <textarea value={form.stepsText} onChange={(e) => setForm({ ...form, stepsText: e.target.value })} />
        <p className="small muted">Roles: supervisor, dept_head, hr_office, dean, budget_office, instructor, registrar, gso</p>
        {msg && <div className="err">{msg}</div>}
        <div className="row-actions" style={{ marginTop: 14 }}>
          <button>Create workflow</button>
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------- AUDIT TRAIL (Account Activity) ------------------------- */
function Audit() {
  const [rows, setRows] = useState([])
  const [kw, setKw] = useState('')
  const [event, setEvent] = useState('')
  const [limit, setLimit] = useState(10)
  const [detail, setDetail] = useState(null)

  useEffect(() => { api('/api/audit').then(setRows).catch(() => {}) }, [])

  const events = useMemo(() => Array.from(new Set(rows.map((r) => r.action))).sort(), [rows])
  const filtered = useMemo(() => {
    const k = kw.trim().toLowerCase()
    return rows.filter((r) => {
      if (event && r.action !== event) return false
      if (!k) return true
      return (r.actor_name || '').toLowerCase().includes(k)
        || (r.detail || '').toLowerCase().includes(k)
        || (r.action || '').toLowerCase().includes(k)
    })
  }, [rows, kw, event])
  const shown = filtered.slice(0, limit)

  return (
    <div className="card">
      <div style={{ marginBottom: 4 }}><strong>Account Activity</strong><div className="small muted">Audit log of all actions performed in the system</div></div>

      <div className="audit-toolbar">
        <div className="search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input placeholder="Search by user, description or event..." value={kw} onChange={(e) => setKw(e.target.value)} />
        </div>
        <select value={event} onChange={(e) => setEvent(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="">All Events</option>
          {events.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
        </select>
        <div className="shown">Show
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} style={{ width: 70 }}>
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          entries
        </div>
      </div>

      <table>
        <thead><tr><th>User</th><th>Event</th><th>Description</th><th>IP Address</th><th>Time</th><th>Data</th></tr></thead>
        <tbody>
          {shown.length === 0 && <tr><td colSpan="6" className="muted">No matching activity.</td></tr>}
          {shown.map((a) => (
            <tr key={a.id}>
              <td><div className="user-cell"><span className="avatar">{initials(a.actor_name)}</span><span>{a.actor_name}</span></div></td>
              <td><span className="evt">{a.action}</span></td>
              <td style={{ fontWeight: 600 }}>{a.detail || '—'}</td>
              <td>{a.ip_address ? <span className="ip">{a.ip_address}</span> : <span className="muted">—</span>}</td>
              <td className="small muted" title={fmt(a.created_at)}>{ago(a.created_at)}</td>
              <td>{a.data ? <button className="btn-view" onClick={() => setDetail(a)}>View</button> : <span className="muted">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small muted" style={{ marginTop: 10 }}>Showing {shown.length} of {filtered.length} entries</p>

      {detail && <AuditDetail entry={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function AuditDetail({ entry, onClose }) {
  let data = null
  try { data = entry.data ? JSON.parse(entry.data) : null } catch (e) { data = null }
  const entries = data && typeof data === 'object' ? Object.entries(data) : []
  const val = (v) => (v && typeof v === 'object') ? JSON.stringify(v) : String(v)
  return (
    <Modal title="Activity Details" onClose={onClose} wide>
      <div className="detail-row"><b>User</b><strong>{entry.actor_name}</strong></div>
      <div className="detail-row"><b>Event</b><span className="evt">{entry.action}</span></div>
      <div className="detail-row"><b>Description</b><strong>{entry.detail || '—'}</strong></div>
      <div className="detail-row"><b>IP Address</b>{entry.ip_address || '—'}</div>
      <div className="detail-row"><b>Time</b>{fmt(entry.created_at)}</div>

      {entries.length > 0 && <>
        <div className="small muted" style={{ textTransform: 'uppercase', letterSpacing: '.5px', margin: '16px 0 8px' }}>Recorded Data</div>
        <table className="data-table">
          <thead><tr><th>Field</th><th>Value</th></tr></thead>
          <tbody>{entries.map(([k, v]) => <tr key={k}><td>{k}</td><td>{val(v)}</td></tr>)}</tbody>
        </table>
      </>}
    </Modal>
  )
}
