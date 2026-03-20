import axios from 'axios'
import type { OAuthURLResponse, LoginResponse, User } from '../types/auth'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh', { refresh_token: refreshToken })
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          error.config.headers.Authorization = `Bearer ${data.access_token}`
          return axios(error.config)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export async function getTwitterOAuthURL(): Promise<OAuthURLResponse> {
  const { data } = await api.get<OAuthURLResponse>('/auth/twitter/url')
  return data
}

export async function twitterCallback(code: string, state: string, codeVerifier: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/twitter/callback', {
    code,
    state,
    code_verifier: codeVerifier,
  })
  return data
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await api.get<{ user: User }>('/auth/me')
  return data.user
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
  localStorage.clear()
}

export default api
