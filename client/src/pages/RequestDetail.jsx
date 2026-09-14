import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { StatusBadge } from '../App.jsx'
import SignaturePad from '../components/SignaturePad.jsx'

function fmt(d) {
  if (!d) return ''
  const iso = d.includes('T') ? d : d.replace(' ', 'T') + 'Z'
  const dt = new Date(iso)
  return isNaN(dt.getTime()) ? d : dt.toLocaleString()
}

export default function RequestDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [r, setR] = useState(null)
  const [err, setErr] = useState('')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const sigRef = useRef(null)

  const load = () => api(`/api/requests/${id}`).then(setR).catch((e) => setErr(e.message))
  useEffect(() => { load() }, [id])

  if (err) return <div className="container"><div className="err">{err}</div></div>
  if (!r) return <div className="center muted">Loading...</div>

  const currentStep = r.steps.find((s) => s.step_order === r.current_step)
  const canAct = user.role === 'approver' && r.status === 'In Progress' &&
    currentStep && currentStep.status === 'Pending' && currentStep.approver_role === user.approver_role
  const canResubmit = user.role === 'requestor' && r.requestor_id === user.id && r.status === 'Returned'

  const act = async (action) => {
    setErr(''); setBusy(true)
    try {
      let signature = ''
      if (action === 'approve') {
        if (sigRef.current.isEmpty()) { setErr('Please sign before approving.'); setBusy(false); return }
        signature = sigRef.current.toDataURL()
      }
      await api(`/api/requests/${id}/act`, { method: 'POST', body: { action, comment, signature } })
      setComment(''); if (sigRef.current) sigRef.current.clear(); await load()
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  const resubmit = async () => {
    setBusy(true)
    try { await api(`/api/requests/${id}/resubmit`, { method: 'POST', body: {} }); await load() }
    catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  const stepClass = (s) => {
    if (['Approved'].includes(s.status)) return 'done'
    if (['Rejected', 'Returned'].includes(s.status)) return 'rejected'
    if (s.status === 'Pending') return 'current'
    return ''
  }

  return (
    <div className="container">
      <h1 className="page-title">{r.title}</h1>
      <p className="page-sub">{r.reference_no} &middot; {r.doc_type} &middot; <StatusBadge status={r.status} /></p>

      <div className="grid cols-2">
        <div className="card">
          <strong>Request details</strong>
          <table style={{ marginTop: 8 }}>
            <tbody>
              <tr><th>Requestor</th><td>{r.requestor_name} ({r.requestor_office})</td></tr>
              <tr><th>Document type</th><td>{r.doc_type}</td></tr>
              <tr><th>Submitted</th><td>{fmt(r.created_at)}</td></tr>
              <tr><th>Last update</th><td>{fmt(r.updated_at)}</td></tr>
            </tbody>
          </table>
          <p style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{r.details}</p>
        </div>

        <div className="card">
          <strong>Approval tracking</strong>
          <ul className="timeline" style={{ marginTop: 12 }}>
            {r.steps.map((s) => (
              <li key={s.id} className={stepClass(s)}>
                <span className="dot" />
                <div className="step-title">{s.step_order}. {s.label} <StatusBadge status={s.status} /></div>
                {s.actor_name && <div className="step-meta">{s.status} by {s.actor_name} &middot; {fmt(s.acted_at)}</div>}
                {s.comment && <div className="step-meta">Note: {s.comment}</div>}
                {s.signature && <img className="sig-thumb" src={s.signature} alt="signature" />}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {canAct && (
        <div className="card" style={{ marginTop: 16 }}>
          <strong>Your action &mdash; {currentStep.label}</strong>
          <label>Comment (optional for approve, recommended for reject/return)</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} />
          <label>Digital signature (required to approve)</label>
          <SignaturePad ref={sigRef} />
          {err && <div className="err">{err}</div>}
          <div className="row-actions" style={{ marginTop: 14 }}>
            <button disabled={busy} onClick={() => act('approve')}>Approve &amp; Sign</button>
            <button disabled={busy} className="warn" onClick={() => act('return')}>Return for revision</button>
            <button disabled={busy} className="danger" onClick={() => act('reject')}>Reject</button>
          </div>
        </div>
      )}

      {canResubmit && (
        <div className="card" style={{ marginTop: 16 }}>
          <strong>This request was returned for revision</strong>
          <p className="small muted">Resubmitting sends it back to the first approver.</p>
          <button disabled={busy} onClick={resubmit}>Resubmit request</button>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <strong>Audit trail</strong>
        <table style={{ marginTop: 8 }}>
          <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Detail</th></tr></thead>
          <tbody>
            {r.audit.map((a) => (
              <tr key={a.id}>
                <td className="small muted">{fmt(a.created_at)}</td>
                <td>{a.actor_name}</td><td>{a.action}</td><td className="small">{a.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
