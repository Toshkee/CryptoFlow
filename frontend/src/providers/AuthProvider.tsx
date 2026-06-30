import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (access: string, refresh: string) => Promise<User | null>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser)
  const [loading, setLoading] = useState(false)

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem('access')) return
    try {
      const fresh = await apiGet<User>('/accounts/me/')
      setUser(fresh)
      localStorage.setItem('user', JSON.stringify(fresh))
    } catch {
      /* token invalid — handled by api client */
    }
  }, [])

  const login = useCallback(async (access: string, refresh: string) => {
    localStorage.setItem('access', access)
    localStorage.setItem('refresh', refresh)
    setLoading(true)
    try {
      const fresh = await apiGet<User>('/accounts/me/')
      setUser(fresh)
      localStorage.setItem('user', JSON.stringify(fresh))
      return fresh
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem('refresh')
    if (refresh) {
      try {
        await apiPost('/accounts/logout/', { refresh })
      } catch {
        /* ignore */
      }
    }
    localStorage.clear()
    setUser(null)
  }, [])

  // Keep the cached user fresh on first mount (e.g. new profile picture).
  useEffect(() => {
    refreshUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>{children}</AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
