import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

const DEMO = [
  ['Requestor', 'requestor@clsu.edu.ph'],
  ['Supervisor', 'supervisor@clsu.edu.ph'],
  ['Dept. Head', 'depthead@clsu.edu.ph'],
  ['HRMO', 'hr@clsu.edu.ph'],
  ['Admin', 'admin@clsu.edu.ph'],
]

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    try { await login(email, password); nav('/') }
    catch (e) { setErr(e.message) }
  }

  return (
    <div className="auth-wrap">
      <div className="card">
        <h1 className="page-title">WAMS Login</h1>
        <p className="page-sub">Workflow &amp; Approval Management System &middot; CLSU</p>
        <form onSubmit={submit}>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@clsu.edu.ph" />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password123" />
          {err && <div className="err">{err}</div>}
          <button style={{ marginTop: 16, width: '100%' }}>Sign in</button>
        </form>
        <p className="small muted" style={{ marginTop: 16 }}>
          No account? <Link to="/register">Register as a requestor</Link>
          <br />
          <Link to="/forgot">Forgot password?</Link>
        </p>
        <div className="small muted" style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <strong>Demo accounts</strong> (password: password123). Click to fill:
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {DEMO.map(([label, mail]) => (
              <button key={mail} type="button" className="secondary small"
                onClick={() => { setEmail(mail); setPassword('password123') }}>{label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
