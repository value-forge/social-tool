import api from './auth'
import type {
  MonitoredAccount,
  MonitoredAccountListResponse,
  TwitterFollowingAccount,
} from '../types'

interface GetMonitoredAccountsParams {
  user_id: string
  platform?: string
  tag?: string
  enabled?: boolean
  page?: number
  page_size?: number
}

/** 获取监控账号列表 */
export async function getMonitoredAccounts(
  params: GetMonitoredAccountsParams
): Promise<MonitoredAccountListResponse> {
  const { data } = await api.get<MonitoredAccountListResponse>('/monitored-accounts', {
    params,
  })
  return data
}

/** 添加监控账号 */
export async function addMonitoredAccount(
  userId: string,
  account: Partial<TwitterFollowingAccount> & {
    platform?: string
    reply_prompt?: string
    reply_tone?: string
    tags?: string[]
  }
): Promise<{
  id: string
  platform_user_id: string
  username: string
  display_name: string
  enabled: boolean
  created_at: string
}> {
  const { data } = await api.post('/monitored-accounts', {
    user_id: userId,
    platform: account.platform ?? 'twitter',
    platform_user_id: account.platform_user_id,
    username: account.username,
    display_name: account.display_name,
    avatar_url: account.avatar_url,
    bio: account.bio,
    follower_count: account.follower_count,
    following_count: account.following_count,
    is_blue_verified: account.is_blue_verified,
    reply_prompt: account.reply_prompt,
    reply_tone: account.reply_tone,
    tags: account.tags,
  })
  return data
}

/** 批量添加监控账号 */
export async function batchAddMonitoredAccounts(
  userId: string,
  accounts: Array<Partial<TwitterFollowingAccount> & { platform?: string }>
): Promise<void> {
  await api.post('/monitored-accounts/batch', {
    user_id: userId,
    accounts: accounts.map((a) => ({
      platform: a.platform ?? 'twitter',
      platform_user_id: a.platform_user_id,
      username: a.username,
      display_name: a.display_name,
      avatar_url: a.avatar_url,
      bio: a.bio,
      follower_count: a.follower_count,
      following_count: a.following_count,
      is_blue_verified: a.is_blue_verified,
    })),
  })
}

/** 获取监控账号详情 */
export async function getMonitoredAccountDetail(
  id: string
): Promise<MonitoredAccount> {
  const { data } = await api.get<MonitoredAccount>(`/monitored-accounts/${id}`)
  return data
}

/** 更新监控账号配置 */
export async function updateMonitoredAccount(
  id: string,
  updates: {
    enabled?: boolean
    reply_prompt?: string
    reply_tone?: string
    tags?: string[]
  }
): Promise<void> {
  await api.put(`/monitored-accounts/${id}`, updates)
}

/** 删除监控账号 */
export async function removeMonitoredAccount(
  userId: string,
  username: string
): Promise<void> {
  await api.delete('/monitored-accounts', {
    params: { user_id: userId, username },
  })
}
