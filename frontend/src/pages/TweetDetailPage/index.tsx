import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'
import {
  Card, Button, Spin, Typography, Tag, Empty, Avatar,
  Space, Tooltip, message, theme as antTheme, Input,
  Radio, List, Badge
} from 'antd'
import {
  HeartOutlined, RetweetOutlined, MessageOutlined, EyeOutlined,
  ClockCircleOutlined, LinkOutlined, UserOutlined, ArrowLeftOutlined,
  RobotOutlined, CopyOutlined, EditOutlined,
  SaveOutlined, ThunderboltOutlined, DeleteOutlined
} from '@ant-design/icons'
import type { RadioChangeEvent } from 'antd'
import { getApiPrefix } from '../../api/apiPrefix'
import type { Tweet, TweetComment, Draft, LLMModel } from '../../types'

const { Text, Paragraph } = Typography
const { TextArea } = Input

// 默认用户ID
const DEFAULT_TWITTER_USERNAME = import.meta.env.VITE_TWITTER_USERNAME || '0xziheng'
const DEFAULT_USER_ID = `default_${DEFAULT_TWITTER_USERNAME}`

interface GeneratedDraft {
  id: string
  content: string
  model: LLMModel
  isEditing: boolean
  editedContent: string
}

/** 获取推文详情 */
async function getTweetDetail(tweetId: string): Promise<{ tweet: Tweet; comments: TweetComment[] }> {
  const { data } = await axios.get(`${getApiPrefix()}/tweets/${tweetId}`, {
    params: { user_id: DEFAULT_USER_ID },
  })
  return data
}

/** 获取推文评论 */
async function getTweetComments(platformPostId: string): Promise<{ comments: TweetComment[] }> {
  const { data } = await axios.get(`${getApiPrefix()}/tweets/comments`, {
    params: { platform_post_id: platformPostId, user_id: DEFAULT_USER_ID, limit: 10 },
  })
  return data
}

