import { useMemo, useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { 
  Alert, Avatar, Button, Spin, Typography, Tag, Empty, Card, Divider, 
  Space, Tooltip, Collapse, message, theme as antTheme 
} from 'antd'
import { 
  HeartOutlined, RetweetOutlined, MessageOutlined, EyeOutlined,
  SyncOutlined, UserOutlined, ClockCircleOutlined, LinkOutlined
} from '@ant-design/icons'
import { getApiPrefix } from '../../api/apiPrefix'

const { Text, Paragraph } = Typography
const { Panel } = Collapse

// 与监控账号、推文入库使用的 user_id 一致；可由父组件传入登录用户的 id（Mongo hex）
const DEFAULT_TWITTER_USERNAME = import.meta.env.VITE_TWITTER_USERNAME || '0xziheng'
const DEFAULT_USER_ID = `default_${DEFAULT_TWITTER_USERNAME}`

interface Tweet {
  id: string
  platform_post_id: string
  author_username: string
  author_display_name: string
  author_avatar_url: string
  author_is_blue_verified?: boolean
  content: string
  media_urls: string[]
  post_url: string
  published_at: string
  like_count: number
  repost_count: number
  reply_count: number
  view_count: number
  is_reply: boolean
  is_quote: boolean
  language: string
  fetched_at: string
}

interface TweetComment {
  id: string
  platform_comment_id: string
  author_username: string
  author_display_name: string
  author_avatar_url: string
  author_is_blue_verified?: boolean
  content: string
  like_count: number
  published_at: string
  is_reply: boolean
  reply_to_username: string
}

/** 获取推文列表 */
async function getTweets(uid: string): Promise<{ tweets: Tweet[]; total: number }> {
  const { data } = await axios.get(`${getApiPrefix()}/tweets`, {
    params: { user_id: uid, limit: 50 },
  })
  return data
}

/** 刷新推文 */
async function refreshTweets(uid: string): Promise<void> {
  await axios.post(`${getApiPrefix()}/tweets/refresh`, { user_id: uid })
}

/** 获取推文评论（库中无数据时后端会用 bird replies 实时拉取） */
async function getTweetComments(platformPostID: string, uid: string): Promise<{ comments: TweetComment[]; total: number }> {
  const { data } = await axios.get(`${getApiPrefix()}/tweets/comments`, {
    params: { platform_post_id: platformPostID, user_id: uid, limit: 20 },
  })
  return data
}

/** 格式化数字 */
function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num?.toString() || '0'
}

/** 格式化时间 */
function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

