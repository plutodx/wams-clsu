// db.js - PostgreSQL data layer for the Workflow and Approval Management System (WAMS).
// Production (Render, etc.): set DATABASE_URL and a real PostgreSQL database is used.
// Local development: if DATABASE_URL is not set, an in-memory Postgres (pg-mem) is used,
// so the app runs with a plain `npm install` and no database to configure.
const bcrypt = require('bcryptjs');

let pool;
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // required by most hosted Postgres (Render, etc.)
  });
  console.log('Using PostgreSQL from DATABASE_URL');
} else {
  const { newDb } = require('pg-mem');
  const mem = newDb();
  const { Pool } = mem.adapters.createPg();
  pool = new Pool();
  console.log('No DATABASE_URL set - using in-memory database (data resets on restart)');
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
  await seed();
}

async function seed() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM users');
  if (rows[0].n > 0) { console.log('Database already seeded.'); return; }

  const pw = bcrypt.hashSync('password123', 10);
  const users = [
    ['System Administrator', 'admin@clsu.edu.ph', 'admin', null, 'MIS Office'],
    ['Maria Santos (Requestor)', 'requestor@clsu.edu.ph', 'requestor', null, 'College of Engineering'],
    ['Office Staff', 'staff@clsu.edu.ph', 'staff', null, 'Records Office'],
    ['Engr. Dela Cruz (Supervisor)', 'supervisor@clsu.edu.ph', 'approver', 'supervisor', 'College of Engineering'],
    ['Dr. Reyes (Department Head)', 'depthead@clsu.edu.ph', 'approver', 'dept_head', 'College of Engineering'],
    ['HRMO Officer', 'hr@clsu.edu.ph', 'approver', 'hr_office', 'Human Resource Management Office'],
    ['Dean Gonzales', 'dean@clsu.edu.ph', 'approver', 'dean', 'College of Engineering'],
    ['Budget Officer', 'budget@clsu.edu.ph', 'approver', 'budget_office', 'Budget Office'],
    ['Prof. Aquino (Instructor)', 'instructor@clsu.edu.ph', 'approver', 'instructor', 'College of Engineering'],
    ['Registrar Staff', 'registrar@clsu.edu.ph', 'approver', 'registrar', 'Office of the Registrar'],
  ];
  for (const u of users) {
    await pool.query(
      'INSERT INTO users (name,email,password_hash,role,approver_role,office) VALUES ($1,$2,$3,$4,$5,$6)',
      [u[0], u[1], pw, u[2], u[3], u[4]]
    );
  }

  const matrix = [
    ['Leave Application', 'Employee application for leave of absence', 'Faculty / Employee',
      [['supervisor', 'Immediate Supervisor'], ['dept_head', 'Department Head'], ['hr_office', 'HRMO']]],
    ['Travel Authority', 'Request to travel on official business', 'Faculty / Employee',
      [['supervisor', 'Immediate Supervisor'], ['dept_head', 'Department Head'], ['dean', 'College Dean']]],
    ['Purchase Requisition', 'Request to procure goods or services', 'Faculty / Employee',
      [['dept_head', 'Department Head'], ['budget_office', 'Budget Office'], ['dean', 'College Dean']]],
    ['Excuse Letter', 'Student excuse for absence', 'Student',
      [['instructor', 'Subject Instructor'], ['dept_head', 'Department Head']]],
    ['Certification / Clearance', 'Student request for certification or clearance', 'Student',
      [['registrar', 'Registrar Staff'], ['dept_head', 'Registrar Head']]],
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

module.exports = { pool, init };
