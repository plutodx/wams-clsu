// server.js - Express REST API for WAMS (PostgreSQL).
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, init } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'wams-dev-secret-change-me';

// CORS: allow the deployed front-end origin (set CLIENT_ORIGIN in production), or all in dev.
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: '5mb' }));

// query helpers
const q = async (text, params) => (await pool.query(text, params)).rows;
const one = async (text, params) => (await pool.query(text, params)).rows[0];

// ---------- helpers ----------
function sign(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
}
async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = await one('SELECT id,name,email,role,approver_role,office FROM users WHERE id=$1', [payload.id]);
    if (!req.user) return res.status(401).json({ error: 'User not found' });
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Forbidden' });

async function logAudit(request_id, actor, action, detail) {
  await pool.query(
    'INSERT INTO audit_logs (request_id, actor_id, actor_name, action, detail) VALUES ($1,$2,$3,$4,$5)',
    [request_id, actor ? actor.id : null, actor ? actor.name : 'System', action, detail || '']
  );
}
async function notify(user_id, request_id, message) {
  await pool.query('INSERT INTO notifications (user_id, request_id, message) VALUES ($1,$2,$3)',
    [user_id, request_id, message]);
}
async function notifyRole(approver_role, request_id, message) {
  const rows = await q('SELECT id FROM users WHERE role=$1 AND approver_role=$2', ['approver', approver_role]);
  for (const r of rows) await notify(r.id, request_id, message);
}
async function refNo() {
  const year = new Date().getFullYear();
  const c = (await one('SELECT COUNT(*)::int AS c FROM requests')).c + 1;
  return `WAMS-${year}-${String(c).padStart(4, '0')}`;
}

// wrap async routes so errors return JSON
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e); res.status(500).json({ error: 'Server error' });
});

// ---------- auth ----------
app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password, role = 'requestor', office = '' } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  if (await one('SELECT id FROM users WHERE email=$1', [email])) return res.status(409).json({ error: 'Email already registered' });
  const finalRole = ['requestor', 'staff'].includes(role) ? role : 'requestor';
  const r = await one(
    'INSERT INTO users (name,email,password_hash,role,office) VALUES ($1,$2,$3,$4,$5) RETURNING id,name,email,role,approver_role,office',
    [name, email, bcrypt.hashSync(password, 10), finalRole, office]
  );
  res.json({ token: sign(r), user: r });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body || {};
  const row = await one('SELECT * FROM users WHERE email=$1', [email]);
  if (!row || !bcrypt.compareSync(password, row.password_hash))
    return res.status(401).json({ error: 'Invalid email or password' });
  const user = { id: row.id, name: row.name, email: row.email, role: row.role, approver_role: row.approver_role, office: row.office };
  res.json({ token: sign(user), user });
}));

app.get('/api/auth/me', auth, (req, res) => res.json({ user: req.user }));

// ---------- workflows ----------
app.get('/api/workflows', auth, wrap(async (req, res) => {
  const wfs = await q('SELECT * FROM workflows WHERE active=1 ORDER BY doc_type');
  for (const w of wfs) {
    w.steps = await q('SELECT step_order, approver_role, label FROM workflow_steps WHERE workflow_id=$1 ORDER BY step_order', [w.id]);
  }
  res.json(wfs);
}));

app.post('/api/workflows', auth, requireRole('admin'), wrap(async (req, res) => {
  const { doc_type, description = '', originating_group = '', steps = [] } = req.body || {};
  if (!doc_type || !steps.length) return res.status(400).json({ error: 'doc_type and steps required' });
  if (await one('SELECT id FROM workflows WHERE doc_type=$1', [doc_type])) return res.status(409).json({ error: 'Workflow already exists' });
  const wf = await one('INSERT INTO workflows (doc_type,description,originating_group) VALUES ($1,$2,$3) RETURNING id',
    [doc_type, description, originating_group]);
  let i = 1;
  for (const s of steps) await pool.query('INSERT INTO workflow_steps (workflow_id,step_order,approver_role,label) VALUES ($1,$2,$3,$4)', [wf.id, i++, s.approver_role, s.label]);
  await logAudit(null, req.user, 'CONFIGURE_WORKFLOW', `Created workflow "${doc_type}"`);
  res.json({ id: wf.id });
}));

