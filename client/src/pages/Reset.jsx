import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import AuthShell from '../components/AuthShell.jsx'

export default function Reset() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (password.length < 6) { setErr('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setErr('The two passwords do not match.'); return }
    try {
      await api('/api/auth/reset', { method: 'POST', body: { token, password } })
      setDone(true)
    } catch (e) { setErr(e.message) }
  }

  if (!token) {
    return (
      <AuthShell subtitle="Reset your password.">
        <h1 className="page-title">Reset password</h1>
        <div className="err">This link is missing its reset token.</div>
        <p className="small muted" style={{ marginTop: 16 }}>
          Request a new one on the <Link to="/forgot">forgot password</Link> page.
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell subtitle="Reset your password.">
        <h1 className="page-title">Choose a new password</h1>
        {done ? (
          <>
            <div className="notice">Your password has been reset. You can now sign in.</div>
            <Link to="/login"><button style={{ marginTop: 16, width: '100%' }}>Go to sign in</button></Link>
          </>
        ) : (
          <form onSubmit={submit}>
            <label>New password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <label>Confirm new password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {err && <div className="err">{err}</div>}
            <button style={{ marginTop: 16, width: '100%' }}>Reset password</button>
          </form>
        )}
        <p className="small muted" style={{ marginTop: 16 }}>
          Remembered it? <Link to="/login">Back to sign in</Link>
        </p>
    </AuthShell>
  )
}