// 单条推文组件
function TweetCard({ 
  tweet, 
  isExpanded, 
  onExpand,
  storageUserId,
}: { 
  tweet: Tweet
  isExpanded: boolean
  onExpand: (expanded: boolean) => void
  storageUserId: string
}) {
  const { token } = antTheme.useToken()
  const [comments, setComments] = useState<TweetComment[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const handleExpand = useCallback(async (expanded: boolean) => {
    onExpand(expanded)
    if (!expanded) {
      setLoaded(false)
    }
    if (expanded && !loaded) {
      setLoading(true)
      try {
        const result = await getTweetComments(tweet.platform_post_id, storageUserId)
        setComments(result.comments)
        setLoaded(true)
      } catch (err) {
        console.error('加载评论失败:', err)
      } finally {
        setLoading(false)
      }
    }
  }, [tweet.platform_post_id, loaded, onExpand, storageUserId])

  return (
    <Card 
      style={{ 
        background: token.colorBgContainer,
        borderRadius: token.borderRadiusLG,
        marginBottom: 16
      }}
      bodyStyle={{ padding: 20 }}
    >
      {/* 推文头部 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <Avatar 
          src={tweet.author_avatar_url} 
          size={48}
          icon={<UserOutlined />}
          style={{ border: '2px solid #e0e0e0', flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text strong style={{ fontSize: 16 }}>{tweet.author_display_name}</Text>
            {tweet.author_is_blue_verified && (
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center',
                background: '#1d9bf0', 
                color: 'white',
                borderRadius: '50%',
                width: 16,
                height: 16,
                fontSize: 10,
                justifyContent: 'center'
              }}>
                ✓
              </span>
            )}
            <Text type="secondary">@{tweet.author_username}</Text>
            <Text type="secondary">·</Text>
            <Tooltip title={new Date(tweet.published_at).toLocaleString('zh-CN')}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {formatTime(tweet.published_at)}
              </Text>
            </Tooltip>
          </div>
          {(tweet.is_reply || tweet.is_quote) && (
            <Tag style={{ marginTop: 4, fontSize: 12 }}>
              {tweet.is_reply ? '回复' : '引用'}
            </Tag>
          )}
        </div>
      </div>

      {/* 推文内容 */}
      <Paragraph style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 16 }}>
        {tweet.content}
      </Paragraph>

      {/* 媒体 */}
      {tweet.media_urls && tweet.media_urls.length > 0 && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: tweet.media_urls.length > 1 ? 'repeat(2, 1fr)' : '1fr',
          gap: 8,
          marginBottom: 16 
        }}
        >
          {tweet.media_urls.map((url, idx) => (
            <div key={idx} style={{ 
              borderRadius: 8, 
              overflow: 'hidden',
              background: '#f0f0f0'
            }}
            >
              <img 
                src={url} 
                alt="" 
                style={{ 
                  width: '100%', 
                  height: tweet.media_urls.length > 1 ? 150 : 200,
                  objectFit: 'cover'
                }} 
              />
            </div>
          ))}
        </div>
      )}

      {/* 互动数据 */}
      <div style={{ 
        display: 'flex', 
        gap: 24, 
        padding: '12px 0',
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        borderBottom: `1px solid ${token.colorBorderSecondary}`
      }}
      >
        <Tooltip title="回复">
          <Space style={{ cursor: 'pointer' }}>
            <MessageOutlined style={{ color: '#1d9bf0' }} />
            <Text type="secondary">{formatNumber(tweet.reply_count)}</Text>
          </Space>
        </Tooltip>
        
        <Tooltip title="转发">
          <Space style={{ cursor: 'pointer' }}>
            <RetweetOutlined style={{ color: '#00ba7c' }} />
            <Text type="secondary">{formatNumber(tweet.repost_count)}</Text>
          </Space>
        </Tooltip>
        
        <Tooltip title="点赞">
          <Space style={{ cursor: 'pointer' }}>
            <HeartOutlined style={{ color: '#f91880' }} />
            <Text type="secondary">{formatNumber(tweet.like_count)}</Text>
          </Space>
        </Tooltip>
        
        {tweet.view_count > 0 && (
          <Tooltip title="浏览">
            <Space style={{ cursor: 'pointer' }}>
              <EyeOutlined style={{ color: token.colorTextSecondary }} />
              <Text type="secondary">{formatNumber(tweet.view_count)}</Text>
            </Space>
          </Tooltip>
        )}
        
        <a 
          href={tweet.post_url} 
          target="_blank" 
          rel="noreferrer"
          style={{ marginLeft: 'auto' }}
        >
          <Button type="link" size="small" icon={<LinkOutlined />}>
            在 X 查看
          </Button>
        </a>
      </div>

      {/* 评论区 */}
      <Collapse 
        ghost 
        style={{ marginTop: 12 }}
        activeKey={isExpanded ? [tweet.platform_post_id] : []}
        onChange={(keys) => handleExpand(Array.isArray(keys) && keys.length > 0)}
      >
        <Panel 
          header={
            <Text type="secondary" style={{ fontSize: 13 }}>
              {isExpanded ? '收起评论' : `查看评论 (${tweet.reply_count})`}
            </Text>
          } 
          key={tweet.platform_post_id}
          style={{ border: 'none' }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin size="small" />
            </div>
          ) : comments.length > 0 ? (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {comments.slice(0, 20).map((comment, idx) => (
                <div key={comment.id || comment.platform_comment_id} style={{ 
                  padding: 12, 
                  background: token.colorBgLayout,
                  borderRadius: token.borderRadiusLG 
                }}
                >
                  <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                    <Avatar 
                      src={comment.author_avatar_url} 
                      size={32}
                      icon={<UserOutlined />}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Text strong style={{ fontSize: 14 }}>{comment.author_display_name}</Text>
                        {comment.author_is_blue_verified && (
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center',
                            background: '#1d9bf0', 
                            color: 'white',
                            borderRadius: '50%',
                            width: 14,
                            height: 14,
                            fontSize: 9,
                            justifyContent: 'center'
                          }}>
                            ✓
                          </span>
                        )}
                        <Text type="secondary" style={{ fontSize: 12 }}>@{comment.author_username}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>· {formatTime(comment.published_at)}</Text>
                      </div>
                      <Paragraph style={{ margin: '4px 0', fontSize: 14 }}>
                        {comment.content}
                      </Paragraph>
                      <Space size="middle">
                        <Space size={4}>
                          <HeartOutlined style={{ fontSize: 12, color: '#f91880' }} />
                          <Text type="secondary" style={{ fontSize: 12 }}>{formatNumber(comment.like_count)}</Text>
                        </Space>
                        {comment.is_reply && comment.reply_to_username && (
                          <Tag style={{ fontSize: 11 }}>
                            回复 @{comment.reply_to_username}
                          </Tag>
                        )}
                      </Space>
                    </div>
                  </div>
                  {idx < comments.length - 1 && idx < 19 && (
                    <Divider style={{ margin: '8px 0' }} />
                  )}
                </div>
              ))}
              {comments.length >= 20 && (
                <Text type="secondary" style={{ textAlign: 'center', display: 'block', fontSize: 12 }}>
                  仅展示前 20 条评论
                </Text>
              )}
            </Space>
          ) : (
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE} 
              description={
                tweet.reply_count > 0
                  ? '未拉到评论（请确认已设置 TWITTER_USE_BIRD=true，且 bird 可用；服务器需能执行 bird replies）'
                  : '暂无评论'
              }
              style={{ margin: '20px 0' }}
            />
          )}
        </Panel>
      </Collapse>
    </Card>
  )
}

