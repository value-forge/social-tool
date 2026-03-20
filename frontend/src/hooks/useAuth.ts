import { useState, useEffect, useCallback } from 'react'
import type { User } from '../types/auth'
import { getCurrentUser, logout as apiLogout } from '../api/auth'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const isAuthenticated = !!localStorage.getItem('access_token')

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    getCurrentUser()
      .then(setUser)
      .catch(() => {
        localStorage.clear()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [isAuthenticated])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
    window.location.href = '/login'
  }, [])

  return { user, loading, isAuthenticated, logout }
}