// ---------- requests ----------
app.post('/api/requests', auth, wrap(async (req, res) => {
  const { doc_type, title, details = '', custom_steps } = req.body || {};
  if (!doc_type || !title) return res.status(400).json({ error: 'doc_type and title required' });

  const workflow = await one('SELECT * FROM workflows WHERE doc_type=$1 AND active=1', [doc_type]);
  let steps;
  if (workflow) {
    steps = await q('SELECT step_order, approver_role, label FROM workflow_steps WHERE workflow_id=$1 ORDER BY step_order', [workflow.id]);
  } else {
    steps = (custom_steps && custom_steps.length)
      ? custom_steps.map((s, i) => ({ step_order: i + 1, approver_role: s.approver_role, label: s.label }))
      : [{ step_order: 1, approver_role: 'dept_head', label: 'Department Head' }, { step_order: 2, approver_role: 'dean', label: 'College Dean' }];
  }

  const reference = await refNo();
  const r = await one(
    `INSERT INTO requests (reference_no,requestor_id,workflow_id,doc_type,title,details,status,current_step)
     VALUES ($1,$2,$3,$4,$5,$6,'In Progress',1) RETURNING id`,
    [reference, req.user.id, workflow ? workflow.id : null, doc_type, title, details]
  );
  const reqId = r.id;
  for (const s of steps) {
    await pool.query('INSERT INTO request_steps (request_id,step_order,approver_role,label,status) VALUES ($1,$2,$3,$4,$5)',
      [reqId, s.step_order, s.approver_role, s.label, s.step_order === 1 ? 'Pending' : 'Waiting']);
  }
  await logAudit(reqId, req.user, 'SUBMIT', `Submitted ${doc_type} (${reference})`);
  await notifyRole(steps[0].approver_role, reqId, `New ${doc_type} (${reference}) awaiting your approval`);
  res.json({ id: reqId, reference_no: reference });
}));

app.get('/api/requests/mine', auth, wrap(async (req, res) => {
  res.json(await q('SELECT * FROM requests WHERE requestor_id=$1 ORDER BY created_at DESC', [req.user.id]));
}));

app.get('/api/requests/pending', auth, requireRole('approver'), wrap(async (req, res) => {
  res.json(await q(`
    SELECT r.*, rs.id AS step_id, rs.label AS step_label, rs.step_order AS step_no
    FROM request_steps rs JOIN requests r ON r.id = rs.request_id
    WHERE rs.status='Pending' AND rs.approver_role=$1 AND r.current_step = rs.step_order
    ORDER BY r.created_at ASC`, [req.user.approver_role]));
}));

app.get('/api/requests', auth, requireRole('admin', 'staff'), wrap(async (req, res) => {
  const { status, doc_type } = req.query;
  let sql = 'SELECT r.*, u.name AS requestor_name FROM requests r JOIN users u ON u.id=r.requestor_id WHERE 1=1';
  const args = [];
  if (status) { args.push(status); sql += ` AND r.status=$${args.length}`; }
  if (doc_type) { args.push(doc_type); sql += ` AND r.doc_type=$${args.length}`; }
  sql += ' ORDER BY r.created_at DESC';
  res.json(await q(sql, args));
}));

app.get('/api/requests/:id', auth, wrap(async (req, res) => {
  const r = await one('SELECT r.*, u.name AS requestor_name, u.office AS requestor_office FROM requests r JOIN users u ON u.id=r.requestor_id WHERE r.id=$1', [req.params.id]);
  if (!r) return res.status(404).json({ error: 'Not found' });
  const steps = await q('SELECT rs.*, a.name AS actor_name FROM request_steps rs LEFT JOIN users a ON a.id=rs.acted_by WHERE rs.request_id=$1 ORDER BY rs.step_order', [r.id]);
  const audit = await q('SELECT * FROM audit_logs WHERE request_id=$1 ORDER BY created_at ASC', [r.id]);
  const isChainApprover = req.user.role === 'approver' && steps.some((s) => s.approver_role === req.user.approver_role);
  const allowed = req.user.role === 'admin' || req.user.role === 'staff' || r.requestor_id === req.user.id || isChainApprover;
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });
  res.json({ ...r, steps, audit });
}));

app.post('/api/requests/:id/act', auth, requireRole('approver'), wrap(async (req, res) => {
  const { action, comment = '', signature = '' } = req.body || {};
  if (!['approve', 'reject', 'return'].includes(action)) return res.status(400).json({ error: 'Invalid action' });

  const r = await one('SELECT * FROM requests WHERE id=$1', [req.params.id]);
  if (!r) return res.status(404).json({ error: 'Not found' });
  const step = await one('SELECT * FROM request_steps WHERE request_id=$1 AND step_order=$2', [r.id, r.current_step]);
  if (!step || step.status !== 'Pending') return res.status(400).json({ error: 'No pending step to act on' });
  if (step.approver_role !== req.user.approver_role) return res.status(403).json({ error: 'This step is not assigned to your role' });
  if (action === 'approve' && !signature) return res.status(400).json({ error: 'Digital signature required to approve' });

  const total = (await one('SELECT COUNT(*)::int AS c FROM request_steps WHERE request_id=$1', [r.id])).c;

  if (action === 'approve') {
    await pool.query('UPDATE request_steps SET status=$1, acted_by=$2, comment=$3, signature=$4, acted_at=NOW() WHERE id=$5',
      ['Approved', req.user.id, comment, signature, step.id]);
    await logAudit(r.id, req.user, 'APPROVE', `Approved step ${step.step_order} (${step.label})`);
    if (step.step_order < total) {
      const next = step.step_order + 1;
      await pool.query('UPDATE request_steps SET status=$1 WHERE request_id=$2 AND step_order=$3', ['Pending', r.id, next]);
      await pool.query('UPDATE requests SET current_step=$1, status=$2, updated_at=NOW() WHERE id=$3', [next, 'In Progress', r.id]);
      const nextStep = await one('SELECT * FROM request_steps WHERE request_id=$1 AND step_order=$2', [r.id, next]);
      await notifyRole(nextStep.approver_role, r.id, `${r.doc_type} (${r.reference_no}) awaiting your approval`);
    } else {
      await pool.query('UPDATE requests SET status=$1, updated_at=NOW() WHERE id=$2', ['Approved', r.id]);
      await notify(r.requestor_id, r.id, `Your ${r.doc_type} (${r.reference_no}) has been fully approved`);
    }
  } else {
    const status = action === 'reject' ? 'Rejected' : 'Returned';
    await pool.query('UPDATE request_steps SET status=$1, acted_by=$2, comment=$3, acted_at=NOW() WHERE id=$4',
      [status, req.user.id, comment, step.id]);
    await pool.query('UPDATE requests SET status=$1, updated_at=NOW() WHERE id=$2', [status, r.id]);
    await logAudit(r.id, req.user, action.toUpperCase(), `${status} at step ${step.step_order}: ${comment}`);
    await notify(r.requestor_id, r.id, `Your ${r.doc_type} (${r.reference_no}) was ${status.toLowerCase()}`);
  }
  res.json({ ok: true });
}));

