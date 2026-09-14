import { Routes, Route, Link, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth, ProtectedRoute } from './auth.jsx'
import { api } from './api.js'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Dashboard from './pages/Dashboard.jsx'
import SubmitRequest from './pages/SubmitRequest.jsx'
import RequestDetail from './pages/RequestDetail.jsx'
import ApproverQueue from './pages/ApproverQueue.jsx'
import Admin from './pages/Admin.jsx'
import Reports from './pages/Reports.jsx'
import Notifications from './pages/Notifications.jsx'

function Nav() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    if (!user) return
    let alive = true
    const load = () => api('/api/notifications')
      .then((n) => alive && setUnread(n.filter((x) => !x.is_read).length))
      .catch(() => {})
    load()
    const t = setInterval(load, 15000)
    return () => { alive = false; clearInterval(t) }
  }, [user])
  if (!user) return null
  return (
    <nav className="nav">
      <div className="brand">WAMS <small>CLSU Approval System</small></div>
      <NavLink to="/" end>Dashboard</NavLink>
      {user.role === 'requestor' && <NavLink to="/submit">New Request</NavLink>}
      {user.role === 'approver' && <NavLink to="/approvals">Approvals</NavLink>}
      {(user.role === 'admin' || user.role === 'staff') && <NavLink to="/reports">Reports</NavLink>}
      {user.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
      <NavLink to="/notifications">
        Notifications{unread > 0 && <span className="badge-count">{unread}</span>}
      </NavLink>
      <span className="spacer" />
      <span className="who">{user.name} &middot; {user.role}</span>
      <a href="#" onClick={(e) => { e.preventDefault(); logout(); nav('/login') }}>Logout</a>
    </nav>
  )
}

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/submit" element={<ProtectedRoute roles={['requestor']}><SubmitRequest /></ProtectedRoute>} />
        <Route path="/requests/:id" element={<ProtectedRoute><RequestDetail /></ProtectedRoute>} />
        <Route path="/approvals" element={<ProtectedRoute roles={['approver']}><ApproverQueue /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute roles={['admin', 'staff']}><Reports /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Admin /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      </Routes>
    </>
  )
}

export function StatusBadge({ status }) {
  const cls = (status || '').replace(/\s+/g, '')
  return <span className={`pill ${cls}`}>{status}</span>
}
