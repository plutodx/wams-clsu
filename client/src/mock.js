// mock.js - In-browser data layer for the standalone demo build (no backend).
// Enabled when the app is built with VITE_DEMO=true. Mirrors the real API's behavior
// using localStorage so the deployed demo runs entirely in the browser.
// Note: the demo cannot send real email, so registrations are auto-verified here.

const KEY = 'wams_demo_db'
const TOKEN_KEY = 'wams_token'

function sig(name) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='70'>` +
    `<text x='8' y='46' font-family='Segoe Script, Brush Script MT, cursive' font-size='30' fill='#123c1a'>${name}</text>` +
    `<line x1='8' y1='56' x2='250' y2='56' stroke='#9bbfa6' stroke-width='1'/></svg>`
  return 'data:image/svg+xml;base64,' + btoa(svg)
}

function seedDb() {
  const users = [
    { id: 1, name: 'System Administrator', email: 'admin@clsu.edu.ph', role: 'admin', approver_role: null, office: 'MIS Office', category: null, signature: null, email_verified: 1 },
    { id: 2, name: 'Maria Santos (Faculty)', email: 'faculty@clsu.edu.ph', role: 'requestor', approver_role: null, office: 'College of Engineering', category: 'Faculty', signature: null, email_verified: 1 },
    { id: 3, name: 'Jose Ramos (Staff)', email: 'staffreq@clsu.edu.ph', role: 'requestor', approver_role: null, office: 'General Services Office', category: 'Staff', signature: null, email_verified: 1 },
    { id: 4, name: 'Ana Cruz (Student)', email: 'student@clsu.edu.ph', role: 'requestor', approver_role: null, office: 'College of Engineering', category: 'Student', signature: null, email_verified: 1 },
    { id: 5, name: 'Office Staff (Records)', email: 'staff@clsu.edu.ph', role: 'staff', approver_role: null, office: 'Records Office', category: null, signature: null, email_verified: 1 },
    { id: 6, name: 'Engr. Dela Cruz (Supervisor)', email: 'supervisor@clsu.edu.ph', role: 'approver', approver_role: 'supervisor', office: 'College of Engineering', category: null, signature: sig('Engr. Dela Cruz'), email_verified: 1 },
    { id: 7, name: 'Dr. Reyes (Department Head)', email: 'depthead@clsu.edu.ph', role: 'approver', approver_role: 'dept_head', office: 'College of Engineering', category: null, signature: sig('Dr. Reyes'), email_verified: 1 },
    { id: 8, name: 'HRMO Officer', email: 'hr@clsu.edu.ph', role: 'approver', approver_role: 'hr_office', office: 'HRMO', category: null, signature: sig('HRMO Officer'), email_verified: 1 },
    { id: 9, name: 'Dean Gonzales', email: 'dean@clsu.edu.ph', role: 'approver', approver_role: 'dean', office: 'College of Engineering', category: null, signature: sig('Dean Gonzales'), email_verified: 1 },
    { id: 10, name: 'Budget Officer', email: 'budget@clsu.edu.ph', role: 'approver', approver_role: 'budget_office', office: 'Budget Office', category: null, signature: sig('Budget Officer'), email_verified: 1 },
    { id: 11, name: 'Prof. Aquino (Instructor)', email: 'instructor@clsu.edu.ph', role: 'approver', approver_role: 'instructor', office: 'College of Engineering', category: null, signature: sig('Prof. Aquino'), email_verified: 1 },
    { id: 12, name: 'Registrar Staff', email: 'registrar@clsu.edu.ph', role: 'approver', approver_role: 'registrar', office: 'Office of the Registrar', category: null, signature: sig('Registrar Staff'), email_verified: 1 },
    { id: 13, name: 'GSO Head', email: 'gso@clsu.edu.ph', role: 'approver', approver_role: 'gso', office: 'General Services Office', category: null, signature: sig('GSO Head'), email_verified: 1 },
  ]
  const matrix = [
    ['Leave Application', 'Employee application for leave of absence', 'Faculty', [['supervisor', 'Immediate Supervisor'], ['dept_head', 'Department Head'], ['hr_office', 'HRMO']]],
    ['Travel Authority', 'Request to travel on official business', 'Faculty', [['supervisor', 'Immediate Supervisor'], ['dept_head', 'Department Head'], ['dean', 'College Dean']]],
    ['Purchase Requisition', 'Request to procure goods or services', 'Faculty', [['dept_head', 'Department Head'], ['budget_office', 'Budget Office'], ['dean', 'College Dean']]],
    ['Excuse Letter', 'Student excuse for absence', 'Student', [['instructor', 'Subject Instructor'], ['dept_head', 'Department Head']]],
    ['Certification / Clearance', 'Student request for certification or clearance', 'Student', [['registrar', 'Registrar Staff'], ['dept_head', 'Registrar Head']]],
    ['Staff Leave Application', 'Non-teaching staff leave of absence', 'Staff', [['supervisor', 'Immediate Supervisor'], ['hr_office', 'HRMO']]],
    ['Service / Maintenance Request', 'Request for facility service or maintenance', 'Staff', [['supervisor', 'Immediate Supervisor'], ['gso', 'General Services Office']]],
    ['Supplies Requisition', 'Staff request for office supplies', 'Staff', [['supervisor', 'Immediate Supervisor'], ['budget_office', 'Budget Office']]],
  ]
  const workflows = matrix.map((m, i) => ({
    id: i + 1, doc_type: m[0], description: m[1], originating_group: m[2],
    steps: m[3].map((s, j) => ({ step_order: j + 1, approver_role: s[0], label: s[1] })),
  }))
  return { users, workflows, requests: [], audit: [], notifications: [], seq: { user: 14, request: 0, step: 0, audit: 0, notif: 0 } }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  const db = seedDb()
  save(db)
  return db
}
function save(db) { try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* quota */ } }
const now = () => new Date().toISOString()

function currentUser(db) {
  const t = localStorage.getItem(TOKEN_KEY) || ''
  const id = t.startsWith('demo-') ? Number(t.slice(5)) : null
  return db.users.find((u) => u.id === id) || null
}
function refNo(db) {
  const n = db.requests.length + 1
  return `WAMS-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`
}
function audit(db, request_id, actor, action, detail, data = null) {
  db.audit.push({
    id: ++db.seq.audit, request_id,
    actor_id: actor ? actor.id : null, actor_name: actor ? actor.name : 'System',
    action, detail: detail || '', ip_address: '127.0.0.1',
    data: data ? JSON.stringify(data) : null, created_at: now(),
  })
}
function notify(db, user_id, request_id, message) {
  db.notifications.push({ id: ++db.seq.notif, user_id, request_id, message, is_read: 0, created_at: now() })
}
function notifyRole(db, role, request_id, message) {
  db.users.filter((u) => u.role === 'approver' && u.approver_role === role).forEach((u) => notify(db, u.id, request_id, message))
}
const err = (m) => { throw new Error(m) }
// me view never leaks the raw signature; exposes has_signature like the real API
function meView(u) { const { signature, ...rest } = u; return { ...rest, has_signature: Boolean(signature), signature: signature || null } }

export async function mockApi(path, { method = 'GET', body } = {}) {
  const db = load()
  const me = currentUser(db)
  const url = path.split('?')[0]
  const query = Object.fromEntries(new URLSearchParams(path.split('?')[1] || ''))
  const seg = url.split('/').filter(Boolean) // e.g. ['api','requests','3','act']

  // ---- auth ----
  if (url === '/api/auth/login' && method === 'POST') {
    const u = db.users.find((x) => x.email === body.email)
    if (!u) err('Invalid email or password')
    if (!u.email_verified) { const e = new Error('Please verify your email before signing in.'); throw e }
    localStorage.setItem(TOKEN_KEY, 'demo-' + u.id)
    audit(db, null, u, 'auth.login', 'User Login'); save(db)
    return { token: 'demo-' + u.id, user: meView(u) }
  }
  if (url === '/api/auth/logout' && method === 'POST') {
    if (me) { audit(db, null, me, 'auth.logout', 'User Logout'); save(db) }
    return { ok: true }
  }
  if (url === '/api/auth/register' && method === 'POST') {
    if (db.users.some((x) => x.email === body.email)) err('Email already registered')
    // No mail server in the standalone demo, so instead of emailing the link we return it
    // to the screen. The verification step is still real: the account stays unverified and
    // login is blocked until the link is opened.
    const token = 'demo' + Math.random().toString(36).slice(2, 14)
    const u = { id: ++db.seq.user, name: body.name, email: body.email, role: 'requestor', approver_role: null, office: body.office || '', category: body.category || 'Faculty', signature: null, email_verified: 0, verify_token: token }
    db.users.push(u); save(db)
    return {
      ok: true, verificationRequired: true,
      message: 'Account created. In this demo there is no mail server, so open the verification link below to activate your account.',
      demoVerifyUrl: `/verify?token=${token}`,
    }
  }
  if (url === '/api/auth/verify') {
    const u = db.users.find((x) => x.verify_token === query.token)
    if (!u) err('Invalid or already-used verification link')
    u.email_verified = 1; u.verify_token = null; save(db)
    return { ok: true, message: 'Email verified. You can now sign in.' }
  }
  if (url === '/api/auth/resend' && method === 'POST') {
    const u = db.users.find((x) => x.email === body.email)
    if (u && !u.email_verified) return { ok: true, demoVerifyUrl: `/verify?token=${u.verify_token}` }
    return { ok: true }
  }
  if (url === '/api/auth/me') { if (!me) err('Not authenticated'); return { user: meView(me) } }
  if (!me) err('Not authenticated')

  // ---- signature: draw or upload a PNG, updatable ----
  if (url === '/api/me/signature' && method === 'POST') {
    if (me.role !== 'approver') err('Only approvers have signatures')
    const sig = String(body.signature || '')
    if (!sig.startsWith('data:image/png') && !sig.startsWith('data:image/svg+xml')) err('A PNG signature image is required')
    const isUpdate = Boolean(me.signature)
    me.signature = body.signature
    audit(db, null, me, isUpdate ? 'signature.update' : 'signature.set', isUpdate ? 'Updated Signature' : 'Set Signature')
    save(db)
    return { ok: true, updated: isUpdate }
  }

  // ---- workflows ----
  if (url === '/api/workflows' && method === 'GET') {
    let list = db.workflows.filter((w) => w.active !== 0)
    if (me.role === 'requestor' && me.category) list = list.filter((w) => w.originating_group === me.category)
    return list
  }
  if (url === '/api/workflows' && method === 'POST') {
    const w = { id: db.workflows.length + 1, doc_type: body.doc_type, description: body.description, originating_group: body.originating_group, steps: body.steps.map((s, i) => ({ step_order: i + 1, ...s })) }
    db.workflows.push(w); audit(db, null, me, 'CONFIGURE_WORKFLOW', `Created workflow "${body.doc_type}"`); save(db)
    return { id: w.id }
  }

  // ---- requests ----
  if (url === '/api/requests' && method === 'POST') {
    const wf = db.workflows.find((w) => w.doc_type === body.doc_type)
    const steps = wf ? wf.steps : (body.custom_steps || [{ step_order: 1, approver_role: 'dept_head', label: 'Department Head' }, { step_order: 2, approver_role: 'dean', label: 'College Dean' }])
    const reference = refNo(db)
    const r = {
      id: ++db.seq.request, reference_no: reference, requestor_id: me.id, requestor_name: me.name, requestor_office: me.office, requestor_category: me.category,
      workflow_id: wf ? wf.id : null, doc_type: body.doc_type, title: body.title, details: body.details || '',
      status: 'In Progress', current_step: 1, created_at: now(), updated_at: now(),
      steps: steps.map((s) => ({ id: ++db.seq.step, step_order: s.step_order, approver_role: s.approver_role, label: s.label, status: s.step_order === 1 ? 'Pending' : 'Waiting', acted_by: null, actor_name: null, comment: null, signature: null, acted_at: null })),
    }
    db.requests.push(r)
    audit(db, r.id, me, 'SUBMIT', `Submitted ${body.doc_type} (${reference})`)
    notifyRole(db, steps[0].approver_role, r.id, `New ${body.doc_type} (${reference}) awaiting your approval`)
    save(db)
    return { id: r.id, reference_no: reference }
  }
  if (url === '/api/requests/mine') return db.requests.filter((r) => r.requestor_id === me.id).map(strip).reverse()
  if (url === '/api/requests/pending') {
    return db.requests.filter((r) => r.status === 'In Progress').flatMap((r) => {
      const st = r.steps.find((s) => s.step_order === r.current_step)
      return (st && st.status === 'Pending' && st.approver_role === me.approver_role) ? [{ ...strip(r), step_label: st.label, step_no: st.step_order }] : []
    })
  }
  if (url === '/api/requests' && method === 'GET') {
    let list = db.requests.slice().reverse()
    if (query.status) list = list.filter((r) => r.status === query.status)
    if (query.doc_type) list = list.filter((r) => r.doc_type === query.doc_type)
    return list.map(strip)
  }
  if (seg[0] === 'api' && seg[1] === 'requests' && seg[2] && seg.length === 3) {
    const r = db.requests.find((x) => x.id === Number(seg[2]))
    if (!r) err('Not found')
    return { ...r, audit: db.audit.filter((a) => a.request_id === r.id) }
  }
  if (seg[1] === 'requests' && seg[3] === 'act' && method === 'POST') {
    const r = db.requests.find((x) => x.id === Number(seg[2]))
    if (!r) err('Not found')
    const step = r.steps.find((s) => s.step_order === r.current_step)
    if (!step || step.status !== 'Pending') err('No pending step to act on')
    if (step.approver_role !== me.approver_role) err('This step is not assigned to your role')
    const { action, comment = '' } = body
    // Fixed signature: the approver's saved signature is applied automatically.
    const signature = me.signature || ''
    if (action === 'approve' && !signature) err('Set your signature first (Account > Signature) before approving')
    if (action === 'approve') {
      Object.assign(step, { status: 'Approved', acted_by: me.id, actor_name: me.name, comment, signature, acted_at: now() })
      audit(db, r.id, me, 'APPROVE', `Approved step ${step.step_order} (${step.label})`)
      if (step.step_order < r.steps.length) {
        r.current_step += 1
        const nx = r.steps.find((s) => s.step_order === r.current_step); nx.status = 'Pending'
        notifyRole(db, nx.approver_role, r.id, `${r.doc_type} (${r.reference_no}) awaiting your approval`)
      } else { r.status = 'Approved'; notify(db, r.requestor_id, r.id, `Your ${r.doc_type} (${r.reference_no}) has been fully approved`) }
    } else {
      const status = action === 'reject' ? 'Rejected' : 'Returned'
      Object.assign(step, { status, acted_by: me.id, actor_name: me.name, comment, acted_at: now() })
      r.status = status
      audit(db, r.id, me, action.toUpperCase(), `${status} at step ${step.step_order}: ${comment}`)
      notify(db, r.requestor_id, r.id, `Your ${r.doc_type} (${r.reference_no}) was ${status.toLowerCase()}`)
    }
    r.updated_at = now(); save(db)
    return { ok: true }
  }
  if (seg[1] === 'requests' && seg[3] === 'resubmit' && method === 'POST') {
    const r = db.requests.find((x) => x.id === Number(seg[2]))
    if (!r || r.requestor_id !== me.id) err('Forbidden')
    if (r.status !== 'Returned') err('Only returned requests can be resubmitted')
    if (body.title) r.title = body.title; if (body.details) r.details = body.details
    r.status = 'In Progress'; r.current_step = 1
    r.steps.forEach((s) => Object.assign(s, { status: s.step_order === 1 ? 'Pending' : 'Waiting', acted_by: null, actor_name: null, comment: null, signature: null, acted_at: null }))
    audit(db, r.id, me, 'RESUBMIT', 'Requestor resubmitted after revision')
    notifyRole(db, r.steps[0].approver_role, r.id, `${r.doc_type} (${r.reference_no}) resubmitted for approval`)
    save(db); return { ok: true }
  }

  // ---- reports ----
  if (url === '/api/reports/summary') {
    const rs = db.requests
    const group = (arr, k, outKey) => Object.entries(arr.reduce((a, x) => { const key = x[k] || 'Unspecified'; a[key] = (a[key] || 0) + 1; return a }, {})).map(([key, count]) => ({ [outKey]: key, count }))
    return {
      total: rs.length,
      pending: rs.filter((r) => ['Pending', 'In Progress'].includes(r.status)).length,
      approved: rs.filter((r) => r.status === 'Approved').length,
      byStatus: group(rs, 'status', 'status'),
      byType: group(rs, 'doc_type', 'doc_type').sort((a, b) => b.count - a.count),
      byCategory: group(rs, 'requestor_category', 'category').sort((a, b) => b.count - a.count),
    }
  }
  // ---- audit ----
  if (url === '/api/audit') return db.audit.slice().reverse()
  // ---- users ----
  if (url === '/api/users' && method === 'GET') return db.users.map(meView)
  if (url === '/api/users' && method === 'POST') {
    if (db.users.some((x) => x.email === body.email)) err('Email exists')
    const u = { id: ++db.seq.user, name: body.name, email: body.email, role: body.role, approver_role: body.approver_role || null, office: body.office || '', category: body.category || null, signature: null, email_verified: 1 }
    db.users.push(u); audit(db, null, me, 'CREATE_USER', `Created ${body.role} ${body.email}`); save(db)
    return { id: u.id }
  }
  if (seg[1] === 'users' && seg[2] && method === 'PATCH') {
    const u = db.users.find((x) => x.id === Number(seg[2]))
    if (u) { if (body.role) u.role = body.role; u.approver_role = body.approver_role || null; save(db) }
    return { ok: true }
  }
  if (seg[1] === 'users' && seg[2] && method === 'DELETE') {
    const id = Number(seg[2])
    if (id === me.id) err('You cannot delete your own account.')
    const u = db.users.find((x) => x.id === id)
    if (!u) err('User not found')
    if (u.role === 'admin' && db.users.filter((x) => x.role === 'admin').length <= 1) err('Cannot delete the only admin account.')
    db.users = db.users.filter((x) => x.id !== id)
    db.notifications = db.notifications.filter((n) => n.user_id !== id)
    audit(db, null, me, 'DELETE_USER', `Deleted ${u.role} ${u.email}`); save(db)
    return { ok: true }
  }
  // ---- notifications ----
  if (url === '/api/notifications' && method === 'GET') return db.notifications.filter((n) => n.user_id === me.id).slice().reverse()
  if (seg[1] === 'notifications' && seg[3] === 'read' && method === 'POST') {
    const n = db.notifications.find((x) => x.id === Number(seg[2]) && x.user_id === me.id)
    if (n) { n.is_read = 1; save(db) }
    return { ok: true }
  }
  err('Unknown endpoint: ' + method + ' ' + url)
}

// list views don't need the heavy steps/signature arrays
function strip(r) { const { steps, ...rest } = r; return rest }