app.post('/api/requests/:id/resubmit', auth, wrap(async (req, res) => {
  const r = await one('SELECT * FROM requests WHERE id=$1', [req.params.id]);
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (r.requestor_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (r.status !== 'Returned') return res.status(400).json({ error: 'Only returned requests can be resubmitted' });
  const { title, details } = req.body || {};
  await pool.query("UPDATE requests SET title=COALESCE($1,title), details=COALESCE($2,details), status='In Progress', current_step=1, updated_at=NOW() WHERE id=$3",
    [title ?? null, details ?? null, r.id]);
  await pool.query("UPDATE request_steps SET status=CASE WHEN step_order=1 THEN 'Pending' ELSE 'Waiting' END, acted_by=NULL, comment=NULL, signature=NULL, acted_at=NULL WHERE request_id=$1", [r.id]);
  const first = await one('SELECT * FROM request_steps WHERE request_id=$1 AND step_order=1', [r.id]);
  await logAudit(r.id, req.user, 'RESUBMIT', 'Requestor resubmitted after revision');
  await notifyRole(first.approver_role, r.id, `${r.doc_type} (${r.reference_no}) resubmitted for approval`);
  res.json({ ok: true });
}));

// ---------- reports ----------
app.get('/api/reports/summary', auth, requireRole('admin', 'staff'), wrap(async (req, res) => {
  const byStatus = await q('SELECT status, COUNT(*)::int AS count FROM requests GROUP BY status');
  const byType = await q('SELECT doc_type, COUNT(*)::int AS count FROM requests GROUP BY doc_type ORDER BY count DESC');
  const total = (await one('SELECT COUNT(*)::int AS c FROM requests')).c;
  const pending = (await one("SELECT COUNT(*)::int AS c FROM requests WHERE status IN ('Pending','In Progress')")).c;
  const approved = (await one("SELECT COUNT(*)::int AS c FROM requests WHERE status='Approved'")).c;
  res.json({ total, pending, approved, byStatus, byType });
}));

// ---------- audit ----------
app.get('/api/audit', auth, requireRole('admin'), wrap(async (req, res) => {
  res.json(await q('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500'));
}));

// ---------- users ----------
app.get('/api/users', auth, requireRole('admin'), wrap(async (req, res) => {
  res.json(await q('SELECT id,name,email,role,approver_role,office,created_at FROM users ORDER BY role,name'));
}));
app.post('/api/users', auth, requireRole('admin'), wrap(async (req, res) => {
  const { name, email, password, role, approver_role = null, office = '' } = req.body || {};
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Missing fields' });
  if (await one('SELECT id FROM users WHERE email=$1', [email])) return res.status(409).json({ error: 'Email exists' });
  const u = await one('INSERT INTO users (name,email,password_hash,role,approver_role,office) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [name, email, bcrypt.hashSync(password, 10), role, approver_role, office]);
  await logAudit(null, req.user, 'CREATE_USER', `Created ${role} ${email}`);
  res.json({ id: u.id });
}));
app.patch('/api/users/:id', auth, requireRole('admin'), wrap(async (req, res) => {
  const { role, approver_role } = req.body || {};
  await pool.query('UPDATE users SET role=COALESCE($1,role), approver_role=$2 WHERE id=$3',
    [role ?? null, approver_role ?? null, req.params.id]);
  await logAudit(null, req.user, 'UPDATE_USER', `Updated user ${req.params.id}`);
  res.json({ ok: true });
}));

// ---------- notifications ----------
app.get('/api/notifications', auth, wrap(async (req, res) => {
  res.json(await q('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [req.user.id]));
}));
app.post('/api/notifications/:id/read', auth, wrap(async (req, res) => {
  await pool.query('UPDATE notifications SET is_read=1 WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'WAMS API' }));

init()
  .then(() => app.listen(PORT, () => console.log(`WAMS API running on http://localhost:${PORT}`)))
  .catch((e) => { console.error('Failed to initialize database:', e); process.exit(1); });
