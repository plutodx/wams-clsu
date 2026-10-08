import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import AuthShell from '../components/AuthShell.jsx'

const CATEGORIES = ['Student', 'Faculty', 'Staff']

export default function Register() {
  const { register } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', office: '', category: 'Faculty' })
  const [err, setErr] = useState('')
  const [done, setDone] = useState(null) // { email, message }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    try {
      const d = await register({ ...form, role: 'requestor' })
      setDone({ email: form.email, message: d.message, verifyUrl: d.demoVerifyUrl, previewUrl: d.mailPreviewUrl })
    } catch (e) { setErr(e.message) }
  }

  if (done) {
    return (
      <AuthShell subtitle="Almost there.">
          <h1 className="page-title">Check your email</h1>
          <p className="page-sub">One more step before you can sign in.</p>
          <div className="notice">
            {done.message || `We sent a verification link to ${done.email}. Open it to activate your account.`}
            <div style={{ marginTop: 8 }}>
              If it is not in your inbox within a minute, please check your spam or junk folder.
            </div>
          </div>
          {done.previewUrl && (
            <a href={done.previewUrl} target="_blank" rel="noopener noreferrer">
              <button style={{ marginTop: 14, width: '100%' }}>Open my verification email</button>
            </a>
          )}
          {done.verifyUrl && (
            <Link to={done.verifyUrl}>
              <button style={{ marginTop: 14, width: '100%' }}>Verify my email now</button>
            </Link>
          )}
          <p className="small muted" style={{ marginTop: 16 }}>
            After verifying you can <Link to="/login">sign in</Link>.
          </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell subtitle="Create your requestor account.">
        <h1 className="page-title">Create account</h1>
        <p className="page-sub">Register as a requestor. Pick the category that applies to you.</p>
        <form onSubmit={submit}>
          <label>Requestor category</label>
          <select value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label>Full name</label>
          <input value={form.name} onChange={set('name')} />
          <label>Email</label>
          <input value={form.email} onChange={set('email')} placeholder="you@clsu.edu.ph" />
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
    </AuthShell>
  )
}
