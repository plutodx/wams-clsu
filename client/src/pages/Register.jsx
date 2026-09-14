import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

export default function Register() {
  const { register } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', office: '' })
  const [err, setErr] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    try { await register({ ...form, role: 'requestor' }); nav('/') }
    catch (e) { setErr(e.message) }
  }

  return (
    <div className="auth-wrap">
      <div className="card">
        <h1 className="page-title">Create account</h1>
        <p className="page-sub">Register as a requestor (faculty, staff, or student)</p>
        <form onSubmit={submit}>
          <label>Full name</label>
          <input value={form.name} onChange={set('name')} />
          <label>Email</label>
          <input value={form.email} onChange={set('email')} />
          <label>Office / College</label>
          <input value={form.office} onChange={set('office')} />
          <label>Password</label>
          <input type="password" value={form.password} onChange={set('password')} />
          {err && <div className="err">{err}</div>}
          <button style={{ marginTop: 16, width: '100%' }}>Register</button>
        </form>
        <p className="small muted" style={{ marginTop: 16 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
