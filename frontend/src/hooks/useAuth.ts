import { useState, useEffect, useCallback } from 'react'
import type { User } from '../types/auth'
import { getCurrentUser, logout as apiLogout } from '../api/auth'
import { queryClient } from '../lib/queryClient'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 用 token 字符串作依赖：仅 boolean 时，从账号 A 换到 B 仍为 true，不会重新拉 /auth/me
  const accessToken = localStorage.getItem('access_token') ?? ''
  const isAuthenticated = accessToken.length > 0

  useEffect(() => {
    if (!accessToken) {
      setUser(null)
      setLoading(false)
      return
    }
    setLoading(true)
    getCurrentUser()
      .then(setUser)
      .catch(() => {
        queryClient.clear()
        localStorage.clear()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [accessToken])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
    window.location.href = '/login'
  }, [])

  return { user, loading, isAuthenticated, logout }
}
