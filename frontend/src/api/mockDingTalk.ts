// 钉钉配置相关的 Mock API
import type { NotifyChannel, NotifyEventType } from '../types'

// 模拟存储
let mockDingTalkChannels: NotifyChannel[] = [
  {
    id: 'ding_001',
    type: 'dingtalk',
    name: '运营一群',
    webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=***a1b2',
    enabled: true,
    notify_events: ['new_post', 'draft_ready'],
    created_at: '2026-03-15T10:00:00Z',
  },
  {
    id: 'ding_002',
    type: 'dingtalk',
    name: '产品通知群',
    webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=***c3d4',
    enabled: false,
    notify_events: ['trending', 'feed_summary'],
    created_at: '2026-03-18T14:30:00Z',
  },
]

// 延迟模拟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** 获取钉钉配置列表 */
export async function getDingTalkChannels(_userId: string): Promise<{
  channels: NotifyChannel[]
}> {
  await delay(500)
  return {
    channels: mockDingTalkChannels.filter((ch) => ch.type === 'dingtalk'),
  }
}

/** 添加钉钉配置 */
export async function addDingTalkChannel(
  _userId: string,
  config: {
    name: string
    webhook_url: string
    secret?: string
    notify_events: NotifyEventType[]
    enabled?: boolean
  }
): Promise<NotifyChannel> {
  await delay(800)

  // 检查名称是否已存在
  const exists = mockDingTalkChannels.find(
    (ch) => ch.name === config.name && ch.type === 'dingtalk'
  )
  if (exists) {
    throw new Error('配置名称已存在')
  }

  const newChannel: NotifyChannel = {
    id: `ding_${Date.now()}`,
    type: 'dingtalk',
    name: config.name,
    webhook_url: maskWebhookUrl(config.webhook_url),
    enabled: config.enabled ?? true,
    notify_events: config.notify_events,
    created_at: new Date().toISOString(),
  }

  mockDingTalkChannels.push(newChannel)
  return newChannel
}

/** 更新钉钉配置 */
export async function updateDingTalkChannel(
  id: string,
  updates: Partial<{
    name: string
    webhook_url: string
    secret: string
    notify_events: NotifyEventType[]
    enabled: boolean
  }>
): Promise<NotifyChannel> {
  await delay(600)

  const index = mockDingTalkChannels.findIndex((ch) => ch.id === id)
  if (index === -1) {
    throw new Error('配置不存在')
  }

  // 如果更新名称，检查是否与其他配置冲突
  if (updates.name && updates.name !== mockDingTalkChannels[index].name) {
    const exists = mockDingTalkChannels.find(
      (ch) => ch.name === updates.name && ch.id !== id && ch.type === 'dingtalk'
    )
    if (exists) {
      throw new Error('配置名称已存在')
    }
  }

  mockDingTalkChannels[index] = {
    ...mockDingTalkChannels[index],
    ...updates,
    webhook_url: updates.webhook_url
      ? maskWebhookUrl(updates.webhook_url)
      : mockDingTalkChannels[index].webhook_url,
  }

  return mockDingTalkChannels[index]
}

/** 删除钉钉配置 */
export async function deleteDingTalkChannel(id: string): Promise<void> {
  await delay(400)
  const index = mockDingTalkChannels.findIndex((ch) => ch.id === id)
  if (index === -1) {
    throw new Error('配置不存在')
  }
  mockDingTalkChannels.splice(index, 1)
}

/** 启用/禁用钉钉配置 */
export async function toggleDingTalkChannel(
  id: string
): Promise<{ id: string; enabled: boolean }> {
  await delay(300)

  const channel = mockDingTalkChannels.find((ch) => ch.id === id)
  if (!channel) {
    throw new Error('配置不存在')
  }

  channel.enabled = !channel.enabled
  return { id, enabled: channel.enabled }
}

/** 发送测试消息 */
export async function testDingTalkChannel(
  id: string
): Promise<{ success: boolean; message: string }> {
  await delay(1500)

  const channel = mockDingTalkChannels.find((ch) => ch.id === id)
  if (!channel) {
    throw new Error('配置不存在')
  }

  if (!channel.enabled) {
    return {
      success: false,
      message: '配置已禁用，无法发送测试消息',
    }
  }

  // 模拟 90% 成功率
  const success = Math.random() > 0.1
  return {
    success,
    message: success
      ? '测试消息已发送，请检查钉钉群'
      : '发送失败，请检查 Webhook 地址和密钥是否正确',
  }
}

/** 脱敏处理 Webhook URL */
function maskWebhookUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const token = urlObj.searchParams.get('access_token')
    if (token && token.length > 8) {
      urlObj.searchParams.set(
        'access_token',
        token.slice(0, 4) + '***' + token.slice(-4)
      )
    }
    return urlObj.toString()
  } catch {
    return url
  }
}

/** 重置 Mock 数据（用于测试） */
export function resetDingTalkMockData(): void {
  mockDingTalkChannels = [
    {
      id: 'ding_001',
      type: 'dingtalk',
      name: '运营一群',
      webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=***a1b2',
      enabled: true,
      notify_events: ['new_post', 'draft_ready'],
      created_at: '2026-03-15T10:00:00Z',
    },
    {
      id: 'ding_002',
      type: 'dingtalk',
      name: '产品通知群',
      webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=***c3d4',
      enabled: false,
      notify_events: ['trending', 'feed_summary'],
      created_at: '2026-03-18T14:30:00Z',
    },
  ]
}
