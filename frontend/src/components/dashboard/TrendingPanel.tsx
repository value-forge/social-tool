import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { 
  Alert, Button, Spin, Typography, Tag, Empty, Card, 
  Space, Tooltip, Badge, message, theme as antTheme,
  Collapse, Modal, Form, Radio
} from 'antd'
import { 
  FireOutlined, SyncOutlined, ClockCircleOutlined, RiseOutlined,
  FallOutlined, MinusOutlined, FileTextOutlined, EditOutlined,
  CopyOutlined, CheckCircleOutlined, ThunderboltOutlined,
  EyeOutlined, BarChartOutlined
} from '@ant-design/icons'
import { getApiPrefix } from '../../api/apiPrefix'

const { Text, Paragraph, Title } = Typography
const { Panel } = Collapse

// 默认用户ID
const DEFAULT_TWITTER_USERNAME = import.meta.env.VITE_TWITTER_USERNAME || '0xziheng'
const DEFAULT_USER_ID = `default_${DEFAULT_TWITTER_USERNAME}`

// 热点话题状态
type TrendingStatus = 'active' | 'faded' | 'new' | 'returning'

// 写作建议
interface WritingSuggestion {
  angle: string
  title_suggestion: string
  description: string
  target_audience: string
}

// 热点话题
interface TrendingTopic {
  id: string
  platform: string
  topic_name: string
  topic_query: string
  topic_url: string
  tweet_volume: number | null
  occurrence_count: number
  first_seen_at: string
  last_seen_at: string
  is_new: boolean
  consecutive_count: number
  peak_rank: number
  current_rank: number
  core_summary: string
  writing_suggestions: WritingSuggestion[]
  analysis_generated_at: string | null
  status: TrendingStatus
  created_at: string
  updated_at: string
}

// 热点快照（预留扩展）
// type TrendingSnapshot = {
//   id: string
//   platform: string
//   fetched_at: string
//   topics: Array<{
//     topic_name: string
//     rank: number
//     tweet_volume: number | null
//     is_new: boolean
//   }>
// }

// 草稿
interface Draft {
  id: string
  content: string
  model: string
  created_at: string
}

/** 获取热点列表 */
async function getTrendingTopics(uid: string): Promise<{ topics: TrendingTopic[]; total: number; updated_at: string }> {
  const { data } = await axios.get(`${getApiPrefix()}/trending`, {
    params: { user_id: uid },
  })
  return data
}

/** 刷新热点 */
async function refreshTrending(uid: string): Promise<void> {
  await axios.post(`${getApiPrefix()}/trending/refresh`, { user_id: uid })
}

/** 基于热点生成草稿 */
async function generateDraftFromTrending(id: string, uid: string, model: string): Promise<{ drafts: Draft[] }> {
  const { data } = await axios.post(`${getApiPrefix()}/trending/${id}/generate-draft`, {
    user_id: uid,
    model,
  })
  return data
}

