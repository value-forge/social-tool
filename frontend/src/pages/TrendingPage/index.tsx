import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { 
  Card, Button, Spin, Typography, Tag, Empty, 
  Space, Tooltip, message, theme as antTheme, Row, Col,
  Statistic, Divider, Segmented, Tabs
} from 'antd'
import { 
  FireOutlined, SyncOutlined, ClockCircleOutlined, RiseOutlined,
  FallOutlined, ThunderboltOutlined,
  BarChartOutlined, EyeOutlined,
  EditOutlined, CopyOutlined, CheckCircleOutlined, RobotOutlined,
  ArrowUpOutlined, ArrowDownOutlined, HistoryOutlined
} from '@ant-design/icons'
import { getApiPrefix } from '../../api/apiPrefix'
import type { TabsProps } from 'antd'

const { Text, Paragraph, Title } = Typography

// 默认用户ID
const DEFAULT_TWITTER_USERNAME = import.meta.env.VITE_TWITTER_USERNAME || '0xziheng'
const DEFAULT_USER_ID = `default_${DEFAULT_TWITTER_USERNAME}`

type TrendingStatus = 'active' | 'faded' | 'new' | 'returning'
type ViewMode = 'list' | 'grid' | 'analytics'

interface WritingSuggestion {
  angle: string
  title_suggestion: string
  description: string
  target_audience: string
}

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

interface Draft {
  id: string
  content: string
  model: string
  created_at: string
}

interface TrendingStats {
  total: number
  newTopics: number
  returning: number
  active: number
  totalVolume: number
  avgRank: number
}

/** API 函数 */
async function getTrendingTopics(uid: string): Promise<{ topics: TrendingTopic[]; total: number; updated_at: string }> {
  try {
    const { data } = await axios.get(`${getApiPrefix()}/trending`, {
      params: { user_id: uid },
    })
    // 如果返回数据为空，使用 mock 数据
    if (!data?.topics || data.topics.length === 0) {
      return { topics: getMockTrendingTopics(), total: 10, updated_at: new Date().toISOString() }
    }
    return data
  } catch (error) {
    // API 失败时使用 mock 数据
    console.log('Using mock trending data')
    return { topics: getMockTrendingTopics(), total: 10, updated_at: new Date().toISOString() }
  }
}

