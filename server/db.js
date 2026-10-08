// db.js - PostgreSQL data layer for the Workflow and Approval Management System (WAMS).
// Production (Render, etc.): set DATABASE_URL and a real PostgreSQL database is used.
// Local development: if DATABASE_URL is not set, an in-memory Postgres (pg-mem) is used,
// so the app runs with a plain `npm install` and no database to configure.
const bcrypt = require('bcryptjs');

let pool;
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  const cs = process.env.DATABASE_URL;
  // Managed Postgres over the public internet (Neon, Render, etc.) requires SSL.
  // Railway's internal network host and localhost do NOT support SSL, so disable it there.
  const noSsl = /railway\.internal|localhost|127\.0\.0\.1/.test(cs);
  pool = new Pool({
    connectionString: cs,
    ssl: noSsl ? false : { rejectUnauthorized: false },
  });
  console.log(`Using PostgreSQL from DATABASE_URL (ssl: ${noSsl ? 'off' : 'on'})`);
} else {
  const { newDb } = require('pg-mem');
  const mem = newDb();
  const { Pool } = mem.adapters.createPg();
  pool = new Pool();
  console.log('No DATABASE_URL set - using in-memory database (data resets on restart)');
}

// A simple stored signature (SVG data URL) so seeded approvers can approve immediately.
// Real approvers draw theirs once in Account > Signature.
function seedSignature(name) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='70'>` +
    `<text x='8' y='46' font-family='Segoe Script, Brush Script MT, cursive' font-size='30' fill='#123c1a'>${name}</text>` +
    `<line x1='8' y1='56' x2='250' y2='56' stroke='#9bbfa6' stroke-width='1'/></svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      approver_role TEXT,
      office TEXT,
      category TEXT,
      signature TEXT,
      email_verified INTEGER DEFAULT 0,
      verify_token TEXT,
      verify_expires TIMESTAMPTZ,
      reset_token TEXT,
      reset_expires TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS workflows (
      id SERIAL PRIMARY KEY,
      doc_type TEXT NOT NULL UNIQUE,
      description TEXT,
      originating_group TEXT,
      active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS workflow_steps (
      id SERIAL PRIMARY KEY,
      workflow_id INTEGER NOT NULL,
      step_order INTEGER NOT NULL,
      approver_role TEXT NOT NULL,
      label TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS requests (
      id SERIAL PRIMARY KEY,
      reference_no TEXT NOT NULL UNIQUE,
      requestor_id INTEGER NOT NULL,
      requestor_category TEXT,
      workflow_id INTEGER,
      doc_type TEXT NOT NULL,
      title TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      current_step INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS request_steps (
      id SERIAL PRIMARY KEY,
      request_id INTEGER NOT NULL,
      step_order INTEGER NOT NULL,
      approver_role TEXT NOT NULL,
      label TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Waiting',
      acted_by INTEGER,
      comment TEXT,
      signature TEXT,
      acted_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      request_id INTEGER,
      actor_id INTEGER,
      actor_name TEXT,
      action TEXT NOT NULL,
      detail TEXT,
      ip_address TEXT,
      data TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      request_id INTEGER,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  // For databases created before password-reset was added, add the columns if missing.
  // (New in-memory DBs already have them from the CREATE TABLE above.)
  for (const col of ['reset_token TEXT', 'reset_expires TIMESTAMPTZ']) {
    try { await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col}`); } catch { /* older engine: ignore */ }
  }
  await seed();
}

async function seed() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM users');
  if (rows[0].n > 0) { console.log('Database already seeded.'); return; }

  const pw = bcrypt.hashSync('password123', 10);
  // [name, email, role, approver_role, office, category]
  const users = [
    ['System Administrator', 'admin@clsu.edu.ph', 'admin', null, 'MIS Office', null],
    ['Maria Santos (Faculty)', 'faculty@clsu.edu.ph', 'requestor', null, 'College of Engineering', 'Faculty'],
    ['Jose Ramos (Staff)', 'staffreq@clsu.edu.ph', 'requestor', null, 'General Services Office', 'Staff'],
    ['Ana Cruz (Student)', 'student@clsu.edu.ph', 'requestor', null, 'College of Engineering', 'Student'],
    ['Office Staff (Records)', 'staff@clsu.edu.ph', 'staff', null, 'Records Office', null],
    ['Engr. Dela Cruz (Supervisor)', 'supervisor@clsu.edu.ph', 'approver', 'supervisor', 'College of Engineering', null],
    ['Dr. Reyes (Department Head)', 'depthead@clsu.edu.ph', 'approver', 'dept_head', 'College of Engineering', null],
    ['HRMO Officer', 'hr@clsu.edu.ph', 'approver', 'hr_office', 'Human Resource Management Office', null],
    ['Dean Gonzales', 'dean@clsu.edu.ph', 'approver', 'dean', 'College of Engineering', null],
    ['Budget Officer', 'budget@clsu.edu.ph', 'approver', 'budget_office', 'Budget Office', null],
    ['Prof. Aquino (Instructor)', 'instructor@clsu.edu.ph', 'approver', 'instructor', 'College of Engineering', null],
    ['Registrar Staff', 'registrar@clsu.edu.ph', 'approver', 'registrar', 'Office of the Registrar', null],
    ['GSO Head', 'gso@clsu.edu.ph', 'approver', 'gso', 'General Services Office', null],
  ];
  for (const u of users) {
    const sig = u[2] === 'approver' ? seedSignature(u[0].replace(/\s*\(.*\)/, '')) : null;
    await pool.query(
      `INSERT INTO users (name,email,password_hash,role,approver_role,office,category,signature,email_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1)`,
      [u[0], u[1], pw, u[2], u[3], u[4], u[5], sig]
    );
  }

  // Workflows grouped by requestor category (Faculty / Student / Staff).
  const matrix = [
    // Faculty
    ['Leave Application', 'Employee application for leave of absence', 'Faculty',
      [['supervisor', 'Immediate Supervisor'], ['dept_head', 'Department Head'], ['hr_office', 'HRMO']]],
    ['Travel Authority', 'Request to travel on official business', 'Faculty',
      [['supervisor', 'Immediate Supervisor'], ['dept_head', 'Department Head'], ['dean', 'College Dean']]],
    ['Purchase Requisition', 'Request to procure goods or services', 'Faculty',
      [['dept_head', 'Department Head'], ['budget_office', 'Budget Office'], ['dean', 'College Dean']]],
    // Student
    ['Excuse Letter', 'Student excuse for absence', 'Student',
      [['instructor', 'Subject Instructor'], ['dept_head', 'Department Head']]],
    ['Certification / Clearance', 'Student request for certification or clearance', 'Student',
      [['registrar', 'Registrar Staff'], ['dept_head', 'Registrar Head']]],
    // Staff
    ['Staff Leave Application', 'Non-teaching staff leave of absence', 'Staff',
      [['supervisor', 'Immediate Supervisor'], ['hr_office', 'HRMO']]],
    ['Service / Maintenance Request', 'Request for facility service or maintenance', 'Staff',
      [['supervisor', 'Immediate Supervisor'], ['gso', 'General Services Office']]],
    ['Supplies Requisition', 'Staff request for office supplies', 'Staff',
      [['supervisor', 'Immediate Supervisor'], ['budget_office', 'Budget Office']]],
  ];
  for (const [type, desc, group, steps] of matrix) {
    const r = await pool.query(
      'INSERT INTO workflows (doc_type,description,originating_group) VALUES ($1,$2,$3) RETURNING id',
      [type, desc, group]
    );
    const wfId = r.rows[0].id;
    let i = 1;
    for (const [role, label] of steps) {
      await pool.query(
        'INSERT INTO workflow_steps (workflow_id,step_order,approver_role,label) VALUES ($1,$2,$3,$4)',
        [wfId, i++, role, label]
      );
    }
  }
  console.log('Seed complete. Demo logins use password: password123');
}

module.exports = { pool, init, seedSignature };
