import { toast } from 'sonner'

/**
 * Typed API client. Replaces the old services/api.js.
 * - Attaches the JWT access token.
 * - Transparently refreshes on 401 and retries once.
 * - Throws ApiError on non-2xx so TanStack Query / try-catch can handle it.
 */

export const API_URL: string = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api'

export class ApiError extends Error {
  status: number
  data: unknown
  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

const getAccess = () => localStorage.getItem('access')
const getRefresh = () => localStorage.getItem('refresh')

let refreshPromise: Promise<string | null> | null = null

async function refreshAccess(): Promise<string | null> {
  // De-dupe concurrent refreshes.
  if (refreshPromise) return refreshPromise
  const refresh = getRefresh()
  if (!refresh) return null

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/accounts/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.access) {
        localStorage.setItem('access', data.access)
        return data.access as string
      }
      return null
    } catch {
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

function extractError(data: unknown, status: number): string {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    if (typeof d.error === 'string') return d.error
    if (typeof d.detail === 'string') return d.detail
    // DRF field errors -> first message
    for (const key of Object.keys(d)) {
      const v = d[key]
      if (Array.isArray(v) && typeof v[0] === 'string') return `${key}: ${v[0]}`
      if (typeof v === 'string') return v
    }
  }
  return `Request failed (${status})`
}

async function request<T = unknown>(
  method: string,
  endpoint: string,
  body: unknown = null,
  isFile = false,
): Promise<T> {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${API_URL}${path}`

  const buildHeaders = (token: string | null): HeadersInit => {
    const h: Record<string, string> = {}
    if (!isFile) h['Content-Type'] = 'application/json'
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
  }

  const send = (token: string | null) =>
    fetch(url, {
      method,
      headers: buildHeaders(token),
      body: isFile ? (body as BodyInit) : body ? JSON.stringify(body) : null,
    })

  let res = await send(getAccess())

  if (res.status === 401) {
    const newToken = await refreshAccess()
    if (!newToken) {
      localStorage.clear()
      if (!location.pathname.startsWith('/signin')) {
        toast.error('Session expired', { description: 'Please sign in again.' })
        setTimeout(() => (location.href = '/signin'), 600)
      }
      throw new ApiError('Session expired', 401)
    }
    res = await send(newToken)
  }

  // 204 / empty
  if (res.status === 204) return undefined as T

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new ApiError(extractError(data, res.status), res.status, data)
  }
  return data as T
}

export const apiGet = <T = unknown>(endpoint: string) => request<T>('GET', endpoint)
export const apiPost = <T = unknown>(endpoint: string, body: unknown = {}) => request<T>('POST', endpoint, body)
export const apiUpload = <T = unknown>(endpoint: string, formData: FormData) =>
  request<T>('POST', endpoint, formData, true)