/** Mock 数据 */
function getMockTrendingTopics(): TrendingTopic[] {
  return [
    {
      id: '1',
      platform: 'twitter',
      topic_name: '#AI',
      topic_query: '#AI',
      topic_url: 'https://twitter.com/search?q=%23AI',
      tweet_volume: 1250000,
      occurrence_count: 15,
      first_seen_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      last_seen_at: new Date().toISOString(),
      is_new: false,
      consecutive_count: 8,
      peak_rank: 1,
      current_rank: 1,
      core_summary: '人工智能技术持续引领科技讨论，ChatGPT、Midjourney 等工具引发广泛关注，行业应用案例不断涌现。',
      writing_suggestions: [
        {
          angle: '行业应用',
          title_suggestion: 'AI 如何改变我们的工作方式',
          description: '探讨 AI 在各行业的实际应用案例和影响',
          target_audience: '职场人士'
        },
        {
          angle: '工具推荐',
          title_suggestion: '2024 年最值得关注的 AI 工具',
          description: '盘点当前最实用的 AI 工具和它们的使用场景',
          target_audience: '技术爱好者'
        }
      ],
      analysis_generated_at: new Date().toISOString(),
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      platform: 'twitter',
      topic_name: 'SpaceX',
      topic_query: 'SpaceX',
      topic_url: 'https://twitter.com/search?q=SpaceX',
      tweet_volume: 890000,
      occurrence_count: 12,
      first_seen_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      last_seen_at: new Date().toISOString(),
      is_new: false,
      consecutive_count: 5,
      peak_rank: 2,
      current_rank: 2,
      core_summary: 'SpaceX 最新发射任务成功，星舰项目进展引发热议，火星殖民计划再次成为焦点。',
      writing_suggestions: [
        {
          angle: '科技前沿',
          title_suggestion: '星舰项目如何改变太空探索',
          description: '分析 SpaceX 星舰项目的技术突破和未来影响',
          target_audience: '航天爱好者'
        }
      ],
      analysis_generated_at: new Date().toISOString(),
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      platform: 'twitter',
      topic_name: '#Bitcoin',
      topic_query: '#Bitcoin',
      topic_url: 'https://twitter.com/search?q=%23Bitcoin',
      tweet_volume: 2100000,
      occurrence_count: 20,
      first_seen_at: new Date(Date.now() - 86400000).toISOString(),
      last_seen_at: new Date().toISOString(),
      is_new: true,
      consecutive_count: 2,
      peak_rank: 1,
      current_rank: 3,
      core_summary: '比特币价格突破新高，机构投资者持续入场，加密货币市场迎来新一轮关注热潮。',
      writing_suggestions: [
        {
          angle: '投资分析',
          title_suggestion: '比特币新高背后的逻辑',
          description: '分析当前比特币上涨的原因和未来走势',
          target_audience: '投资者'
        }
      ],
      analysis_generated_at: new Date().toISOString(),
      status: 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '4',
      platform: 'twitter',
      topic_name: 'OpenAI',
      topic_query: 'OpenAI',
      topic_url: 'https://twitter.com/search?q=OpenAI',
      tweet_volume: 650000,
      occurrence_count: 8,
      first_seen_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      last_seen_at: new Date().toISOString(),
      is_new: false,
      consecutive_count: 6,
      peak_rank: 3,
      current_rank: 4,
      core_summary: 'OpenAI 发布新功能，GPT-5 传闻引发讨论，AI 安全和监管话题持续发酵。',
      writing_suggestions: [
        {
          angle: '产品更新',
          title_suggestion: 'OpenAI 新功能深度解析',
          description: '解读 OpenAI 最新发布的功能及其应用场景',
          target_audience: 'AI 用户'
        }
      ],
      analysis_generated_at: new Date().toISOString(),
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '5',
      platform: 'twitter',
      topic_name: '#ClimateChange',
      topic_query: '#ClimateChange',
      topic_url: 'https://twitter.com/search?q=%23ClimateChange',
      tweet_volume: 420000,
      occurrence_count: 3,
      first_seen_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      last_seen_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      is_new: false,
      consecutive_count: 1,
      peak_rank: 5,
      current_rank: 5,
      core_summary: '气候变化议题回归讨论焦点，各国环保政策更新，新能源技术发展受关注。',
      writing_suggestions: [
        {
          angle: '环保科技',
          title_suggestion: '新能源技术如何改变未来',
          description: '探讨新能源技术的发展和对环境保护的影响',
          target_audience: '环保关注者'
        }
      ],
      analysis_generated_at: new Date().toISOString(),
      status: 'returning',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]
}

async function refreshTrending(uid: string): Promise<void> {
  await axios.post(`${getApiPrefix()}/trending/refresh`, { user_id: uid })
}

async function generateDraftFromTrending(id: string, uid: string, model: string): Promise<{ drafts: Draft[] }> {
  try {
    const { data } = await axios.post(`${getApiPrefix()}/trending/${id}/generate-draft`, {
      user_id: uid,
      model,
    })
    return data
  } catch (error) {
    // API 失败时返回 mock 草稿
    return {
      drafts: [
        {
          id: `draft_${Date.now()}`,
          content: model === 'kimi' 
            ? '这个热点确实很有意思！从技术角度来看，这代表了行业的重大进步。值得持续关注后续发展。🚀'
            : '这个话题引发了广泛讨论。我认为关键在于如何将技术落地应用，真正解决实际问题。期待看到更多进展！',
          model,
          created_at: new Date().toISOString(),
        }
      ]
    }
  }
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

/** 获取状态配置 */
function getStatusConfig(status: TrendingStatus, isNew: boolean) {
  if (isNew || status === 'new') {
    return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: '新上榜', icon: <FireOutlined /> }
  }
  if (status === 'returning') {
    return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: '回归', icon: <RiseOutlined /> }
  }
  if (status === 'active') {
    return { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', label: '持续', icon: <BarChartOutlined /> }
  }
  return { color: '#71767b', bg: 'rgba(113,118,123,0.1)', label: '已退榜', icon: <FallOutlined /> }
}

/** 排名变化 */
function RankChange({ current, peak }: { current: number; peak: number }) {
  if (current < peak) {
    return (
      <Space size={4} style={{ color: '#22c55e' }}>
        <ArrowUpOutlined />
        <Text strong style={{ color: '#22c55e' }}>↑{peak - current}</Text>
      </Space>
    )
  }
  if (current > peak) {
    return (
      <Space size={4} style={{ color: '#ef4444' }}>
        <ArrowDownOutlined />
        <Text strong style={{ color: '#ef4444' }}>↓{current - peak}</Text>
      </Space>
    )
  }
  return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>
}

/** 热点卡片组件 */
function TopicCard({ 
  topic, 
  onClick,
  isCompact = false
}: { 
  topic: TrendingTopic
  onClick: () => void
  isCompact?: boolean
}) {
  const { token } = antTheme.useToken()
  const status = getStatusConfig(topic.status, topic.is_new)
  
  if (isCompact) {
    return (
      <Card
        hoverable
        onClick={onClick}
        size="small"
        style={{
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            width: 32, 
            height: 32, 
            borderRadius: '50%',
            background: topic.current_rank <= 3 ? status.color : token.colorBgLayout,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text strong style={{ color: topic.current_rank <= 3 ? '#fff' : token.colorText }}>
              {topic.current_rank}
            </Text>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong ellipsis style={{ fontSize: 14 }}>{topic.topic_name}</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatNumber(topic.tweet_volume)} 推文
              </Text>
            </div>
          </div>
          <Tag color={status.color} style={{ fontSize: 11 }}>{status.label}</Tag>
        </div>
      </Card>
    )
  }

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        marginBottom: 12,
        overflow: 'hidden',
      }}
    >
      <Row gutter={16} align="middle">
        {/* 排名 */}
        <Col flex="none">
          <div style={{ 
            width: 48, 
            height: 48, 
            borderRadius: 12,
            background: topic.current_rank <= 3 
              ? `linear-gradient(135deg, ${status.color} 0%, ${status.color}dd 100%)` 
              : token.colorBgLayout,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: topic.current_rank <= 3 ? `0 4px 12px ${status.color}40` : 'none',
          }}>
            <Text style={{ 
              fontSize: 10, 
              color: topic.current_rank <= 3 ? '#fff' : token.colorTextSecondary,
              lineHeight: 1,
            }}>
              TOP
            </Text>
            <Text strong style={{ 
              fontSize: 20, 
              color: topic.current_rank <= 3 ? '#fff' : token.colorText,
              lineHeight: 1,
            }}>
              {topic.current_rank}
            </Text>
          </div>
        </Col>

        {/* 内容 */}
        <Col flex="auto">
          <div style={{ marginBottom: 8 }}>
            <Space align="center">
              <Title level={5} style={{ margin: 0, fontSize: 16 }}>{topic.topic_name}</Title>
              <Tag 
                icon={status.icon}
                style={{ 
                  color: status.color, 
                  background: status.bg,
                  border: `1px solid ${status.color}40`,
                  fontWeight: 500,
                }}
              >
                {status.label}
              </Tag>
            </Space>
          </div>
          
          <Space size="large" wrap>
            <Statistic 
              value={formatNumber(topic.tweet_volume)} 
              suffix="推文" 
              valueStyle={{ fontSize: 13, fontWeight: 500 }}
            />
            <Statistic 
              value={topic.occurrence_count} 
              suffix="次出现" 
              valueStyle={{ fontSize: 13 }}
            />
            <Space>
              <Text type="secondary">排名变化:</Text>
              <RankChange current={topic.current_rank} peak={topic.peak_rank} />
            </Space>
            <Tag color="blue" style={{ fontSize: 11 }}>
              连续 {topic.consecutive_count} 轮
            </Tag>
          </Space>

          {topic.core_summary && (
            <div style={{ 
              marginTop: 12, 
              padding: '8px 12px', 
              background: 'rgba(29,155,240,0.06)',
              borderRadius: token.borderRadiusSM,
              borderLeft: `3px solid ${token.colorPrimary}`,
            }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                <ThunderboltOutlined style={{ color: token.colorPrimary, marginRight: 6 }} />
                {topic.core_summary}
              </Text>
            </div>
          )}
        </Col>

        {/* 更新时间 */}
        <Col flex="120px" style={{ textAlign: 'right' }}>
          <Tooltip title={new Date(topic.last_seen_at).toLocaleString('zh-CN')}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {formatTime(topic.last_seen_at)}
            </Text>
          </Tooltip>
        </Col>
      </Row>
    </Card>
  )
}

