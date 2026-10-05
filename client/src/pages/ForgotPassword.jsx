import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    // Front-end account-recovery screen. In production this would trigger a reset email.
    setSent(true)
  }

  return (
    <AuthShell subtitle="Recover your account.">
        <h1 className="page-title">Forgot Password</h1>
        <p className="page-sub">Enter your email and we'll send you a link to reset your password.</p>
        {sent ? (
          <div className="ok">
            If an account exists for <strong>{email}</strong>, a password reset link has been sent.
            Please check your email.
          </div>
        ) : (
          <form onSubmit={submit}>
            <label>Email address</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@clsu.edu.ph" />
            <button style={{ marginTop: 16, width: '100%' }}>Send reset link</button>
          </form>
        )}
        <p className="small muted" style={{ marginTop: 16 }}>
          Remembered it? <Link to="/login">Back to sign in</Link>
        </p>
    </AuthShell>
  )
}
