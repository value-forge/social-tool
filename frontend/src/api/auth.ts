import type { ApiResponse, LoginData, LoginRequest } from '../types'
import client from './client'

export async function login(req: LoginRequest): Promise<LoginData> {
  const res = await client.post<ApiResponse<LoginData>>('/auth/login', req)
  return res.data.data
}
