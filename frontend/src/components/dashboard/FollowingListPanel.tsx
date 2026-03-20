import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Alert, Avatar, Button, Spin, Table, Typography, theme as antTheme } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getTwitterFollowing, type TwitterFollowingAccount } from '../../api/twitter'

const { Text, Paragraph } = Typography

export default function FollowingListPanel() {
  const { token } = antTheme.useToken()

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    error,
    refetch,
    isError,
  } = useInfiniteQuery({
    queryKey: ['twitter-following'],
    queryFn: async ({ pageParam }) => getTwitterFollowing(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.next_cursor ? last.next_cursor : undefined),
  })

  const rows: TwitterFollowingAccount[] = useMemo(() => {
    if (!data?.pages?.length) return []
    return data.pages.flatMap((p) => p.accounts)
  }, [data])

  const columns: ColumnsType<TwitterFollowingAccount> = [
    {
      title: '用户',
      key: 'user',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar src={r.avatar_url} size={40}>
            {r.display_name?.[0] ?? '?'}
          </Avatar>
          <div>
            <Text strong style={{ color: token.colorText, display: 'block' }}>
              {r.display_name}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              @{r.username}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: '简介',
      dataIndex: 'bio',
      key: 'bio',
      ellipsis: true,
      render: (bio: string) => (
        <Paragraph ellipsis={{ rows: 2, expandable: false }} type="secondary" style={{ margin: 0, maxWidth: 360 }}>
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
      title: '操作',
      key: 'actions',
      width: 100,
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
        <Spin tip="正在从 X 拉取关注列表…" />
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
              常见原因：X 访问令牌过期（请退出后重新登录）、应用缺少 follows.read 权限、或 API 套餐限制。
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

  return (
    <div>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        共 {rows.length} 个账号（本页为分页加载，可点击下方加载更多）
      </Text>
      <Table<TwitterFollowingAccount>
        rowKey="platform_user_id"
        columns={columns}
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: '暂无关注数据（或当前账号未关注任何人）' }}
        style={{ background: token.colorBgContainer }}
      />
      {hasNextPage && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
            加载更多
          </Button>
        </div>
      )}
    </div>
  )
}