type TweetsPanelProps = { userId?: string }

export default function TweetsPanel({ userId: userIdProp }: TweetsPanelProps) {
  const queryClient = useQueryClient()
  const [expandedTweetId, setExpandedTweetId] = useState<string | null>(null)
  const storageUserId = userIdProp ?? DEFAULT_USER_ID

  const {
    data,
    isLoading,
    error,
    refetch,
    isError,
  } = useQuery({
    queryKey: ['tweets', storageUserId],
    queryFn: () => getTweets(storageUserId),
    retry: 1,
    staleTime: 0,
    refetchOnMount: true,
  })

  const tweets: Tweet[] = useMemo(() => {
    return data?.tweets ?? []
  }, [data])

  // 刷新推文 mutation
  const refreshMutation = useMutation({
    mutationFn: () => refreshTweets(storageUserId),
    onSuccess: () => {
      message.success('已开始刷新推文，请稍候...')
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['tweets'] })
      }, 5000)
    },
    onError: () => {
      message.error('刷新失败')
    },
  })

  const handleExpand = useCallback((tweetId: string, expanded: boolean) => {
    setExpandedTweetId(expanded ? tweetId : null)
  }, [])

  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin tip="正在加载推文..." />
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
        message="无法获取推文"
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

  if (tweets.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              暂无推文数据
            </Text>
            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 16 }}>
              请先添加监控账号，然后点击刷新获取推文
            </Text>
            <Button 
              type="primary" 
              icon={<SyncOutlined />}
              onClick={() => refreshMutation.mutate()}
              loading={refreshMutation.isPending}
            >
              刷新推文
            </Button>
          </div>
        }
      />
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Text type="secondary">
            共 <Text strong>{tweets.length}</Text> 条推文
          </Text>
          <Tag color="blue">监控账号动态</Tag>
        </Space>
        <Button 
          icon={<SyncOutlined />} 
          onClick={() => refreshMutation.mutate()}
          loading={refreshMutation.isPending}
        >
          刷新推文
        </Button>
      </div>

      <div>
        {tweets.map((tweet) => (
          <TweetCard
            key={tweet.id}
            tweet={tweet}
            isExpanded={expandedTweetId === tweet.platform_post_id}
            onExpand={(expanded) => handleExpand(tweet.platform_post_id, expanded)}
            storageUserId={storageUserId}
          />
        ))}
      </div>
    </div>
  )
}
