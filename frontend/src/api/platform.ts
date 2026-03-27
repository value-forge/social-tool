import api from './auth'
import type {
  PlatformInfo,
  PlatformConnection,
  PlatformConnectionStatus,
} from '../types'

/** 获取所有平台信息 */
export async function getPlatforms(): Promise<{ platforms: PlatformInfo[] }> {
  const { data } = await api.get('/platforms')
  return data
}

/** 获取用户已连接的平台列表 */
export async function getPlatformConnections(): Promise<{ connections: PlatformConnection[] }> {
  const { data } = await api.get('/platforms/connections')
  return data
}

/** 获取平台 OAuth URL */
export async function getPlatformOAuthURL(
  platform: string
): Promise<{ url: string; state: string }> {
  const { data } = await api.get(`/platforms/${platform}/oauth-url`)
  return data
}

/** 平台 OAuth 回调 */
export async function handlePlatformOAuthCallback(
  platform: string,
  code: string,
  state: string
): Promise<void> {
  await api.post(`/platforms/${platform}/oauth-callback`, { code, state })
}

/** 断开平台连接 */
export async function disconnectPlatform(platform: string): Promise<void> {
  await api.delete(`/platforms/${platform}/connection`)
}

/** 刷新平台 Token */
export async function refreshPlatformToken(platform: string): Promise<void> {
  await api.post(`/platforms/${platform}/refresh`)
}

/** 获取平台连接状态 */
export async function getPlatformStatus(
  platform: string
): Promise<{ status: PlatformConnectionStatus; error_message?: string }> {
  const { data } = await api.get(`/platforms/${platform}/status`)
  return data
}

/** 登记平台等待通知 */
export async function joinPlatformWaitlist(platform: string): Promise<void> {
  await api.post('/platforms/waitlist', { platform })
}
