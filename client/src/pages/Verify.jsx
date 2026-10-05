import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import AuthShell from '../components/AuthShell.jsx'

export default function Verify() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState('working') // working | ok | error
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!token) { setState('error'); setMsg('This link is missing its verification token.'); return }
    api(`/api/auth/verify?token=${encodeURIComponent(token)}`)
      .then((d) => { setState('ok'); setMsg(d.message || 'Your email is verified.') })
      .catch((e) => { setState('error'); setMsg(e.message) })
  }, [token])

  return (
    <AuthShell subtitle="Activating your account.">
        <h1 className="page-title">Email verification</h1>
        {state === 'working' && <p className="page-sub">Verifying your link...</p>}
        {state === 'ok' && (
          <>
            <div className="notice">{msg}</div>
            <Link to="/login"><button style={{ marginTop: 16, width: '100%' }}>Go to sign in</button></Link>
          </>
        )}
        {state === 'error' && (
          <>
            <div className="err">{msg}</div>
            <p className="small muted" style={{ marginTop: 16 }}>
              Need a new link? <Link to="/login">Sign in</Link> and choose &ldquo;Resend verification&rdquo;.
            </p>
          </>
        )}
    </AuthShell>
  )
}
