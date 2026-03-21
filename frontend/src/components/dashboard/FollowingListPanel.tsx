import { useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Alert, Avatar, Button, Spin, Table, Typography, Tag, message, theme as antTheme } from 'antd'
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getBirdFollowing, type TwitterFollowingAccount } from '../../api/twitter'
import { getApiPrefix } from '../../api/apiPrefix'

const { Text, Paragraph } = Typography

// 默认用户名，可通过环境变量配置
const DEFAULT_TWITTER_USERNAME = import.meta.env.VITE_TWITTER_USERNAME || '0xziheng'

// 用户ID（实际项目中应该从登录状态获取）
const DEFAULT_USER_ID = `default_${DEFAULT_TWITTER_USERNAME}`

interface MonitoredStatus {
  [username: string]: boolean
}

/** 批量检查监控状态 */
async function checkMonitoredStatus(usernames: string[]): Promise<MonitoredStatus> {
  const { data } = await axios.post(`${getApiPrefix()}/monitored-accounts/check`, {
    user_id: DEFAULT_USER_ID,
    usernames,
  })
  return data.status || {}
}

/** 添加监控账号 */
async function addMonitoredAccount(account: TwitterFollowingAccount): Promise<void> {
  await axios.post(`${getApiPrefix()}/monitored-accounts`, {
    user_id: DEFAULT_USER_ID,
    platform_user_id: account.platform_user_id,
    username: account.username,
    display_name: account.display_name,
    avatar_url: account.avatar_url,
    bio: account.bio,
    follower_count: account.follower_count,
    following_count: account.following_count,
    is_blue_verified: account.is_blue_verified,
  })
}

/** 移除监控账号 */
async function removeMonitoredAccount(username: string): Promise<void> {
  await axios.delete(`${getApiPrefix()}/monitored-accounts?user_id=${DEFAULT_USER_ID}&username=${username}`)
}

