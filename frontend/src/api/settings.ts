import api from './auth'
import type {
  UserSettings,
  NotifyChannelTypeInfo,
  NotifyChannel,
  NotifyChannelType,
  NotifyEventType,
  NotifyLog,
} from '../types'

/** 获取用户设置 */
export async function getSettings(userId: string): Promise<UserSettings> {
  const { data } = await api.get<UserSettings>('/settings', {
    params: { user_id: userId },
  })
  return data
}

/** 更新用户设置 */
export async function updateSettings(
  userId: string,
  settings: Partial<Omit<UserSettings, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  await api.put('/settings', { user_id: userId, ...settings })
}

/** 获取可用推送通道类型 */
export async function getNotifyChannelTypes(): Promise<{
  types: NotifyChannelTypeInfo[]
}> {
  const { data } = await api.get('/settings/notify-channels')
  return data
}

/** 获取用户推送通道列表 */
export async function getNotifyChannels(userId: string): Promise<{
  channels: NotifyChannel[]
}> {
  const { data } = await api.get('/settings/notify-channels/list', {
    params: { user_id: userId },
  })
  return data
}

/** 添加推送通道 */
export async function addNotifyChannel(
  userId: string,
  channel: {
    type: NotifyChannelType
    name: string
    webhook_url: string
    secret?: string
    notify_events: NotifyEventType[]
    enabled: boolean
  }
): Promise<NotifyChannel> {
  const { data } = await api.post<NotifyChannel>('/settings/notify-channels', {
    user_id: userId,
    ...channel,
  })
  return data
}

/** 更新推送通道 */
export async function updateNotifyChannel(
  id: string,
  updates: Partial<{
    name: string
    webhook_url: string
    secret: string
    notify_events: NotifyEventType[]
    enabled: boolean
  }>
): Promise<void> {
  await api.put(`/settings/notify-channels/${id}`, updates)
}

/** 删除推送通道 */
export async function deleteNotifyChannel(id: string): Promise<void> {
  await api.delete(`/settings/notify-channels/${id}`)
}

/** 启用/禁用推送通道 */
export async function toggleNotifyChannel(
  id: string
): Promise<{ id: string; enabled: boolean }> {
  const { data } = await api.patch(`/settings/notify-channels/${id}/toggle`)
  return data
}

/** 发送测试消息 */
export async function testNotifyChannel(
  id: string
): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post(`/settings/notify-channels/${id}/test`)
  return data
}

/** 获取推送记录 */
export async function getNotifyLogs(
  userId: string,
  params?: {
    channel_type?: string
    status?: 'success' | 'failed'
    page?: number
    page_size?: number
  }
): Promise<{ logs: NotifyLog[]; total: number }> {
  const { data } = await api.get('/settings/notify-logs', {
    params: { user_id: userId, ...params },
  })
  return data
}