/** 生成回复草稿 */
async function generateDraft(
  tweetId: string,
  model: LLMModel,
  prompt?: string,
  tone?: string
): Promise<{ drafts: Draft[] }> {
  const { data } = await axios.post(`${getApiPrefix()}/tweets/${tweetId}/generate-draft`, {
    user_id: DEFAULT_USER_ID,
    model,
    prompt,
    tone,
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

export default function TweetDetailPage() {
  const { tweetId } = useParams<{ tweetId: string }>()
  const navigate = useNavigate()
  const { token } = antTheme.useToken()
  
  const [selectedModel, setSelectedModel] = useState<LLMModel>('kimi')
  const [customPrompt, setCustomPrompt] = useState('')
  const [replyTone, setReplyTone] = useState('friendly')
  const [generatedDrafts, setGeneratedDrafts] = useState<GeneratedDraft[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // 获取推文详情
  const {
    data: tweetData,
    isLoading: tweetLoading,
    error: tweetError,
  } = useQuery({
    queryKey: ['tweet-detail', tweetId],
    queryFn: () => getTweetDetail(tweetId!),
    enabled: !!tweetId,
  })

  // 获取评论
  const {
    data: commentsData,
    isLoading: commentsLoading,
  } = useQuery({
    queryKey: ['tweet-comments', tweetData?.tweet.platform_post_id],
    queryFn: () => getTweetComments(tweetData!.tweet.platform_post_id),
    enabled: !!tweetData?.tweet.platform_post_id,
  })

  // 生成草稿 mutation
  const generateMutation = useMutation({
    mutationFn: () => generateDraft(tweetId!, selectedModel, customPrompt || undefined, replyTone),
    onSuccess: (data) => {
      const newDrafts: GeneratedDraft[] = data.drafts.map((draft) => ({
        id: draft.id,
        content: draft.draft_content,
        model: draft.model,
        isEditing: false,
        editedContent: draft.draft_content,
      }))
      setGeneratedDrafts((prev) => [...newDrafts, ...prev])
      message.success('草稿生成成功')
    },
    onError: () => {
      message.error('草稿生成失败')
    },
  })

  const tweet = tweetData?.tweet
  const comments = commentsData?.comments || []

  // 开始编辑
  const handleStartEdit = (draftId: string) => {
    setGeneratedDrafts((prev) =>
      prev.map((d) =>
        d.id === draftId ? { ...d, isEditing: true } : d
      )
    )
  }

  // 保存编辑
  const handleSaveEdit = (draftId: string) => {
    setGeneratedDrafts((prev) =>
      prev.map((d) =>
        d.id === draftId
          ? { ...d, isEditing: false, content: d.editedContent }
          : d
      )
    )
    message.success('修改已保存')
  }

  // 取消编辑
  const handleCancelEdit = (draftId: string) => {
    setGeneratedDrafts((prev) =>
      prev.map((d) =>
        d.id === draftId
          ? { ...d, isEditing: false, editedContent: d.content }
          : d
      )
    )
  }

  // 更新编辑内容
  const handleEditChange = (draftId: string, value: string) => {
    setGeneratedDrafts((prev) =>
      prev.map((d) =>
        d.id === draftId ? { ...d, editedContent: value } : d
      )
    )
  }

  // 复制草稿
  const handleCopy = (draft: GeneratedDraft) => {
    navigator.clipboard.writeText(draft.isEditing ? draft.editedContent : draft.content)
    setCopiedId(draft.id)
    message.success('已复制到剪贴板')
    setTimeout(() => setCopiedId(null), 2000)
  }

  // 删除草稿
  const handleDelete = (draftId: string) => {
    setGeneratedDrafts((prev) => prev.filter((d) => d.id !== draftId))
    message.success('草稿已删除')
  }

  // 重新生成
  const handleRegenerate = () => {
    generateMutation.mutate()
  }

  if (tweetLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin tip="正在加载推文详情..." />
      </div>
    )
  }

  if (tweetError || !tweet) {
    return (
      <Empty
        description="无法加载推文详情"
        style={{ marginTop: 100 }}
      >
        <Button type="primary" onClick={() => navigate(-1)}>
          返回
        </Button>
      </Empty>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px' }}>
      {/* 返回按钮 */}
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: 24 }}
      >
        返回推文列表
      </Button>

      {/* 推文详情卡片 */}
      <Card
        style={{
          marginBottom: 24,
          borderRadius: token.borderRadiusLG,
        }}
        bodyStyle={{ padding: 24 }}
      >
        {/* 推文头部 */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <Avatar
            src={tweet.author_avatar_url}
            size={56}
            icon={<UserOutlined />}
            style={{ border: '2px solid #e0e0e0', flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text strong style={{ fontSize: 18 }}>{tweet.author_display_name}</Text>
              {tweet.author_is_blue_verified && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#1d9bf0',
                  color: 'white',
                  borderRadius: '50%',
                  width: 18,
                  height: 18,
                  fontSize: 11,
                  justifyContent: 'center',
                }}>
                  ✓
                </span>
              )}
              <Text type="secondary">@{tweet.author_username}</Text>
              <Text type="secondary">·</Text>
              <Tooltip title={new Date(tweet.published_at).toLocaleString('zh-CN')}>
                <Text type="secondary">
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {formatTime(tweet.published_at)}
                </Text>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* 推文内容 */}
        <Paragraph style={{ fontSize: 16, lineHeight: 1.7, marginBottom: 16 }}>
          {tweet.content}
        </Paragraph>

        {/* 媒体 */}
        {tweet.media_urls && tweet.media_urls.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: tweet.media_urls.length > 1 ? 'repeat(2, 1fr)' : '1fr',
            gap: 8,
            marginBottom: 16
          }}>
            {tweet.media_urls.map((url, idx) => (
              <div key={idx} style={{ borderRadius: 8, overflow: 'hidden' }}>
                <img
                  src={url}
                  alt=""
                  style={{
                    width: '100%',
                    height: tweet.media_urls!.length > 1 ? 200 : 280,
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
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          marginBottom: 16
        }}>
          <Space>
            <MessageOutlined style={{ color: '#1d9bf0' }} />
            <Text type="secondary">{formatNumber(tweet.reply_count)} 回复</Text>
          </Space>
          <Space>
            <RetweetOutlined style={{ color: '#00ba7c' }} />
            <Text type="secondary">{formatNumber(tweet.repost_count)} 转发</Text>
          </Space>
          <Space>
            <HeartOutlined style={{ color: '#f91880' }} />
            <Text type="secondary">{formatNumber(tweet.like_count)} 点赞</Text>
          </Space>
          {tweet.view_count > 0 && (
            <Space>
              <EyeOutlined style={{ color: token.colorTextSecondary }} />
              <Text type="secondary">{formatNumber(tweet.view_count)} 浏览</Text>
            </Space>
          )}
          <a
            href={tweet.post_url}
            target="_blank"
            rel="noreferrer"
            style={{ marginLeft: 'auto' }}
          >
            <Button type="link" icon={<LinkOutlined />}>
              在 X 查看
            </Button>
          </a>
        </div>

        {/* AI 摘要 */}
        {tweet.content_summary && (
          <div style={{
            padding: 16,
            background: 'rgba(29, 155, 240, 0.08)',
            borderRadius: token.borderRadiusLG,
            marginBottom: 16,
            border: `1px solid ${token.colorPrimaryBorder}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <ThunderboltOutlined style={{ color: token.colorPrimary }} />
              <Text strong>AI 内容摘要</Text>
            </div>
            <Text type="secondary">{tweet.content_summary}</Text>
            {tweet.content_key_points && tweet.content_key_points.length > 0 && (
              <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, color: token.colorTextSecondary }}>
                {tweet.content_key_points.map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      {/* 评论区域 */}
      <Card
        title={
          <Space>
            <MessageOutlined />
            <span>Top 10 评论</span>
            <Badge count={comments.length} style={{ backgroundColor: token.colorPrimary }} />
          </Space>
        }
        style={{ marginBottom: 24 }}
        loading={commentsLoading}
      >
        {comments.length === 0 ? (
          <Empty description="暂无评论" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={comments.slice(0, 10)}
            renderItem={(comment, index) => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                    <Avatar
                      src={comment.author_avatar_url}
                      size={40}
                      icon={<UserOutlined />}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Text strong>{comment.author_display_name}</Text>
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
                            justifyContent: 'center',
                          }}>
                            ✓
                          </span>
                        )}
                        <Text type="secondary" style={{ fontSize: 13 }}>@{comment.author_username}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>· {formatTime(comment.published_at)}</Text>
                      </div>
                      <Paragraph style={{ margin: '4px 0', fontSize: 14 }}>
                        {comment.content}
                      </Paragraph>
                      <Space>
                        <HeartOutlined style={{ fontSize: 12, color: '#f91880' }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>{formatNumber(comment.like_count)}</Text>
                      </Space>
                    </div>
                    <Badge count={index + 1} style={{ backgroundColor: index < 3 ? '#f59e0b' : '#71767b' }} />
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* AI 回复生成区域 */}
      <Card
        title={
          <Space>
            <RobotOutlined />
            <span>AI 回复生成</span>
          </Space>
        }
      >
        {/* 生成配置 */}
        <div style={{ marginBottom: 24, padding: 16, background: token.colorBgLayout, borderRadius: token.borderRadiusLG }}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>选择模型</Text>
              <Radio.Group
                value={selectedModel}
                onChange={(e: RadioChangeEvent) => setSelectedModel(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="kimi">Kimi</Radio.Button>
                <Radio.Button value="claude">Claude</Radio.Button>
              </Radio.Group>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>回复风格</Text>
              <Radio.Group
                value={replyTone}
                onChange={(e: RadioChangeEvent) => setReplyTone(e.target.value)}
              >
                <Radio value="friendly">友好</Radio>
                <Radio value="professional">专业</Radio>
                <Radio value="humorous">幽默</Radio>
                <Radio value="concise">简洁</Radio>
              </Radio.Group>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>自定义提示词（可选）</Text>
              <TextArea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="例如：请用中文回复，表达对这条推文的支持和赞同..."
                rows={2}
              />
            </div>

            <Button
              type="primary"
              icon={<RobotOutlined />}
              onClick={handleRegenerate}
              loading={generateMutation.isPending}
              size="large"
            >
              生成回复草稿
            </Button>
          </Space>
        </div>

        {/* 生成的草稿列表 */}
        {generatedDrafts.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: token.colorBorderSecondary }} />
              <Text strong style={{ margin: '0 16px' }}>生成的草稿 ({generatedDrafts.length})</Text>
              <div style={{ flex: 1, height: 1, background: token.colorBorderSecondary }} />
            </div>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {generatedDrafts.map((draft) => (
                <Card
                  key={draft.id}
                  size="small"
                  style={{
                    background: token.colorBgLayout,
                    border: draft.isEditing
                      ? `2px solid ${token.colorPrimary}`
                      : `1px solid ${token.colorBorderSecondary}`,
                  }}
                  title={
                    <Space>
                      <Tag color={draft.model === 'kimi' ? 'blue' : 'purple'}>
                        {draft.model.toUpperCase()}
                      </Tag>
                      {draft.isEditing && <Badge color="green" text="编辑中" />}
                    </Space>
                  }
                  extra={
                    <Space>
                      {!draft.isEditing ? (
                        <>
                          <Button
                            type="text"
                            icon={<CopyOutlined />}
                            onClick={() => handleCopy(draft)}
                          >
                            {copiedId === draft.id ? '已复制' : '复制'}
                          </Button>
                          <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => handleStartEdit(draft.id)}
                          >
                            编辑
                          </Button>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleDelete(draft.id)}
                          >
                            删除
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="text"
                            icon={<SaveOutlined />}
                            onClick={() => handleSaveEdit(draft.id)}
                          >
                            保存
                          </Button>
                          <Button
                            type="text"
                            onClick={() => handleCancelEdit(draft.id)}
                          >
                            取消
                          </Button>
                        </>
                      )}
                    </Space>
                  }
                >
                  {draft.isEditing ? (
                    <TextArea
                      value={draft.editedContent}
                      onChange={(e) => handleEditChange(draft.id, e.target.value)}
                      autoSize={{ minRows: 3, maxRows: 6 }}
                      style={{ fontSize: 14 }}
                    />
                  ) : (
                    <Paragraph style={{ margin: 0, fontSize: 14, whiteSpace: 'pre-wrap' }}>
                      {draft.content}
                    </Paragraph>
                  )}
                </Card>
              ))}
            </Space>
          </div>
        )}
      </Card>
    </div>
  )
}