/** 使用 bird-cli 获取关注列表（无需 JWT 认证，直接读取 Chrome 登录态） */
export default function FollowingListPanel() {
  const { token } = antTheme.useToken()
  const queryClient = useQueryClient()
  const [monitoredStatus, setMonitoredStatus] = useState<MonitoredStatus>({})

  const {
    data,
    isLoading,
    error,
    refetch,
    isError,
  } = useQuery({
    queryKey: ['bird-following', DEFAULT_TWITTER_USERNAME],
    queryFn: () => getBirdFollowing(DEFAULT_TWITTER_USERNAME, 5),
    retry: 1,
  })

  const rows: TwitterFollowingAccount[] = useMemo(() => {
    return data?.accounts ?? []
  }, [data])

  // 批量查询监控状态
  useEffect(() => {
    if (rows.length > 0) {
      const usernames = rows.map(r => r.username)
      checkMonitoredStatus(usernames).then(status => {
        setMonitoredStatus(status)
      }).catch(() => {
        // 静默失败，不影响主功能
      })
    }
  }, [rows])

  // 添加监控 mutation
  const addMutation = useMutation({
    mutationFn: addMonitoredAccount,
    onSuccess: (_, account) => {
      message.success(`已将 @${account.username} 添加为监控账号`)
      setMonitoredStatus(prev => ({ ...prev, [account.username]: true }))
      // 刷新监控账号列表缓存
      queryClient.invalidateQueries({ queryKey: ['monitored-accounts'] })
    },
    onError: () => {
      message.error('添加监控失败')
    },
  })

  // 移除监控 mutation
  const removeMutation = useMutation({
    mutationFn: removeMonitoredAccount,
    onSuccess: (_, username) => {
      message.success(`已取消监控 @${username}`)
      setMonitoredStatus(prev => ({ ...prev, [username]: false }))
      queryClient.invalidateQueries({ queryKey: ['monitored-accounts'] })
    },
    onError: () => {
      message.error('取消监控失败')
    },
  })

  const handleToggleMonitor = (account: TwitterFollowingAccount) => {
    const isMonitored = monitoredStatus[account.username]
    if (isMonitored) {
      removeMutation.mutate(account.username)
    } else {
      addMutation.mutate(account)
    }
  }

  const columns: ColumnsType<TwitterFollowingAccount> = [
    {
      title: '头像',
      key: 'avatar',
      width: 70,
      render: (_, r) => (
        <Avatar src={r.avatar_url} size={48} style={{ border: '2px solid #e0e0e0' }}>
          {r.display_name?.[0] ?? '?'}
        </Avatar>
      ),
    },
    {
      title: '用户',
      key: 'user',
      render: (_, r) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text strong style={{ color: token.colorText, fontSize: 15 }}>
              {r.display_name}
            </Text>
            {r.is_blue_verified && (
              <span style={{ 
                color: '#1d9bf0', 
                fontSize: 16,
                display: 'inline-flex',
                alignItems: 'center'
              }} title="蓝V认证">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/>
                </svg>
              </span>
            )}
            {monitoredStatus[r.username] && (
              <Tag color="success" style={{ fontSize: 11, marginLeft: 4 }}>
                监控中
              </Tag>
            )}
          </div>
          <Text type="secondary" style={{ fontSize: 13 }}>
            @{r.username}
          </Text>
        </div>
      ),
    },
    {
      title: '简介',
      dataIndex: 'bio',
      key: 'bio',
      ellipsis: true,
      render: (bio: string) => (
        <Paragraph ellipsis={{ rows: 2, expandable: false }} type="secondary" style={{ margin: 0, maxWidth: 300 }}>
          {bio || '—'}
        </Paragraph>
      ),
    },
    {
      title: '粉丝',
      dataIndex: 'follower_count',
      key: 'followers',
      width: 90,
      render: (n: number) => <Text type="secondary">{n?.toLocaleString?.() ?? n ?? '—'}</Text>,
    },
    {
      title: '监控',
      key: 'monitor',
      width: 120,
      fixed: 'right',
      render: (_, r) => {
        const isMonitored = monitoredStatus[r.username]
        const isPending = addMutation.isPending && addMutation.variables?.username === r.username ||
                         removeMutation.isPending && removeMutation.variables === r.username
        return (
          <Button
            type={isMonitored ? 'default' : 'primary'}
            size="small"
            icon={isMonitored ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            loading={isPending}
            onClick={() => handleToggleMonitor(r)}
            style={{
              backgroundColor: isMonitored ? '#f6ffed' : undefined,
              borderColor: isMonitored ? '#b7eb8f' : undefined,
              color: isMonitored ? '#52c41a' : undefined,
            }}
          >
            {isMonitored ? '取消监控' : '添加监控'}
          </Button>
        )
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, r) => (
        <a href={`https://x.com/${r.username}`} target="_blank" rel="noreferrer">
          在 X 打开
        </a>
      ),
    },
  ]

  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin tip="正在从 X 拉取关注列表…（首次加载可能需要 10-20 秒）" />
      </div>
    )
  }

  if (isError && error) {
    let detail = '加载失败'
    if (axios.isAxiosError(error)) {
      const d = error.response?.data as { error?: string } | undefined
      detail = d?.error ?? error.message
    } else if (error instanceof Error) {
      detail = error.message
    }
    return (
      <Alert
        type="error"
        showIcon
        message="无法获取关注列表"
        description={
          <div>
            <Paragraph style={{ marginBottom: 8 }}>{String(detail)}</Paragraph>
            <Text type="secondary" style={{ fontSize: 12 }}>
              常见原因：bird-cli 未安装、Chrome 未登录 Twitter、或网络问题。
              <br />
              请确保：
              <br />1. 已运行: npm install -g bird-cli
              <br />2. Chrome 已登录 Twitter (https://x.com)
              <br />3. 后端服务已启动
            </Text>
            <div style={{ marginTop: 12 }}>
              <Button type="primary" onClick={() => refetch()}>
                重试
              </Button>
            </div>
          </div>
        }
      />
    )
  }

  const monitoredCount = Object.values(monitoredStatus).filter(Boolean).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text type="secondary">
          共 {rows.length} 个账号（通过 bird-cli 从 @{DEFAULT_TWITTER_USERNAME} 获取）
          {monitoredCount > 0 && (
            <Tag color="success" style={{ marginLeft: 8 }}>
              已监控 {monitoredCount} 个
            </Tag>
          )}
        </Text>
      </div>
      <Table<TwitterFollowingAccount>
        rowKey="platform_user_id"
        columns={columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 800 }}
        locale={{ emptyText: '暂无关注数据（或当前账号未关注任何人）' }}
        style={{ background: token.colorBgContainer }}
      />
    </div>
  )
}
