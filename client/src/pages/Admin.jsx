import { useEffect, useState } from 'react'
import { api } from '../api.js'

const APPROVER_ROLES = ['supervisor', 'dept_head', 'hr_office', 'dean', 'budget_office', 'instructor', 'registrar']
function fmt(d) { return d ? new Date(d.replace(' ', 'T') + 'Z').toLocaleString() : '' }

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

function Users() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ name: '', email: '', password: 'password123', role: 'approver', approver_role: 'supervisor', office: '' })
  const [msg, setMsg] = useState('')
  const load = () => api('/api/users').then(setRows).catch(() => {})
  useEffect(() => { load() }, [])
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const create = async (e) => {
    e.preventDefault(); setMsg('')
    try {
      await api('/api/users', { method: 'POST', body: { ...form, approver_role: form.role === 'approver' ? form.approver_role : null } })
      setMsg('User created.'); load()
    } catch (e) { setMsg(e.message) }
  }
  const updateRole = async (id, role, approver_role) => {
    await api(`/api/users/${id}`, { method: 'PATCH', body: { role, approver_role: role === 'approver' ? approver_role : null } })
    load()
  }
  return (
    <div className="grid cols-2">
      <div className="card">
        <strong>All users</strong>
        <table style={{ marginTop: 8 }}>
          <thead><tr><th>Name</th><th>Role</th><th>Approver role</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.name}<div className="small muted">{u.email}</div></td>
                <td>
                  <select value={u.role} onChange={(e) => updateRole(u.id, e.target.value, u.approver_role || 'supervisor')}>
                    {['requestor', 'staff', 'approver', 'admin'].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </td>
                <td>
                  {u.role === 'approver' ? (
                    <select value={u.approver_role || 'supervisor'} onChange={(e) => updateRole(u.id, 'approver', e.target.value)}>
                      {APPROVER_ROLES.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  ) : <span className="muted small">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <strong>Add user</strong>
        <form onSubmit={create}>
          <label>Name</label><input value={form.name} onChange={set('name')} />
          <label>Email</label><input value={form.email} onChange={set('email')} />
          <label>Temp password</label><input value={form.password} onChange={set('password')} />
          <label>Role</label>
          <select value={form.role} onChange={set('role')}>
            {['requestor', 'staff', 'approver', 'admin'].map((r) => <option key={r}>{r}</option>)}
          </select>
          {form.role === 'approver' && (
            <>
              <label>Approver role</label>
              <select value={form.approver_role} onChange={set('approver_role')}>
                {APPROVER_ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </>
          )}
          <label>Office</label><input value={form.office} onChange={set('office')} />
          {msg && <div className="ok">{msg}</div>}
          <button style={{ marginTop: 14 }}>Create user</button>
        </form>
      </div>
    </div>
  )
}

function Workflows() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ doc_type: '', description: '', originating_group: '', stepsText: 'dept_head:Department Head\ndean:College Dean' })
  const [msg, setMsg] = useState('')
  const load = () => api('/api/workflows').then(setRows).catch(() => {})
  useEffect(() => { load() }, [])
  const create = async (e) => {
    e.preventDefault(); setMsg('')
    const steps = form.stepsText.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const [approver_role, ...rest] = l.split(':')
      return { approver_role: approver_role.trim(), label: (rest.join(':') || approver_role).trim() }
    })
    try {
      await api('/api/workflows', { method: 'POST', body: { doc_type: form.doc_type, description: form.description, originating_group: form.originating_group, steps } })
      setMsg('Workflow created.'); setForm({ ...form, doc_type: '' }); load()
    } catch (e) { setMsg(e.message) }
  }
  return (
    <div className="grid cols-2">
      <div className="card">
        <strong>Configured workflows (approval matrix)</strong>
        {rows.map((w) => (
          <div key={w.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontWeight: 600 }}>{w.doc_type}</div>
            <div className="small muted">{w.description}</div>
            <div className="small">{w.steps.map((s) => s.label).join('  →  ')}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <strong>Add workflow</strong>
        <form onSubmit={create}>
          <label>Document type</label><input value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })} />
          <label>Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <label>Originating group</label><input value={form.originating_group} onChange={(e) => setForm({ ...form, originating_group: e.target.value })} />
          <label>Steps (one per line, format role:Label)</label>
          <textarea value={form.stepsText} onChange={(e) => setForm({ ...form, stepsText: e.target.value })} />
          <p className="small muted">Roles: supervisor, dept_head, hr_office, dean, budget_office, instructor, registrar</p>
          {msg && <div className="ok">{msg}</div>}
          <button style={{ marginTop: 8 }}>Create workflow</button>
        </form>
      </div>
    </div>
  )
}

function Audit() {
  const [rows, setRows] = useState([])
  useEffect(() => { api('/api/audit').then(setRows).catch(() => {}) }, [])
  return (
    <div className="card">
      <strong>System audit trail</strong>
      <table style={{ marginTop: 8 }}>
        <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Detail</th></tr></thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td className="small muted">{fmt(a.created_at)}</td>
              <td>{a.actor_name}</td><td>{a.action}</td><td className="small">{a.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
