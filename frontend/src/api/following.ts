import api from './auth'
import axios from 'axios'
import { getApiPrefix } from './apiPrefix'
import type {
  TwitterFollowingAccount,
  TwitterFollowingResponse,
  MonitoredStatusResponse,
} from '../types'

/** 获取 Twitter 关注列表（分页） */
export async function getTwitterFollowing(cursor?: string, limit?: number): Promise<TwitterFollowingResponse> {
  const { data } = await api.get<TwitterFollowingResponse>('/following', {
    params: { cursor, limit },
  })
  return data
}

/** 使用 bird-cli 获取关注列表（无需 JWT，直接指定用户名） */
export async function getBirdFollowing(
  username: string,
  count?: number
): Promise<{
  accounts: TwitterFollowingAccount[]
  source: string
  username: string
  fetched_at: string
}> {
  const { data } = await axios.get(`${getApiPrefix()}/bird/following`, {
    params: { username, count: count ?? 100 },
  })
  return data
}

/** 从关注列表批量加入监控 */
export async function addFollowingToMonitor(
  platformUserIds: string[]
): Promise<{
  added: number
  skipped: number
  failed: number
  accounts: Array<{ id: string; username: string; display_name: string; enabled: boolean }>
}> {
  const { data } = await api.post('/following/monitor', {
    platform_user_ids: platformUserIds,
  })
  return data
}

/** 批量检查监控状态 */
export async function checkMonitoredStatus(
  userId: string,
  usernames: string[]
): Promise<MonitoredStatusResponse> {
  const { data } = await api.post<MonitoredStatusResponse>('/monitored-accounts/check', {
    user_id: userId,
    usernames,
  })
  return data
}
