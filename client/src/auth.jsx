import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api, getToken, setToken, clearToken } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) { setLoading(false); return }
    api('/api/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const d = await api('/api/auth/login', { method: 'POST', body: { email, password } })
    setToken(d.token); setUser(d.user); return d.user
  }
  // Registration no longer signs the user in. It creates an unverified account and
  // triggers a verification email; the user signs in only after verifying.
  const register = async (payload) => {
    return api('/api/auth/register', { method: 'POST', body: payload })
  }
  const refreshUser = async () => {
    const d = await api('/api/auth/me'); setUser(d.user); return d.user
  }
  const logout = async () => {
    try { await api('/api/auth/logout', { method: 'POST' }) } catch (e) { /* ignore */ }
    clearToken(); setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

export function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="center muted">Loading...</div>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}
