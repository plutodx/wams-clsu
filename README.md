# WAMS — Workflow and Approval Management System

A web-based workflow and approval management system for the administrative offices of
**Central Luzon State University (CLSU)**. Employees, faculty, and students submit
administrative requests online; the system routes each request through the correct
multi-level approval chain, captures digital signatures, tracks status in real time,
keeps a full audit trail, and reports on request volume and status.

This is the capstone system for *Design and Development of a Workflow and Approval
Management System for Administrative Offices of CLSU*.

## Features

- **Role-based access control** — requestor, office staff, approver, administrator.
- **Online request submission** — predefined document types plus custom requests.
- **Configurable approval routing** — a document type maps to an ordered chain of
  approver roles (the approval matrix). Requests advance, return, or reject automatically.
- **Digital signatures** — approvers sign on an HTML5 canvas at each approval step.
- **Real-time tracking** — a status timeline shows exactly where a request stands.
- **Audit trail** — every action (submit, approve, reject, return, resubmit) is logged.
- **In-app notifications** — users are alerted when a request needs their attention.
- **Reports & analytics** — request totals and breakdowns by status and document type.

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

## Demo accounts

All demo accounts use the password **`password123`**.

| Role | Email |
|------|-------|
| Administrator | admin@clsu.edu.ph |
| Requestor | requestor@clsu.edu.ph |
| Approver — Supervisor | supervisor@clsu.edu.ph |
| Approver — Department Head | depthead@clsu.edu.ph |
| Approver — HRMO | hr@clsu.edu.ph |
| Approver — Dean | dean@clsu.edu.ph |
| Approver — Budget Office | budget@clsu.edu.ph |

## Try the full flow

1. Log in as **requestor@clsu.edu.ph** and submit a *Leave Application*.
2. Log in as **supervisor@clsu.edu.ph**, open the request, sign, and approve.
3. Log in as **depthead@clsu.edu.ph**, then **hr@clsu.edu.ph**, approving each step.
4. Back as the requestor, watch the status become **Approved** with the full signed timeline.
5. Log in as **admin@clsu.edu.ph** to see reports, the audit trail, users, and workflow configuration.

## Seeded workflows (approval matrix)

| Document type | Approval chain |
|---------------|----------------|
| Leave Application | Immediate Supervisor → Department Head → HRMO |
| Travel Authority | Immediate Supervisor → Department Head → College Dean |
| Purchase Requisition | Department Head → Budget Office → College Dean |
| Excuse Letter | Subject Instructor → Department Head |
| Certification / Clearance | Registrar Staff → Registrar Head |

Administrators can add or reconfigure workflows from the Admin → Workflows tab.
