import axios from 'axios'
import type { OAuthURLResponse, LoginResponse, User } from '../types/auth'
import { queryClient } from '../lib/queryClient'
import { getApiPrefix } from './apiPrefix'

const api = axios.create({
  baseURL: getApiPrefix(),
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
          const { data } = await axios.post(
            `${getApiPrefix()}/auth/refresh`,
            { refresh_token: refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          )
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          error.config.headers.Authorization = `Bearer ${data.access_token}`
          return axios(error.config)
        } catch {
          queryClient.clear()
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

/** @param quick 为 true 时不强制 prompt=login，可能仍沿用浏览器当前 X 会话（少输密码，换账号时勿用） */
export async function getTwitterOAuthURL(quick?: boolean): Promise<OAuthURLResponse> {
  const { data } = await api.get<OAuthURLResponse>('/auth/twitter/url', {
    params: quick ? { quick: '1' } : {},
  })
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
  queryClient.clear()
  localStorage.clear()
}

export default api
