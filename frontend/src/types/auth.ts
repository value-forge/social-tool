export interface User {
  id: string
  twitter_id: string
  twitter_username: string
  display_name: string
  avatar_url: string
  email?: string
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
}

export interface OAuthURLResponse {
  url: string
  state: string
  code_verifier: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user: User
}