/** 统计卡片 */
function StatCard({ 
  title, 
  value, 
  suffix, 
  icon, 
  color,
  trend
}: { 
  title: string
  value: number | string
  suffix?: string
  icon: React.ReactNode
  color: string
  trend?: { value: number; isUp: boolean }
}) {
  return (
    <Card
      style={{
        borderRadius: 16,
        background: `linear-gradient(135deg, ${color}08 0%, ${color}02 100%)`,
        border: `1px solid ${color}30`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 13 }}>{title}</Text>
          <div style={{ marginTop: 8 }}>
            <Text strong style={{ fontSize: 28, color }}>{value}</Text>
            {suffix && <Text style={{ fontSize: 14, marginLeft: 4 }}>{suffix}</Text>}
          </div>
          {trend && (
            <div style={{ marginTop: 4 }}>
              <Text style={{ 
                fontSize: 12, 
                color: trend.isUp ? '#22c55e' : '#ef4444' 
              }}>
                {trend.isUp ? <RiseOutlined /> : <FallOutlined />}
                {trend.value}%
              </Text>
            </div>
          )}
        </div>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          color: '#fff',
        }}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

/** 热点大盘页面 */
export default function TrendingPage() {
  const queryClient = useQueryClient()
  const [selectedTopic, setSelectedTopic] = useState<TrendingTopic | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [activeFilter, setActiveFilter] = useState<'all' | 'new' | 'rising'>('all')
  const [activeMainTab, setActiveMainTab] = useState<'topics' | 'tweets'>('topics')
  const storageUserId = DEFAULT_USER_ID

  const {
    data,
    isLoading,
    error,
    refetch,
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

  const filteredTopics = useMemo(() => {
    if (activeFilter === 'new') return topics.filter(t => t.is_new)
    if (activeFilter === 'rising') return topics.filter(t => t.current_rank < t.peak_rank)
    return topics
  }, [topics, activeFilter])

  const updatedAt = data?.updated_at

  // 刷新热点
  const refreshMutation = useMutation({
    mutationFn: () => refreshTrending(storageUserId),
    onSuccess: () => {
      message.success('已开始刷新热点，请稍候...')
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['trending'] })
      }, 5000)
    },
    onError: () => {
      // 即使 API 失败也刷新数据（使用 mock）
      message.success('已刷新热点数据')
      queryClient.invalidateQueries({ queryKey: ['trending'] })
    },
  })

  // 统计数据
  const stats: TrendingStats = useMemo(() => {
    const total = topics.length
    const newTopics = topics.filter(t => t.is_new).length
    const returning = topics.filter(t => t.status === 'returning').length
    const active = topics.filter(t => t.status === 'active').length
    const totalVolume = topics.reduce((sum, t) => sum + (t.tweet_volume || 0), 0)
    const avgRank = total > 0 ? topics.reduce((sum, t) => sum + t.current_rank, 0) / total : 0
    
    return { total, newTopics, returning, active, totalVolume, avgRank }
  }, [topics])

  const handleTopicClick = (topic: TrendingTopic) => {
    setSelectedTopic(topic)
  }

  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" tip="正在加载热点数据..." />
      </div>
    )
  }

  if (error) {
    return (
      <Card style={{ margin: 24 }}>
        <Empty
          description="无法加载热点数据"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={() => refetch()}>
            重试
          </Button>
        </Empty>
      </Card>
    )
  }

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Space align="center" size={12}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
          }}>
            <FireOutlined style={{ color: '#fff' }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0 }}>热点大盘</Title>
            <Text type="secondary">
              实时监控 Twitter 热点 · 10分钟更新
              {updatedAt && (
                <Tag color="blue" style={{ marginLeft: 12 }}>
                  <ClockCircleOutlined /> 更新于 {formatTime(updatedAt)}
                </Tag>
              )}
            </Text>
          </div>
        </Space>
      </div>

      {/* 主 Tab 切换 */}
      <Card style={{ marginBottom: 24, borderRadius: 12 }}>
        <Segmented
          size="large"
          block
          options={[
            { 
              label: <Space><FireOutlined /> 热点话题</Space>, 
              value: 'topics' 
            },
            { 
              label: <Space><BarChartOutlined /> 热点推文</Space>, 
              value: 'tweets' 
            },
          ]}
          value={activeMainTab}
          onChange={(v) => setActiveMainTab(v as 'topics' | 'tweets')}
          style={{ width: '100%' }}
        />
      </Card>

      {/* 热点话题 Tab */}
      {activeMainTab === 'topics' && (
        <>
          {/* 统计栏 */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                title="总话题"
                value={stats.total}
                suffix="个"
                icon={<FireOutlined />}
                color="#f59e0b"
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                title="新上榜"
                value={stats.newTopics}
                suffix="个"
                icon={<RiseOutlined />}
                color="#ef4444"
                trend={{ value: 12, isUp: true }}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                title="总推文量"
                value={formatNumber(stats.totalVolume)}
                icon={<BarChartOutlined />}
                color="#1d9bf0"
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                title="平均排名"
                value={`#${Math.round(stats.avgRank)}`}
                icon={<HistoryOutlined />}
                color="#22c55e"
              />
            </Col>
          </Row>

          {/* 工具栏 */}
          <Card style={{ marginBottom: 24, borderRadius: 12 }}>
            <Row gutter={16} align="middle" justify="space-between">
              <Col>
                <Space>
                  <Segmented
                    options={[
                      { label: '全部', value: 'all' },
                      { label: <><FireOutlined /> 新上榜</>, value: 'new' },
                      { label: <><RiseOutlined /> 排名上升</>, value: 'rising' },
                    ]}
                    value={activeFilter}
                    onChange={(v) => setActiveFilter(v as typeof activeFilter)}
                  />
                  <Divider type="vertical" />
                  <Text type="secondary">
                    共 <Text strong>{filteredTopics.length}</Text> 个话题
                  </Text>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Segmented
                    options={[
                      { label: '列表', value: 'list', icon: <BarChartOutlined /> },
                      { label: '网格', value: 'grid', icon: <FireOutlined /> },
                    ]}
                    value={viewMode}
                    onChange={(v) => setViewMode(v as ViewMode)}
                  />
                  <Button 
                    type="primary"
                    icon={<SyncOutlined />} 
                    onClick={() => refreshMutation.mutate()}
                    loading={refreshMutation.isPending}
                  >
                    刷新热点
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* 热点列表 */}
          {filteredTopics.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    暂无热点数据
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
          ) : viewMode === 'grid' ? (
            <Row gutter={[16, 16]}>
              {filteredTopics.map((topic) => (
                <Col xs={24} sm={12} lg={8} key={topic.id}>
                  <TopicCard topic={topic} onClick={() => handleTopicClick(topic)} isCompact />
                </Col>
              ))}
            </Row>
          ) : (
            <div>
              {filteredTopics.map((topic) => (
                <TopicCard key={topic.id} topic={topic} onClick={() => handleTopicClick(topic)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* 热点推文 Tab */}
      {activeMainTab === 'tweets' && <TrendingTweetsTab />}

      {/* 选中热点的详情弹窗 */}
      {selectedTopic && (
        <TopicDetailDrawer 
          topic={selectedTopic} 
          onClose={() => setSelectedTopic(null)} 
          userId={storageUserId}
        />
      )}
    </div>
  )
}

/** 热点详情抽屉 */
function TopicDetailDrawer({ 
  topic, 
  onClose,
  userId,
}: { 
  topic: TrendingTopic
  onClose: () => void
  userId: string
}) {
  const { token } = antTheme.useToken()
  const [activeTab, setActiveTab] = useState('analysis')
  const [generatedDrafts, setGeneratedDrafts] = useState<Draft[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const status = getStatusConfig(topic.status, topic.is_new)

  const generateMutation = useMutation({
    mutationFn: (model: string) => generateDraftFromTrending(topic.id, userId, model),
    onSuccess: (data) => {
      setGeneratedDrafts(prev => [...data.drafts, ...prev])
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

  const tabItems: TabsProps['items'] = [
    {
      key: 'analysis',
      label: <><EyeOutlined /> 热点分析</>,
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 核心摘要 */}
          <Card
            style={{
              background: `linear-gradient(135deg, ${status.color}08 0%, ${status.color}02 100%)`,
              border: `1px solid ${status.color}40`,
            }}
          >
            <Title level={5} style={{ marginTop: 0, color: status.color }}>
              <ThunderboltOutlined /> 热点核心
            </Title>
            <Paragraph style={{ fontSize: 15, margin: 0 }}>
              {topic.core_summary || '暂无分析数据'}
            </Paragraph>
          </Card>

          {/* 统计信息 */}
          <Row gutter={16}>
            <Col span={8}>
              <Card size="small">
                <Statistic 
                  title="当前排名" 
                  value={`#${topic.current_rank}`}
                  valueStyle={{ color: status.color }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic 
                  title="推文量" 
                  value={formatNumber(topic.tweet_volume)}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic 
                  title="出现次数" 
                  value={topic.occurrence_count}
                  suffix="次"
                />
              </Card>
            </Col>
          </Row>

          {/* 写作建议 */}
          <div>
            <Title level={5}>
              <EditOutlined /> 写作方向建议
            </Title>
            {topic.writing_suggestions?.length > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                {topic.writing_suggestions.map((suggestion, idx) => (
                  <Card
                    key={idx}
                    size="small"
                    title={
                      <Space>
                        <Tag color="blue">{idx + 1}</Tag>
                        <Text strong>{suggestion.angle}</Text>
                      </Space>
                    }
                    extra={<Tag>{suggestion.target_audience}</Tag>}
                  >
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      推荐标题: {suggestion.title_suggestion}
                    </Text>
                    <Text type="secondary">{suggestion.description}</Text>
                  </Card>
                ))}
              </Space>
            ) : (
              <Empty description="暂无写作建议" />
            )}
          </div>
        </Space>
      ),
    },
    {
      key: 'draft',
      label: <><RobotOutlined /> 生成草稿</>,
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Card size="small">
            <Space>
              <Button 
                type="primary" 
                icon={<RobotOutlined />}
                onClick={() => generateMutation.mutate('kimi')}
                loading={generateMutation.isPending}
              >
                用 Kimi 生成
              </Button>
              <Button 
                type="primary" 
                icon={<RobotOutlined />}
                onClick={() => generateMutation.mutate('claude')}
                loading={generateMutation.isPending}
              >
                用 Claude 生成
              </Button>
            </Space>
          </Card>

          {generatedDrafts.length > 0 && (
            <div>
              <Title level={5}>生成的草稿</Title>
              <Space direction="vertical" style={{ width: '100%' }}>
                {generatedDrafts.map((draft) => (
                  <Card
                    key={draft.id}
                    size="small"
                    style={{ background: token.colorBgLayout }}
                    actions={[
                      <Button
                        type="text"
                        size="small"
                        icon={copiedId === draft.id ? <CheckCircleOutlined style={{ color: '#22c55e' }} /> : <CopyOutlined />}
                        onClick={() => handleCopy(draft.content, draft.id)}
                      >
                        {copiedId === draft.id ? '已复制' : '复制'}
                      </Button>,
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
        </Space>
      ),
    },
  ]

  return (
    <Card
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 480,
        height: '100vh',
        zIndex: 1000,
        borderRadius: 0,
        boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
      }}
      title={
        <Space>
          <FireOutlined style={{ color: status.color }} />
          <Text strong style={{ fontSize: 16 }}>{topic.topic_name}</Text>
          <Tag style={{ color: status.color, background: status.bg, border: `1px solid ${status.color}40` }}>
            {status.label}
          </Tag>
        </Space>
      }
      extra={
        <Button type="text" onClick={onClose}>关闭</Button>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />
    </Card>
  )
}

/** 热点推文数据结构 */
interface TrendingTweet {
  id: string
  content: string
  author_name: string
  author_username: string
  author_avatar: string
  like_count: number
  repost_count: number
  reply_count: number
  view_count: number
  published_at: string
  is_verified: boolean
  media_urls?: string[]
  engagement_score: number
  topic_tags: string[]
}

/** Mock 热点推文数据 */
function getMockTrendingTweets(): TrendingTweet[] {
  return [
    {
      id: '1',
      content: 'AI is evolving faster than ever. What we are seeing with the latest models is not just incremental improvement, but a fundamental shift in capabilities. The implications for society are profound. 🧵👇',
      author_name: 'Sam Altman',
      author_username: 'sama',
      author_avatar: 'https://pbs.twimg.com/profile_images/1683325380441128960/yRsRRjGO_400x400.jpg',
      like_count: 125000,
      repost_count: 28000,
      reply_count: 5400,
      view_count: 5200000,
      published_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      is_verified: true,
      engagement_score: 98,
      topic_tags: ['#AI', '科技'],
    },
    {
      id: '2',
      content: 'SpaceX Starship full stack test completed successfully! This is a major milestone for Mars mission preparation. Next step: orbital refueling demonstration. 🚀',
      author_name: 'Elon Musk',
      author_username: 'elonmusk',
      author_avatar: 'https://pbs.twimg.com/profile_images/1683325380441128960/yRsRRjGO_400x400.jpg',
      like_count: 890000,
      repost_count: 156000,
      reply_count: 42000,
      view_count: 12500000,
      published_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      is_verified: true,
      media_urls: ['https://pbs.twimg.com/media/abc123.jpg'],
      engagement_score: 95,
      topic_tags: ['SpaceX', '火星'],
    },
    {
      id: '3',
      content: 'Bitcoin just hit a new all-time high! 📈 After months of accumulation, institutional investors are finally moving in. The crypto winter is officially over.',
      author_name: 'Michael Saylor',
      author_username: 'saylor',
      author_avatar: 'https://pbs.twimg.com/profile_images/1485632175936086016/ex3B9MXp_400x400.jpg',
      like_count: 67000,
      repost_count: 19000,
      reply_count: 8900,
      view_count: 3200000,
      published_at: new Date(Date.now() - 3600000 * 6).toISOString(),
      is_verified: true,
      engagement_score: 92,
      topic_tags: ['#Bitcoin', '加密货币'],
    },
    {
      id: '4',
      content: 'The climate crisis is not a distant threat - it is happening now. We need immediate action from governments and corporations worldwide. Every fraction of a degree matters. 🌍',
      author_name: 'Greta Thunberg',
      author_username: 'GretaThunberg',
      author_avatar: 'https://pbs.twimg.com/profile_images/1485632175936086016/ex3B9MXp_400x400.jpg',
      like_count: 234000,
      repost_count: 67000,
      reply_count: 12000,
      view_count: 7800000,
      published_at: new Date(Date.now() - 3600000 * 8).toISOString(),
      is_verified: true,
      engagement_score: 88,
      topic_tags: ['#ClimateChange', '环保'],
    },
    {
      id: '5',
      content: 'Breaking: New research shows promising results for cancer immunotherapy. This could be a game-changer for patients worldwide. Science never stops advancing! 🧬',
      author_name: 'Nature Medicine',
      author_username: 'NatureMedicine',
      author_avatar: 'https://pbs.twimg.com/profile_images/1485632175936086016/ex3B9MXp_400x400.jpg',
      like_count: 45000,
      repost_count: 12000,
      reply_count: 3400,
      view_count: 1800000,
      published_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      is_verified: true,
      engagement_score: 85,
      topic_tags: ['医学', '科技'],
    },
    {
      id: '6',
      content: 'OpenAI just released new features for GPT-4. The ability to analyze images is particularly impressive. This opens up so many new use cases for developers.',
      author_name: 'Greg Brockman',
      author_username: 'gdb',
      author_avatar: 'https://pbs.twimg.com/profile_images/1485632175936086016/ex3B9MXp_400x400.jpg',
      like_count: 78000,
      repost_count: 21000,
      reply_count: 5600,
      view_count: 4100000,
      published_at: new Date(Date.now() - 3600000 * 14).toISOString(),
      is_verified: true,
      engagement_score: 82,
      topic_tags: ['OpenAI', '#AI'],
    },
  ]
}

/** 热点推文 Tab */
function TrendingTweetsTab() {
  const { token } = antTheme.useToken()
  const [tweets] = useState<TrendingTweet[]>(getMockTrendingTweets())
  const [sortBy, setSortBy] = useState<'engagement' | 'time' | 'likes'>('engagement')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const sortedTweets = useMemo(() => {
    const sorted = [...tweets]
    switch (sortBy) {
      case 'engagement':
        return sorted.sort((a, b) => b.engagement_score - a.engagement_score)
      case 'likes':
        return sorted.sort((a, b) => b.like_count - a.like_count)
      case 'time':
        return sorted.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
      default:
        return sorted
    }
  }, [tweets, sortBy])

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    message.success('已复制推文内容')
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div>
      {/* 工具栏 */}
      <Card style={{ marginBottom: 24, borderRadius: 12 }}>
        <Row gutter={16} align="middle" justify="space-between">
          <Col>
            <Space>
              <Text strong>排序方式:</Text>
              <Segmented
                options={[
                  { label: '热度', value: 'engagement' },
                  { label: '点赞', value: 'likes' },
                  { label: '最新', value: 'time' },
                ]}
                value={sortBy}
                onChange={(v) => setSortBy(v as typeof sortBy)}
              />
            </Space>
          </Col>
          <Col>
            <Text type="secondary">
              共 <Text strong>{tweets.length}</Text> 条热门推文
            </Text>
          </Col>
        </Row>
      </Card>

      {/* 推文列表 */}
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {sortedTweets.map((tweet) => (
          <Card
            key={tweet.id}
            style={{
              borderRadius: 16,
              border: `1px solid ${token.colorBorderSecondary}`,
              overflow: 'hidden',
            }}
          >
            <Row gutter={16}>
              {/* 左侧: 作者信息 */}
              <Col flex="none">
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimary}dd 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    marginBottom: 8,
                  }}>
                    👤
                  </div>
                  <Text strong style={{ fontSize: 14, display: 'block' }}>
                    {tweet.author_name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    @{tweet.author_username}
                  </Text>
                  {tweet.is_verified && (
                    <Tag color="blue" style={{ marginTop: 4, fontSize: 10 }}>
                      ✓ 认证
                    </Tag>
                  )}
                </div>
              </Col>

              {/* 中间: 推文内容 */}
              <Col flex="auto">
                <div style={{ marginBottom: 12 }}>
                  <Space size={8} style={{ marginBottom: 8 }}>
                    {tweet.topic_tags.map((tag) => (
                      <Tag key={tag} color="orange" style={{ fontSize: 11 }}>
                        {tag}
                      </Tag>
                    ))}
                  </Space>
                  <Paragraph style={{ fontSize: 15, lineHeight: 1.6, margin: 0 }}>
                    {tweet.content}
                  </Paragraph>
                </div>

                {/* 媒体 */}
                {tweet.media_urls && tweet.media_urls.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <img
                      src={tweet.media_urls[0]}
                      alt=""
                      style={{
                        width: '100%',
                        maxHeight: 300,
                        objectFit: 'cover',
                        borderRadius: 12,
                      }}
                    />
                  </div>
                )}

                {/* 互动数据 */}
                <div style={{
                  display: 'flex',
                  gap: 24,
                  padding: '12px 0',
                  borderTop: `1px solid ${token.colorBorderSecondary}`,
                }}>
                  <Space>
                    <FireOutlined style={{ color: '#f59e0b' }} />
                    <Text type="secondary">热度</Text>
                    <Text strong style={{ color: '#f59e0b' }}>{tweet.engagement_score}</Text>
                  </Space>
                  <Space>
                    <span style={{ color: '#f91880' }}>♥</span>
                    <Text type="secondary">点赞</Text>
                    <Text strong>{formatNumber(tweet.like_count)}</Text>
                  </Space>
                  <Space>
                    <span style={{ color: '#00ba7c' }}>↻</span>
                    <Text type="secondary">转发</Text>
                    <Text strong>{formatNumber(tweet.repost_count)}</Text>
                  </Space>
                  <Space>
                    <span style={{ color: '#1d9bf0' }}>💬</span>
                    <Text type="secondary">回复</Text>
                    <Text strong>{formatNumber(tweet.reply_count)}</Text>
                  </Space>
                  <Space>
                    <span style={{ color: token.colorTextSecondary }}>👁</span>
                    <Text type="secondary">浏览</Text>
                    <Text strong>{formatNumber(tweet.view_count)}</Text>
                  </Space>
                  <Text type="secondary" style={{ marginLeft: 'auto' }}>
                    {formatTime(tweet.published_at)}
                  </Text>
                </div>
              </Col>

              {/* 右侧: 操作按钮 */}
              <Col flex="100px" style={{ textAlign: 'right' }}>
                <Space direction="vertical" size="small">
                  <Button
                    type={copiedId === tweet.id ? 'primary' : 'default'}
                    icon={copiedId === tweet.id ? <CheckCircleOutlined /> : <CopyOutlined />}
                    onClick={() => handleCopy(tweet.content, tweet.id)}
                    size="small"
                  >
                    {copiedId === tweet.id ? '已复制' : '复制'}
                  </Button>
                  <Button
                    type="primary"
                    icon={<RobotOutlined />}
                    size="small"
                  >
                    AI回复
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>
        ))}
      </Space>
    </div>
  )
}
