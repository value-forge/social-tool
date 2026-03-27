// ============================================
// 认证相关类型
// ============================================

export interface User {
  id: string
  twitter_id: string
  twitter_username: string
  display_name: string
  avatar_url: string
  email?: string
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
}

export interface OAuthURLResponse {
  url: string
  state: string
  code_verifier: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user: User
}

// ============================================
// 平台相关类型
// ============================================

export type PlatformType = 'twitter' | 'xiaohongshu' | 'tiktok' | 'douyin' | 'farcaster' | 'telegram' | 'discord' | 'instagram'

export interface PlatformInfo {
  type: PlatformType
  display_name: string
  icon_url: string
  is_available: boolean
  description: string
}

export type PlatformConnectionStatus = 'active' | 'expired' | 'revoked' | 'error'

export interface PlatformConnection {
  id: string
  platform: PlatformType
  platform_user_id: string
  platform_username: string
  platform_display_name: string
  platform_avatar_url: string
  status: PlatformConnectionStatus
  token_expires_at: string
  auto_connected: boolean
  connected_at: string
  last_synced_at?: string
}

// ============================================
// 关注列表相关类型
// ============================================

export interface TwitterFollowingAccount {
  platform_user_id: string
  username: string
  display_name: string
  avatar_url: string
  bio: string
  follower_count: number
  following_count: number
  is_blue_verified?: boolean
}

export interface TwitterFollowingResponse {
  accounts: TwitterFollowingAccount[]
  next_cursor: string | null
}

// ============================================
// 监控账号相关类型
// ============================================

export interface MonitoredAccount {
  id: string
  platform_user_id: string
  platform: PlatformType
  username: string
  display_name: string
  avatar_url: string
  bio: string
  follower_count: number
  following_count: number
  is_blue_verified: boolean
  enabled: boolean
  reply_prompt?: string
  reply_tone?: string
  tags: string[]
  created_at: string
  updated_at: string
  // 详情页额外字段
  recent_posts?: RecentPost[]
}

export interface RecentPost {
  id: string
  platform_post_id: string
  content: string
  published_at: string
  like_count: number
  reply_count: number
  repost_count: number
}

export interface MonitoredAccountListResponse {
  accounts: MonitoredAccount[]
  total: number
  page: number
  page_size: number
}

export interface MonitoredStatusResponse {
  status: Record<string, boolean>
}

// ============================================
// 推文/帖子相关类型
// ============================================

export interface Tweet {
  id: string
  platform_post_id: string
  platform: PlatformType
  account_id: string
  author_username: string
  author_display_name: string
  author_avatar_url: string
  author_is_blue_verified: boolean
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
  content_summary?: string
  content_key_points?: string[]
  draft_generated: boolean
  fetched_at: string
}

export interface TweetComment {
  id: string
  platform_comment_id: string
  author_username: string
  author_display_name: string
  author_avatar_url: string
  author_is_blue_verified: boolean
  content: string
  like_count: number
  published_at: string
  is_reply: boolean
  reply_to_username?: string
}

export interface TweetListResponse {
  tweets: Tweet[]
  total: number
}

export interface TweetCommentsResponse {
  comments: TweetComment[]
  total: number
}

export interface TweetDetail extends Tweet {
  top_comments: TweetComment[]
  comments_fetched_at?: string
  drafts: Draft[]
}

// ============================================
// 热点大盘相关类型
// ============================================

export type TrendingStatus = 'active' | 'faded' | 'new' | 'returning'

export interface WritingSuggestion {
  angle: string
  title_suggestion: string
  description: string
  target_audience: string
}

export interface TrendingTopic {
  id: string
  platform: PlatformType
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
  core_summary?: string
  writing_suggestions: WritingSuggestion[]
  analysis_generated_at?: string
  status: TrendingStatus
  created_at: string
  updated_at: string
}

export interface TrendingListResponse {
  topics: TrendingTopic[]
  total: number
  updated_at: string
}

export interface TrendingSnapshot {
  id: string
  platform: PlatformType
  fetched_at: string
  topic_count: number
}

export interface TrendingSnapshotDetail extends TrendingSnapshot {
  topics: Array<{
    topic_name: string
    rank: number
    tweet_volume: number | null
    is_new: boolean
  }>
}

// ============================================
// 草稿相关类型
// ============================================

export type DraftStatus = 'generated' | 'edited' | 'copied' | 'sent'
export type LLMModel = 'kimi' | 'claude'

export interface Draft {
  id: string
  post_id: string
  platform: PlatformType
  original_content: string
  draft_content: string
  model: LLMModel
  prompt_used: string
  tone: string
  status: DraftStatus
  copied_at?: string
  rating?: number
  created_at: string
  updated_at: string
  // 关联帖子信息
  post?: {
    platform_post_id: string
    author_username: string
    content: string
    post_url: string
  }
}

export interface DraftListResponse {
  drafts: Draft[]
  total: number
  page: number
  page_size: number
}

// ============================================
// 信息流摘要相关类型
// ============================================

export type HighlightType = 'hot_topic' | 'key_opinion' | 'recommended_account'

export interface Highlight {
  type: HighlightType
  title: string
  description: string
  related_post_ids: string[]
}

export interface FeedSummary {
  id: string
  platform: PlatformType
  fetched_at: string
  post_count: number
  summary_content: string
  highlights: Highlight[]
  created_at: string
}

export interface FeedSummaryDetail extends FeedSummary {
  post_snapshots: Array<{
    platform_post_id: string
    author_username: string
    content: string
    like_count: number
  }>
}

export interface FeedSummaryListResponse {
  summaries: FeedSummary[]
  total: number
}

// ============================================
// 用户设置相关类型
// ============================================

export interface UserSettings {
  user_id: string
  // 轮询配置
  poll_interval_minutes: number
  feed_poll_interval_minutes: number
  // LLM 配置
  default_llm_model: LLMModel
  default_reply_prompt: string
  default_reply_tone: string
  // 推送开关
  notify_on_new_post: boolean
  notify_on_draft_ready: boolean
  notify_on_trending: boolean
  notify_on_feed_summary: boolean
  // 其他
  timezone: string
  language: string
  created_at: string
  updated_at: string
}

// ============================================
// 推送通道相关类型
// ============================================

export type NotifyChannelType = 'dingtalk' | 'feishu' | 'slack'
export type NotifyEventType = 'new_post' | 'draft_ready' | 'trending' | 'feed_summary'

export interface NotifyChannelConfigField {
  name: string
  label: string
  type: 'text' | 'password' | 'url'
  required: boolean
  description: string
}

export interface NotifyChannelTypeInfo {
  type: NotifyChannelType
  display_name: string
  is_available: boolean
  config_fields: NotifyChannelConfigField[]
}

export interface NotifyChannel {
  id: string
  type: NotifyChannelType
  name: string
  webhook_url: string
  enabled: boolean
  notify_events: NotifyEventType[]
  created_at: string
}

export interface NotifyLog {
  id: string
  channel_type: NotifyChannelType
  channel_name: string
  event_type: NotifyEventType
  payload: object
  status: 'success' | 'failed'
  error_message?: string
  created_at: string
}

export interface NotifyLogListResponse {
  logs: NotifyLog[]
  total: number
}

// ============================================
// 通用响应类型
// ============================================

export interface ApiError {
  code: string
  message: string
  details?: object
}

export interface PaginationParams {
  page?: number
  page_size?: number
}

export interface GenericResponse {
  message: string
}
