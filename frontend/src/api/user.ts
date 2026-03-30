import type { ApiResponse, UserMe } from '../types'
import client from './client'

export async function getMe(): Promise<UserMe> {
  const res = await client.get<ApiResponse<UserMe>>('/user/me')
  return res.data.data
}
