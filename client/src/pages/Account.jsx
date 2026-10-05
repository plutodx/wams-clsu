import { useRef, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import SignaturePad from '../components/SignaturePad.jsx'

// Turns an uploaded image into a PNG data URL and makes a near-white background
// transparent, so an uploaded signature sits cleanly on the approval sheet.
function toTransparentPng(file) {
  return new Promise((resolve, reject) => {
    if (file.type !== 'image/png') { reject(new Error('Please upload a PNG image (.png only).')); return }
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const c = document.createElement('canvas')
        c.width = img.width; c.height = img.height
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0)
        try {
          const data = ctx.getImageData(0, 0, c.width, c.height)
          const d = data.data
          for (let i = 0; i < d.length; i += 4) {
            // near-white -> transparent
            if (d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240) d[i + 3] = 0
          }
          ctx.putImageData(data, 0, 0)
        } catch (e) { /* cross-origin safe here; ignore */ }
        resolve(c.toDataURL('image/png'))
      }
      img.onerror = () => reject(new Error('Could not read that image.'))
      img.src = reader.result
    }
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsDataURL(file)
  })
}

export default function Account() {
  const { user, refreshUser } = useAuth()
  const sigRef = useRef(null)
  const [mode, setMode] = useState('draw') // 'draw' | 'upload'
  const [uploaded, setUploaded] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const hasSig = Boolean(user.signature)

  const pickFile = async (e) => {
    setErr(''); setSaved(false)
    const file = e.target.files && e.target.files[0]
    if (!file) return
    try { setUploaded(await toTransparentPng(file)) }
    catch (err) { setErr(err.message); setUploaded(null) }
  }

  const save = async () => {
    setErr(''); setSaved(false)
    let signature = ''
    if (mode === 'draw') {
      if (!sigRef.current || sigRef.current.isEmpty()) { setErr('Draw your signature first.'); return }
      signature = sigRef.current.toDataURL()
    } else {
      if (!uploaded) { setErr('Choose a PNG file first.'); return }
      signature = uploaded
    }
    setBusy(true)
    try {
      await api('/api/me/signature', { method: 'POST', body: { signature } })
      await refreshUser()
      setSaved(true); setUploaded(null)
      if (sigRef.current) sigRef.current.clear()
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="container">
      <h1 className="page-title">My Account</h1>
      <p className="page-sub">{user.name} &middot; {user.email} &middot; {user.role}
        {user.category ? ` · ${user.category}` : ''}</p>

      {user.role === 'approver' ? (
        <div className="grid cols-2">
          <div className="card">
            <strong>Current signature</strong>
            {hasSig ? (
              <>
                <div className="sig-box" style={{ marginTop: 12 }}>
                  <img src={user.signature} alt="Your signature" style={{ maxWidth: '100%', maxHeight: 90 }} />
                </div>
                <p className="small muted" style={{ marginTop: 10 }}>
                  This signature is applied automatically to every request you approve. You can update it any time below.
                </p>
              </>
            ) : <p className="muted" style={{ marginTop: 10 }}>No signature yet. Draw or upload one below, then it is applied on every approval.</p>}
          </div>

          <div className="card">
            <strong>{hasSig ? 'Update signature' : 'Set signature'}</strong>
            <div className="tabs" style={{ marginTop: 10 }}>
              <button className={mode === 'draw' ? 'active' : ''} onClick={() => { setMode('draw'); setErr('') }}>Draw</button>
              <button className={mode === 'upload' ? 'active' : ''} onClick={() => { setMode('upload'); setErr('') }}>Upload PNG</button>
            </div>

            {mode === 'draw' ? (
              <div style={{ marginTop: 10 }}>
                <SignaturePad ref={sigRef} />
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                <input type="file" accept="image/png" onChange={pickFile} />
                <p className="small muted" style={{ marginTop: 6 }}>PNG only. A near-white background is made transparent automatically.</p>
                {uploaded && <div className="sig-box" style={{ marginTop: 10 }}><img src={uploaded} alt="Preview" style={{ maxWidth: '100%', maxHeight: 90 }} /></div>}
              </div>
            )}

            {err && <div className="err">{err}</div>}
            {saved && <div className="ok" style={{ marginTop: 8 }}>Signature saved.</div>}
            <div className="row-actions" style={{ marginTop: 12 }}>
              <button disabled={busy} onClick={save}>{hasSig ? 'Update signature' : 'Save signature'}</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ maxWidth: 560 }}>
          <p className="muted">No signature is needed for your role. Signatures apply to approvers only.</p>
        </div>
      )}
    </div>
  )
}
