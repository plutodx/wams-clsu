import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'

export default function SubmitRequest() {
  const nav = useNavigate()
  const [workflows, setWorkflows] = useState([])
  const [docType, setDocType] = useState('')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    api('/api/workflows').then((w) => {
      setWorkflows(w)
      if (w.length) setDocType(w[0].doc_type)
    }).catch(() => {})
  }, [])

  const selected = workflows.find((w) => w.doc_type === docType)

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    try {
      const r = await api('/api/requests', { method: 'POST', body: { doc_type: docType, title, details } })
      nav(`/requests/${r.id}`)
    } catch (e) { setErr(e.message) }
  }

  return (
    <div className="container">
      <h1 className="page-title">Submit a Request</h1>
      <p className="page-sub">Choose a document type. The system routes it automatically through the correct approvers.</p>
      <div className="grid cols-2">
        <div className="card">
          <form onSubmit={submit}>
            <label>Document type</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)}>
              {workflows.map((w) => <option key={w.id} value={w.doc_type}>{w.doc_type}</option>)}
            </select>
            <label>Title / subject</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 5-day vacation leave" />
            <label>Details</label>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Describe your request..." />
            {err && <div className="err">{err}</div>}
            <button style={{ marginTop: 16 }}>Submit request</button>
          </form>
        </div>
        <div className="card">
          <strong>Approval route</strong>
          {selected ? (
            <>
              <p className="small muted">{selected.description}</p>
              <ol style={{ paddingLeft: 18, lineHeight: 1.9 }}>
                {selected.steps.map((s) => <li key={s.step_order}>{s.label}</li>)}
              </ol>
              <p className="small muted">Originating group: {selected.originating_group}</p>
            </>
          ) : <p className="muted">Select a document type to preview its approvers.</p>}
        </div>
      </div>
    </div>
  )
}
