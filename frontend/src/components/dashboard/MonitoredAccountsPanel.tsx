import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Alert, Avatar, Button, Spin, Table, Typography, Tag, Empty, Popconfirm, message, theme as antTheme } from 'antd'
import { EyeInvisibleOutlined, SyncOutlined, UserOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getApiPrefix } from '../../api/apiPrefix'

const { Text, Paragraph } = Typography

// 用户ID（实际项目中应该从登录状态获取）
const DEFAULT_TWITTER_USERNAME = import.meta.env.VITE_TWITTER_USERNAME || '0xziheng'
const DEFAULT_USER_ID = `default_${DEFAULT_TWITTER_USERNAME}`

interface MonitoredAccount {
  id: string
  platform_user_id: string
  username: string
  display_name: string
  avatar_url: string
  bio: string
  follower_count: number
  following_count: number
  is_blue_verified: boolean
  enabled: boolean
  created_at: string
}

/** 获取监控账号列表 */
async function getMonitoredAccounts(): Promise<{ accounts: MonitoredAccount[]; total: number }> {
  const { data } = await axios.get(`${getApiPrefix()}/monitored-accounts?user_id=${DEFAULT_USER_ID}`)
  return data
}

/** 移除监控账号 */
async function removeMonitoredAccount(username: string): Promise<void> {
  await axios.delete(`${getApiPrefix()}/monitored-accounts?user_id=${DEFAULT_USER_ID}&username=${username}`)
}

export default function MonitoredAccountsPanel() {
  const { token } = antTheme.useToken()
  const queryClient = useQueryClient()

  const {
    data,
    isLoading,
    error,
    refetch,
    isError,
  } = useQuery({
    queryKey: ['monitored-accounts', DEFAULT_USER_ID],
    queryFn: getMonitoredAccounts,
    retry: 1,
  })

  const rows: MonitoredAccount[] = useMemo(() => {
    return data?.accounts ?? []
  }, [data])

  // 移除监控 mutation
  const removeMutation = useMutation({
    mutationFn: removeMonitoredAccount,
    onSuccess: (_, username) => {
      message.success(`已取消监控 @${username}`)
      // 刷新监控账号列表
      queryClient.invalidateQueries({ queryKey: ['monitored-accounts'] })
      // 同时刷新关注列表的监控状态
      queryClient.invalidateQueries({ queryKey: ['bird-following'] })
    },
    onError: () => {
      message.error('取消监控失败')
    },
  })

  const columns: ColumnsType<MonitoredAccount> = [
    {
      title: '头像',
      key: 'avatar',
      width: 80,
      render: (_, r) => (
        <Avatar 
          src={r.avatar_url} 
          size={50} 
          style={{ border: '2px solid #e0e0e0' }}
          icon={<UserOutlined />}
        >
          {r.display_name?.[0] ?? '?'}
        </Avatar>
      ),
    },
    {
      title: '用户信息',
      key: 'user',
      render: (_, r) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text strong style={{ color: token.colorText, fontSize: 16 }}>
              {r.display_name}
            </Text>
            {r.is_blue_verified && (
              <span 
                style={{ 
                  color: '#1d9bf0', 
                  fontSize: 16,
                  display: 'inline-flex',
                  alignItems: 'center'
                }} 
                title="蓝V认证"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/>
                </svg>
              </span>
            )}
            {r.enabled ? (
              <Tag color="success" style={{ fontSize: 11 }}>监控中</Tag>
            ) : (
              <Tag color="default" style={{ fontSize: 11 }}>已暂停</Tag>
            )}
          </div>
          <Text type="secondary" style={{ fontSize: 14 }}>
            @{r.username}
          </Text>
          <Paragraph 
            ellipsis={{ rows: 2, expandable: false }} 
            type="secondary" 
            style={{ margin: 0, marginTop: 4, maxWidth: 400, fontSize: 13 }}
          >
            {r.bio || '暂无简介'}
          </Paragraph>
        </div>
      ),
    },
    {
      title: '粉丝',
      dataIndex: 'follower_count',
      key: 'followers',
      width: 100,
      sorter: (a, b) => a.follower_count - b.follower_count,
      render: (n: number) => (
        <Text strong style={{ color: token.colorText }}>
          {n?.toLocaleString?.() ?? n ?? '—'}
        </Text>
      ),
    },
    {
      title: '关注',
      dataIndex: 'following_count',
      key: 'following',
      width: 100,
      sorter: (a, b) => a.following_count - b.following_count,
      render: (n: number) => (
        <Text type="secondary">
          {n?.toLocaleString?.() ?? n ?? '—'}
        </Text>
      ),
    },
    {
      title: '添加时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {date ? new Date(date).toLocaleDateString('zh-CN') : '—'}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            type="link"
            size="small"
            href={`https://x.com/${r.username}`}
            target="_blank"
            rel="noreferrer"
          >
            查看
          </Button>
          <Popconfirm
            title={`取消监控 @${r.username}？`}
            description="取消后将不再追踪该账号的新推文"
            onConfirm={() => removeMutation.mutate(r.username)}
            okText="确认"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<EyeInvisibleOutlined />}
              loading={removeMutation.isPending && removeMutation.variables === r.username}
            >
              取消
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ]

  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin tip="正在加载监控账号列表…" />
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
        message="无法获取监控账号列表"
        description={
          <div>
            <Paragraph style={{ marginBottom: 8 }}>{String(detail)}</Paragraph>
            <Button type="primary" onClick={() => refetch()}>
              重试
            </Button>
          </div>
        }
      />
    )
  }

  if (rows.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              暂无监控账号
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              前往「监控 → 关注列表」选择要监控的账号
            </Text>
          </div>
        }
      />
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text type="secondary">
          共监控 <Text strong>{rows.length}</Text> 个账号
          <Text type="secondary" style={{ marginLeft: 16, fontSize: 12 }}>
            系统将自动追踪这些账号的新推文
          </Text>
        </Text>
        <Button 
          icon={<SyncOutlined />} 
          onClick={() => refetch()}
          loading={isLoading}
        >
          刷新
        </Button>
      </div>
      <Table<MonitoredAccount>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 900 }}
        style={{ background: token.colorBgContainer }}
      />
    </div>
  )
}
