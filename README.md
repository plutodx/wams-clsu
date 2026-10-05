# WAMS — Workflow and Approval Management System

A web-based workflow and approval management system for the administrative offices of
**Central Luzon State University (CLSU)**. Employees, faculty, and students submit
administrative requests online; the system routes each request through the correct
multi-level approval chain, captures digital signatures, tracks status in real time,
keeps a full audit trail, and reports on request volume and status.

This is the capstone system for *Design and Development of a Workflow and Approval
Management System for Administrative Offices of CLSU*.

## Features

- **Email verification** — new accounts must verify their email before they can sign in.
  Real email is sent over SMTP when configured; otherwise the link is logged to the server
  console so the flow works during a local demo.
- **Requestor categories** — every requestor registers as **Student**, **Faculty**, or
  **Staff**, and only sees the request types that apply to their category.
- **Role-based access control** — requestor, office staff, approver, administrator.
- **Full workflow coverage** — separate approval matrices for Student, Faculty, and Staff.
- **Configurable approval routing** — a document type maps to an ordered chain of
  approver roles (the approval matrix). Requests advance, return, or reject automatically.
- **Fixed digital signatures** — each approver draws their signature once. It is then
  locked and applied automatically to every request they approve, so signatures stay
  consistent and cannot be re-drawn per request.
- **Real-time tracking** — a status timeline shows exactly where a request stands.
- **Audit trail** — every action (submit, approve, reject, return, resubmit) is logged.
- **In-app notifications** — users are alerted when a request needs their attention.
- **Reports & analytics with charts** — request totals plus bar-graph breakdowns by
  category, status, and document type on the dashboard.
- **CLSU branding** — CLSU logo in the top bar and CLSU green theme throughout.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Front-end | React 18 (Vite) + React Router |
| Back-end | Node.js + Express (REST API) |
| Database | PostgreSQL (online); in-memory Postgres for local dev |
| Auth | JWT + bcrypt password hashing |

> The capstone paper specifies React + PHP/Laravel + MySQL. This implementation keeps the
> React front-end and the same relational data model, using Node/Express + a SQL (PostgreSQL)
> database. For local development, if no `DATABASE_URL` is set the server uses a built-in
> in-memory database, so the project runs with a plain `npm install` and no database to
> configure. To deploy it online with saved data, see **DEPLOYMENT.md**.

## Project structure

```
capstone-system/
├── server/            Express REST API
│   ├── server.js      routes: auth, requests, approvals, reports, audit, users
│   ├── db.js          SQLite schema + seed (workflows, demo users)
│   └── package.json
└── client/            React (Vite) single-page app
    ├── src/pages/     Login, Dashboard, SubmitRequest, RequestDetail, ApproverQueue, Admin, Reports, Notifications
    ├── src/components/ SignaturePad
    └── package.json
```

## Running it locally

You need **Node.js 18 or newer**.

Open two terminals.

**Terminal 1 — API server**
```bash
cd server
npm install
npm run dev        # starts http://localhost:4000  (auto-seeds the database on first run)
```

**Terminal 2 — React client**
```bash
cd client
npm install
npm run dev        # starts http://localhost:5173
```

Open **http://localhost:5173** in your browser.

## Email verification (SMTP)

The server sends verification emails when SMTP is configured. Set these environment
variables before starting the server (a Gmail account with an **App Password** works):

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=WAMS <your@gmail.com>
CLIENT_URL=http://localhost:5173      # base URL used in the verification link
```

If SMTP is **not** set, the app still runs: the verification link is printed to the
server console (look for `[EMAIL VERIFICATION - ...]`) so you can copy it into the browser.
Seeded demo accounts are pre-verified, so you can sign in with them right away.

## Demo accounts

All demo accounts use the password **`password123`** and are already verified.

| Role | Email |
|------|-------|
| Administrator | admin@clsu.edu.ph |
| Requestor — Faculty | faculty@clsu.edu.ph |
| Requestor — Staff | staffreq@clsu.edu.ph |
| Requestor — Student | student@clsu.edu.ph |
| Office Staff | staff@clsu.edu.ph |
| Approver — Supervisor | supervisor@clsu.edu.ph |
| Approver — Department Head | depthead@clsu.edu.ph |
| Approver — HRMO | hr@clsu.edu.ph |
| Approver — Dean | dean@clsu.edu.ph |
| Approver — Budget Office | budget@clsu.edu.ph |
| Approver — Instructor | instructor@clsu.edu.ph |
| Approver — Registrar | registrar@clsu.edu.ph |
| Approver — GSO Head | gso@clsu.edu.ph |

## Try the full flow

1. (Optional) Register a new account and verify it via the emailed / console link.
2. Log in as **faculty@clsu.edu.ph** and submit a *Leave Application*.
3. Log in as **supervisor@clsu.edu.ph**. If you have not set a signature yet, go to
   **Signature** and draw it once (it is then locked). Open the request and approve —
   your fixed signature is attached automatically.
4. Continue as **depthead@clsu.edu.ph**, then **hr@clsu.edu.ph**, approving each step.
5. Back as the requestor, watch the status become **Approved** with the full signed timeline.
6. Log in as **admin@clsu.edu.ph** for the dashboard charts, reports, audit trail, users,
   and workflow configuration.

## Seeded workflows (approval matrix)

| Category | Document type | Approval chain |
|----------|---------------|----------------|
| Faculty | Leave Application | Immediate Supervisor → Department Head → HRMO |
| Faculty | Travel Authority | Immediate Supervisor → Department Head → College Dean |
| Faculty | Purchase Requisition | Department Head → Budget Office → College Dean |
| Student | Excuse Letter | Subject Instructor → Department Head |
| Student | Certification / Clearance | Registrar Staff → Registrar Head |
| Staff | Staff Leave Application | Immediate Supervisor → HRMO |
| Staff | Service / Maintenance Request | Immediate Supervisor → General Services Office |
| Staff | Supplies Requisition | Immediate Supervisor → Budget Office |

Administrators can add or reconfigure workflows from the Admin → Workflows tab.
