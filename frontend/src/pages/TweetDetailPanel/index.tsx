import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Card, Button, Spin, Typography, Tag, Empty, Avatar,
  Space, Tooltip, message, theme as antTheme, Input,
  List, Badge, Row, Col
} from 'antd'
import {
  HeartOutlined, RetweetOutlined, MessageOutlined, EyeOutlined,
  ClockCircleOutlined, LinkOutlined, UserOutlined, ArrowLeftOutlined,
  RobotOutlined, CopyOutlined, EditOutlined,
  SaveOutlined, DeleteOutlined, ThunderboltOutlined, StarOutlined
} from '@ant-design/icons'
import type { LLMModel } from '../../types'
import { getTweetDetail, batchGenerateDrafts, generateDraft } from '../../api/tweets'

const { Text, Paragraph } = Typography
const { TextArea } = Input

interface GeneratedDraft {
  id: string
  content: string
  model: LLMModel
  isEditing: boolean
  editedContent: string
}

interface TweetDetailPanelProps {
  tweetId: string
  onBack?: () => void
}

const MODELS: LLMModel[] = ['kimi', 'claude']

const MODEL_CONFIG: Record<LLMModel, { name: string; color: string; avatar: string }> = {
  kimi: { name: 'Kimi', color: '#1d9bf0', avatar: '🌙' },
  claude: { name: 'Claude', color: '#d97757', avatar: '🎯' },
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

export default function TweetDetailPanel({ tweetId, onBack }: TweetDetailPanelProps) {
  const { token } = antTheme.useToken()
  
  const [generatedDrafts, setGeneratedDrafts] = useState<GeneratedDraft[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // 获取推文详情（使用真实 API）
  const {
    data: tweetData,
    isLoading: tweetLoading,
    error: tweetError,
  } = useQuery({
    queryKey: ['tweet-detail', tweetId],
    queryFn: () => getTweetDetail(tweetId),
    enabled: !!tweetId,
  })

  const tweet = tweetData?.tweet

  // 生成所有模型的草稿
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!tweet) throw new Error('No tweet data')
      
      // 调用后端批量生成 API
      const result = await batchGenerateDrafts(tweetId, 'default_0xziheng', 'friendly')
      
      return result.drafts.map((draft) => ({
        id: draft.id,
        content: draft.content,
        model: draft.model,
        isEditing: false,
        editedContent: draft.content,
      }))
    },
    onSuccess: (data) => {
      setGeneratedDrafts(data)
      message.success('AI 回复生成成功')
    },
    onError: (error) => {
      console.error('Generate error:', error)
      message.error('生成失败，请重试')
    },
  })

  // 润色草稿 - 直接使用另一个模型
  const polishMutation = useMutation({
    mutationFn: async (draft: GeneratedDraft) => {
      if (!tweet) throw new Error('No tweet data')
      
      // 自动选择另一个模型
      const polishModel = MODELS.find(m => m !== draft.model) || draft.model
      
      // 调用 API 生成润色版本
      const result = await generateDraft(
        tweetId, 
        'default_0xziheng', 
        polishModel, 
        'friendly',
        `请对以下回复进行润色优化，使其更加自然、有洞察力：\n\n推文内容："${tweet.content}"\n\n当前回复："${draft.content}"\n\n请生成一个润色后的版本。`
      )
      
      const newDraft = result.drafts[0]
      return {
        id: newDraft?.id || `${polishModel}_polish_${Date.now()}`,
        content: newDraft?.content || draft.content,
        model: polishModel,
        isEditing: false,
        editedContent: newDraft?.content || draft.content,
      }
    },
    onSuccess: (data, variables) => {
      // 在目标草稿后面插入润色后的版本
      setGeneratedDrafts((prev) => {
        const index = prev.findIndex(d => d.id === variables.id)
        if (index === -1) return [...prev, data]
        const newDrafts = [...prev]
        newDrafts.splice(index + 1, 0, data)
        return newDrafts
      })
      message.success('润色生成成功')
    },
    onError: () => {
      message.error('润色失败，请重试')
    },
  })

  // 直接润色
  const handlePolish = (draft: GeneratedDraft) => {
    polishMutation.mutate(draft)
  }

  const comments = tweetData?.comments || []

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
  const handleGenerate = () => {
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
        <Button type="primary" onClick={onBack}>
          返回
        </Button>
      </Empty>
    )
  }

  return (
    <div>
      {/* 返回按钮 */}
      {onBack && (
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          style={{ marginBottom: 24 }}
        >
          返回推文列表
        </Button>
      )}

      <Row gutter={24}>
        {/* 左侧：推文详情和评论 */}
        <Col xs={24} lg={16}>
          {/* 推文详情卡片 */}
          <Card
            style={{
              marginBottom: 24,
              borderRadius: token.borderRadiusLG,
            }}
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
                border: `1px solid ${token.colorPrimaryBorder}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <RobotOutlined style={{ color: token.colorPrimary }} />
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
        </Col>

        {/* 右侧：AI 回复生成区域 */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <RobotOutlined />
                <span>AI 回复</span>
              </Space>
            }
            style={{ position: 'sticky', top: 24 }}
          >
            {/* 生成按钮 */}
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={handleGenerate}
              loading={generateMutation.isPending}
              block
              size="large"
              style={{ marginBottom: 16 }}
            >
              {generateMutation.isPending ? 'AI 正在生成回复...' : '生成 AI 回复'}
            </Button>

            {/* 生成的回复 - 聊天框形式 */}
            {generateMutation.isPending ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin tip="AI 正在思考回复..." />
              </div>
            ) : generatedDrafts.length > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {generatedDrafts.map((draft) => {
                  const config = MODEL_CONFIG[draft.model]
                  return (
                    <Card
                      key={draft.id}
                      size="small"
                      style={{
                        background: config.color + '08',
                        border: `1px solid ${config.color}30`,
                        borderRadius: 12,
                      }}
                      bodyStyle={{ padding: 12 }}
                    >
                      {/* 聊天框头部 - 模型名称 */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 8,
                        paddingBottom: 8,
                        borderBottom: `1px solid ${config.color}20`,
                      }}>
                        <span style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: config.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                        }}>
                          {config.avatar}
                        </span>
                        <Text strong style={{ color: config.color }}>
                          {config.name}
                        </Text>
                        <Tag color={config.color} style={{ marginLeft: 'auto', fontSize: 11 }}>
                          {draft.model.toUpperCase()}
                        </Tag>
                      </div>

                      {/* 聊天内容 */}
                      {draft.isEditing ? (
                        <TextArea
                          value={draft.editedContent}
                          onChange={(e) => handleEditChange(draft.id, e.target.value)}
                          autoSize={{ minRows: 3, maxRows: 6 }}
                          style={{ fontSize: 14, marginBottom: 8 }}
                        />
                      ) : (
                        <div style={{
                          padding: '8px 12px',
                          background: token.colorBgContainer,
                          borderRadius: 8,
                          marginBottom: 8,
                          fontSize: 14,
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                        }}>
                          {draft.content}
                        </div>
                      )}

                      {/* 操作按钮 */}
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        {!draft.isEditing ? (
                          <>
                            <Tooltip title="复制">
                              <Button
                                type="text"
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={() => handleCopy(draft)}
                              >
                                {copiedId === draft.id ? '已复制' : ''}
                              </Button>
                            </Tooltip>
                            <Tooltip title="润色">
                              <Button
                                type="text"
                                size="small"
                                icon={<StarOutlined />}
                                onClick={() => handlePolish(draft)}
                                loading={polishMutation.isPending && polishMutation.variables?.id === draft.id}
                              />
                            </Tooltip>
                            <Tooltip title="编辑">
                              <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleStartEdit(draft.id)}
                              />
                            </Tooltip>
                            <Tooltip title="删除">
                              <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleDelete(draft.id)}
                              />
                            </Tooltip>
                          </>
                        ) : (
                          <>
                            <Button
                              type="text"
                              size="small"
                              icon={<SaveOutlined />}
                              onClick={() => handleSaveEdit(draft.id)}
                            >
                              保存
                            </Button>
                            <Button
                              type="text"
                              size="small"
                              onClick={() => handleCancelEdit(draft.id)}
                            >
                              取消
                            </Button>
                          </>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </Space>
            ) : (
              <Empty
                description="点击上方按钮生成 AI 回复"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ marginTop: 40 }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
