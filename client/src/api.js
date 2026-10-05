// Small fetch wrapper that attaches the JWT and parses JSON / errors.
import { mockApi } from './mock.js'

const TOKEN_KEY = 'wams_token'

// Standalone demo build (VITE_DEMO=true): the whole app runs in the browser with
// sample data, no backend needed. Used for the Netlify drag-and-drop deployment.
const DEMO = import.meta.env.VITE_DEMO === 'true'

// In production (Netlify) set VITE_API_URL to the deployed backend URL (e.g. https://wams-api.onrender.com).
// Left empty locally so requests use the Vite dev proxy.
const BASE = import.meta.env.VITE_API_URL || ''

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export async function api(path, { method = 'GET', body } = {}) {
  if (DEMO) return mockApi(path, { method, body })
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}