/** 格式化数字 */
function formatNumber(num: number | null): string {
  if (num === null || num === undefined) return '-'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
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

/** 获取状态标签 */
function getStatusBadge(status: TrendingStatus, isNew: boolean) {
  if (isNew || status === 'new') {
    return <Badge color="#ef4444" text={<Text style={{ color: '#ef4444', fontWeight: 500 }}>新!</Text>} />
  }
  if (status === 'returning') {
    return <Badge color="#f59e0b" text={<Text style={{ color: '#f59e0b', fontWeight: 500 }}>回归</Text>} />
  }
  if (status === 'active') {
    return <Badge color="#22c55e" text={<Text style={{ color: '#22c55e' }}>持续</Text>} />
  }
  return <Badge color="#71767b" text={<Text type="secondary">已退榜</Text>} />
}

/** 获取排名变化图标 */
function getRankChangeIcon(currentRank: number, peakRank: number) {
  if (currentRank < peakRank) {
    return <RiseOutlined style={{ color: '#22c55e' }} />
  }
  if (currentRank > peakRank) {
    return <FallOutlined style={{ color: '#ef4444' }} />
  }
  return <MinusOutlined style={{ color: '#71767b' }} />
}

// 热点详情弹窗
function TrendingDetailModal({
  topic,
  visible,
  onClose,
  userId,
}: {
  topic: TrendingTopic | null
  visible: boolean
  onClose: () => void
  userId: string
}) {
  const { token } = antTheme.useToken()
  const [activeTab, setActiveTab] = useState<'analysis' | 'draft'>('analysis')
  const [selectedModel, setSelectedModel] = useState<'kimi' | 'claude'>('kimi')
  const [generatedDrafts, setGeneratedDrafts] = useState<Draft[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const generateMutation = useMutation({
    mutationFn: () => generateDraftFromTrending(topic!.id, userId, selectedModel),
    onSuccess: (data) => {
      setGeneratedDrafts(data.drafts)
      message.success('草稿生成成功')
    },
    onError: () => {
      message.error('草稿生成失败')
    },
  })

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    message.success('已复制到剪贴板')
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (!topic) return null

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FireOutlined style={{ color: '#f59e0b', fontSize: 20 }} />
          <span>{topic.topic_name}</span>
          {getStatusBadge(topic.status, topic.is_new)}
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={720}
      footer={null}
    >
      <div style={{ marginBottom: 16 }}>
        <Space size="large">
          <Text type="secondary">
            <RiseOutlined style={{ marginRight: 4 }} />
            排名: <Text strong>#{topic.current_rank}</Text>
          </Text>
          <Text type="secondary">
            推文量: <Text strong>{formatNumber(topic.tweet_volume)}</Text>
          </Text>
          <Text type="secondary">
            出现次数: <Text strong>{topic.occurrence_count} 次</Text>
          </Text>
        </Space>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Button
          type={activeTab === 'analysis' ? 'primary' : 'default'}
          onClick={() => setActiveTab('analysis')}
          style={{ marginRight: 8 }}
        >
          <EyeOutlined /> 热点分析
        </Button>
        <Button
          type={activeTab === 'draft' ? 'primary' : 'default'}
          onClick={() => setActiveTab('draft')}
        >
          <EditOutlined /> 生成草稿
        </Button>
      </div>

      {activeTab === 'analysis' ? (
        <div>
          {/* 热点核心 */}
          <Card
            style={{ 
              background: 'linear-gradient(135deg, rgba(29,155,240,0.08) 0%, rgba(29,155,240,0.02) 100%)',
              border: `1px solid ${token.colorPrimaryBorder}`,
              marginBottom: 16
            }}
          >
            <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
              <ThunderboltOutlined style={{ color: token.colorPrimary, marginRight: 8 }} />
              热点核心
            </Title>
            <Paragraph style={{ fontSize: 15, margin: 0 }}>
              {topic.core_summary || '暂无分析，点击刷新获取AI分析'}
            </Paragraph>
          </Card>

          {/* 写作方向建议 */}
          <Title level={5} style={{ marginBottom: 12 }}>
            <FileTextOutlined style={{ marginRight: 8 }} />
            写作方向建议
          </Title>
          {topic.writing_suggestions && topic.writing_suggestions.length > 0 ? (
            <Collapse ghost>
              {topic.writing_suggestions.map((suggestion, idx) => (
                <Panel
                  header={
                    <div>
                      <Text strong>{idx + 1}. {suggestion.angle}</Text>
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                        面向: {suggestion.target_audience}
                      </Text>
                    </div>
                  }
                  key={idx}
                >
                  <div style={{ padding: '0 0 12px 24px' }}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      推荐标题: {suggestion.title_suggestion}
                    </Text>
                    <Text type="secondary">{suggestion.description}</Text>
                  </div>
                </Panel>
              ))}
            </Collapse>
          ) : (
            <Empty description="暂无写作建议" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>
      ) : (
        <div>
          {/* 生成草稿 */}
          <Card style={{ marginBottom: 16 }}>
            <Form layout="vertical">
              <Form.Item label="选择AI模型">
                <Radio.Group 
                  value={selectedModel} 
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  <Radio.Button value="kimi">Kimi</Radio.Button>
                  <Radio.Button value="claude">Claude</Radio.Button>
                </Radio.Group>
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => generateMutation.mutate()}
                  loading={generateMutation.isPending}
                  block
                >
                  基于热点生成推文草稿
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {/* 生成的草稿列表 */}
          {generatedDrafts.length > 0 && (
            <div>
              <Title level={5} style={{ marginBottom: 12 }}>
                生成的草稿
              </Title>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {generatedDrafts.map((draft) => (
                  <Card
                    key={draft.id}
                    size="small"
                    style={{ background: token.colorBgLayout }}
                    actions={[
                      <Button
                        type="text"
                        icon={copiedId === draft.id ? <CheckCircleOutlined style={{ color: '#22c55e' }} /> : <CopyOutlined />}
                        onClick={() => handleCopy(draft.content, draft.id)}
                      >
                        {copiedId === draft.id ? '已复制' : '复制'}
                      </Button>
                    ]}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <Tag color="blue">{draft.model}</Tag>
                      <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                        {formatTime(draft.created_at)}
                      </Text>
                    </div>
                    <Paragraph style={{ margin: 0 }}>{draft.content}</Paragraph>
                  </Card>
                ))}
              </Space>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

// 热点列表项组件
function TrendingItem({ 
  topic, 
  onClick 
}: { 
  topic: TrendingTopic
  onClick: () => void 
}) {
  const { token } = antTheme.useToken()

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{
        marginBottom: 12,
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        transition: 'all 0.2s',
      }}
      bodyStyle={{ padding: 16 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* 排名 */}
        <div style={{ 
          width: 40, 
          height: 40, 
          borderRadius: '50%',
          background: topic.current_rank <= 3 
            ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' 
            : token.colorBgLayout,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Text strong style={{ 
            color: topic.current_rank <= 3 ? '#fff' : token.colorText,
            fontSize: 16
          }}>
            {topic.current_rank}
          </Text>
        </div>

        {/* 内容 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text strong style={{ fontSize: 16 }}>{topic.topic_name}</Text>
            {getStatusBadge(topic.status, topic.is_new)}
          </div>
          <Space size="middle">
            <Text type="secondary" style={{ fontSize: 13 }}>
              推文量: <Text strong>{formatNumber(topic.tweet_volume)}</Text>
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              出现: <Text strong>{topic.occurrence_count} 次</Text>
            </Text>
            <Tooltip title={`最高排名: #${topic.peak_rank}`}>
              <Space size={4}>
                {getRankChangeIcon(topic.current_rank, topic.peak_rank)}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  峰值 #{topic.peak_rank}
                </Text>
              </Space>
            </Tooltip>
          </Space>
        </div>

        {/* 首次出现时间 */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <Tooltip title={new Date(topic.first_seen_at).toLocaleString('zh-CN')}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {formatTime(topic.first_seen_at)}
            </Text>
          </Tooltip>
          <div style={{ marginTop: 4 }}>
            <Tag style={{ fontSize: 11 }}>
              连续 {topic.consecutive_count} 轮
            </Tag>
          </div>
        </div>
      </div>

      {/* 热点核心摘要 */}
      {topic.core_summary && (
        <div style={{ 
          marginTop: 12, 
          padding: 12, 
          background: token.colorBgLayout,
          borderRadius: token.borderRadiusSM
        }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            <ThunderboltOutlined style={{ marginRight: 4, color: token.colorPrimary }} />
            {topic.core_summary}
          </Text>
        </div>
      )}
    </Card>
  )
}

type TrendingPanelProps = { userId?: string }

export default function TrendingPanel({ userId: userIdProp }: TrendingPanelProps) {
  const { token } = antTheme.useToken()
  const queryClient = useQueryClient()
  const [selectedTopic, setSelectedTopic] = useState<TrendingTopic | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const storageUserId = userIdProp ?? DEFAULT_USER_ID

  const {
    data,
    isLoading,
    error,
    refetch,
    isError,
  } = useQuery({
    queryKey: ['trending', storageUserId],
    queryFn: () => getTrendingTopics(storageUserId),
    retry: 1,
    staleTime: 0,
    refetchOnMount: true,
  })

  const topics: TrendingTopic[] = useMemo(() => {
    return data?.topics ?? []
  }, [data])

  const updatedAt = data?.updated_at

  // 刷新热点 mutation
  const refreshMutation = useMutation({
    mutationFn: () => refreshTrending(storageUserId),
    onSuccess: () => {
      message.success('已开始刷新热点，请稍候...')
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['trending'] })
      }, 5000)
    },
    onError: () => {
      message.error('刷新失败')
    },
  })

  // 统计
  const stats = useMemo(() => {
    const total = topics.length
    const newTopics = topics.filter(t => t.is_new).length
    const returning = topics.filter(t => t.status === 'returning').length
    const active = topics.filter(t => t.status === 'active').length
    return { total, newTopics, returning, active }
  }, [topics])

  const handleTopicClick = (topic: TrendingTopic) => {
    setSelectedTopic(topic)
    setDetailVisible(true)
  }

  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin tip="正在加载热点数据..." />
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
        message="无法获取热点数据"
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

  return (
    <div>
      {/* 统计栏 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: 12,
        marginBottom: 24
      }}>
        {[
          { 
            label: '总话题', 
            value: stats.total, 
            unit: '个', 
            icon: <FireOutlined style={{ color: '#f59e0b' }} />
          },
          { 
            label: '新话题', 
            value: stats.newTopics, 
            unit: '个', 
            icon: <Badge color="#ef4444" />,
            highlight: stats.newTopics > 0
          },
          { 
            label: '回归话题', 
            value: stats.returning, 
            unit: '个', 
            icon: <RiseOutlined style={{ color: '#f59e0b' }} />
          },
          { 
            label: '持续在榜', 
            value: stats.active, 
            unit: '个', 
            icon: <BarChartOutlined style={{ color: '#22c55e' }} />
          },
        ].map((s) => (
          <Card
            key={s.label}
            size="small"
            style={{
              background: s.highlight ? 'rgba(239,68,68,0.05)' : token.colorBgContainer,
              border: `1px solid ${s.highlight ? '#ef4444' : token.colorBorderSecondary}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {s.icon}
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: token.colorText }}>
                  {s.value}
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>{s.label}</Text>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 操作栏 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24 
      }}>
        <Space>
          <Text type="secondary">
            共 <Text strong>{topics.length}</Text> 个热点话题
          </Text>
          {updatedAt && (
            <Tag icon={<ClockCircleOutlined />} color="blue">
              更新于 {formatTime(updatedAt)}
            </Tag>
          )}
        </Space>
        <Button 
          icon={<SyncOutlined />} 
          onClick={() => refreshMutation.mutate()}
          loading={refreshMutation.isPending}
        >
          刷新热点
        </Button>
      </div>

      {/* 图例 */}
      <div style={{ marginBottom: 16, padding: 12, background: token.colorBgLayout, borderRadius: token.borderRadiusLG }}>
        <Space size="large">
          <Space>
            <Badge color="#ef4444" />
            <Text type="secondary" style={{ fontSize: 13 }}>新上榜</Text>
          </Space>
          <Space>
            <Badge color="#22c55e" />
            <Text type="secondary" style={{ fontSize: 13 }}>持续在榜</Text>
          </Space>
          <Space>
            <Badge color="#f59e0b" />
            <Text type="secondary" style={{ fontSize: 13 }}>回归榜单</Text>
          </Space>
        </Space>
      </div>

      {/* 热点列表 */}
      {topics.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                暂无热点数据
              </Text>
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 16 }}>
                点击刷新获取最新 Twitter 热点
              </Text>
              <Button 
                type="primary" 
                icon={<SyncOutlined />}
                onClick={() => refreshMutation.mutate()}
                loading={refreshMutation.isPending}
              >
                刷新热点
              </Button>
            </div>
          }
        />
      ) : (
        <div>
          {topics.map((topic) => (
            <TrendingItem
              key={topic.id}
              topic={topic}
              onClick={() => handleTopicClick(topic)}
            />
          ))}
        </div>
      )}

      {/* 详情弹窗 */}
      <TrendingDetailModal
        topic={selectedTopic}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        userId={storageUserId}
      />
    </div>
  )
}
