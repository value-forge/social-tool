import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { UserMe } from '../types'
import { login as apiLogin } from '../api/auth'
import { getMe } from '../api/user'
import { queryClient } from '../lib/queryClient'

interface AuthContextValue {
  user: UserMe | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null)
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('token'),
  )
  const [loading, setLoading] = useState(!!localStorage.getItem('token'))

  // 初始化时：有 token 则调 GET /user/me 拉用户信息
  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    let cancelled = false
    getMe()
      .then((u) => {
        if (!cancelled) setUser(u)
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem('token')
          setToken(null)
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiLogin({ email, password })
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser({
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      avatar: '',
      twitter: null,
      settings: { dingtalkWebhook: '' },
      notifications: { dingtalk: false },
    })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    queryClient.clear()
    window.location.href = '/login'
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      loading,
      login,
      logout,
    }),
    [user, token, loading, login, logout],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
