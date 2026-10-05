import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'
import AuthShell from '../components/AuthShell.jsx'

const DEMO = [
  ['Faculty', 'faculty@clsu.edu.ph'],
  ['Staff', 'staffreq@clsu.edu.ph'],
  ['Student', 'student@clsu.edu.ph'],
  ['Supervisor', 'supervisor@clsu.edu.ph'],
  ['Dept. Head', 'depthead@clsu.edu.ph'],
  ['Admin', 'admin@clsu.edu.ph'],
]

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [needsVerify, setNeedsVerify] = useState(false)
  const [resent, setResent] = useState('')

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setNeedsVerify(false); setResent('')
    try { await login(email, password); nav('/') }
    catch (e) {
      setErr(e.message)
      if (/verify/i.test(e.message)) setNeedsVerify(true)
    }
  }

  const [resendUrl, setResendUrl] = useState('')
  const resend = async () => {
    setResent(''); setResendUrl('')
    try {
      const d = await api('/api/auth/resend', { method: 'POST', body: { email } })
      if (d && d.demoVerifyUrl) { setResendUrl(d.demoVerifyUrl); setResent('Demo mode: open the verification link below.') }
      else setResent('If that account exists and is unverified, a new link is on its way.')
    } catch (e) { setResent(e.message) }
  }

  return (
    <AuthShell subtitle="Sign in to submit and approve requests online.">
        <h1 className="page-title">Sign in</h1>
        <p className="page-sub">Use your WAMS account.</p>
        <form onSubmit={submit}>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@clsu.edu.ph" />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password123" />
          {err && <div className="err">{err}</div>}
          {needsVerify && (
            <div style={{ marginTop: 8 }}>
              <button type="button" className="secondary small" onClick={resend}>Resend verification email</button>
              {resent && (
                <div className="notice" style={{ marginTop: 8 }}>
                  {resent}
                  {resendUrl && <> <Link to={resendUrl}>Verify now</Link></>}
                </div>
              )}
            </div>
          )}
          <button style={{ marginTop: 16, width: '100%' }}>Sign in</button>
        </form>
        <p className="small muted" style={{ marginTop: 16 }}>
          No account? <Link to="/register">Register as a requestor</Link>
          <br />
          <Link to="/forgot">Forgot password?</Link>
        </p>
        <div className="small muted demo-accounts">
          <strong>Demo accounts</strong> (password: password123). Click to fill:
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {DEMO.map(([label, mail]) => (
              <button key={mail} type="button" className="secondary small"
                onClick={() => { setEmail(mail); setPassword('password123') }}>{label}</button>
            ))}
          </div>
        </div>
    </AuthShell>
  )
}
