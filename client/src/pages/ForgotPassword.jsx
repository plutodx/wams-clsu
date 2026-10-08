import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import AuthShell from '../components/AuthShell.jsx'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')
  const [done, setDone] = useState(null) // { message, demoResetUrl, previewUrl }

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    try {
      const d = await api('/api/auth/forgot', { method: 'POST', body: { email } })
      setDone({ message: d.message, demoResetUrl: d.demoResetUrl, previewUrl: d.mailPreviewUrl })
    } catch (e) { setErr(e.message) }
  }

  return (
    <AuthShell subtitle="Recover your account.">
        <h1 className="page-title">Forgot Password</h1>
        <p className="page-sub">Enter your email and we'll send you a link to reset your password.</p>
        {done ? (
          <>
            <div className="notice">
              {done.message || `If an account exists for ${email}, a password reset link has been sent.`}
              <div style={{ marginTop: 8 }}>
                If it is not in your inbox within a minute, please check your spam or junk folder.
              </div>
            </div>
            {done.previewUrl && (
              <a href={done.previewUrl} target="_blank" rel="noopener noreferrer">
                <button style={{ marginTop: 14, width: '100%' }}>Open my reset email</button>
              </a>
            )}
            {done.demoResetUrl && (
              <Link to={done.demoResetUrl}>
                <button style={{ marginTop: 14, width: '100%' }}>Reset my password now</button>
              </Link>
            )}
          </>
        ) : (
          <form onSubmit={submit}>
            <label>Email address</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@clsu.edu.ph" />
            {err && <div className="err">{err}</div>}
            <button style={{ marginTop: 16, width: '100%' }}>Send reset link</button>
          </form>
        )}
        <p className="small muted" style={{ marginTop: 16 }}>
          Remembered it? <Link to="/login">Back to sign in</Link>
        </p>
    </AuthShell>
  )
}
