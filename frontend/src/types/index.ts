// ============================================
// 通用
// ============================================

/** 通用 API 响应 */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

/** 通用分页响应 */
export interface PaginatedData<T> {
  total: number
  page: number
  limit: number
  list: T[]
}

// ============================================
// 认证 — POST /auth/login
// ============================================

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginData {
  token: string
  expiresIn: number
  user: LoginUser
}

export interface LoginUser {
  id: string
  email: string
  name: string
}

// ============================================
// 用户 — GET /user/me
// ============================================

export interface UserMe {
  id: string
  email: string
  name: string
  avatar: string
  twitter: {
    username: string
  } | null
  settings: {
    dingtalkWebhook: string
  }
  notifications: {
    dingtalk: boolean
  }
}

// ============================================
// 监控账号 — GET /monitors
// ============================================

export interface Profile {
  displayName: string
  avatar: string
  bio: string
  verified: boolean
  location: string
  website: string
}

export interface UserStats {
  followersCount: number
  followingCount: number
  tweetsCount: number
  updatedAt: string
}

/** GET /monitors → list[] */
export interface MonitorAccount {
  id: string
  twitterUserId: string
  status: 1 | -1
  notes: string
  ct: string
  ut: string
  username: string
  profile: Profile
  stats: UserStats
  monitorStatus: 1 | -1
  lastFetchedAt: string
}

/** GET /monitors 查询参数 */
export interface MonitorListParams {
  page?: number
  limit?: number
  status?: 1 | -1
}

/** POST /monitors/add 请求 */
export interface AddMonitorRequest {
  username: string
  notes?: string
}

/** POST /monitors/add 响应 */
export interface AddMonitorData {
  id: string
  twitterUserId: string
  username: string
  status: 1
  notes: string
  profile: Pick<Profile, 'displayName' | 'avatar' | 'bio' | 'verified'>
  stats: Pick<UserStats, 'followersCount' | 'followingCount' | 'tweetsCount'>
  ct: string
}

/** PUT /monitors/:id 请求 */
export interface UpdateMonitorRequest {
  status?: 1 | -1
  notes?: string
}

/** PUT /monitors/:id 响应 */
export interface UpdateMonitorData {
  id: string
  status: 1 | -1
  notes: string
  ut: string
}

// ============================================
// 推文动态 — GET /tweets/feed
// ============================================

export interface TweetMedia {
  type: 'photo' | 'video' | 'gif'
  url: string
}

export interface TweetMetrics {
  retweetCount: number
  replyCount: number
  likeCount: number
  viewCount: number
}

export interface AISuggestion {
  type: 'data' | 'insight' | 'humor' | 'story' | 'professional'
  content: string
  reason: string
}

export interface AISuggestions {
  score: number
  summary: string
  suggestion: AISuggestion
}

export interface TweetAuthor {
  username: string
  profile: Pick<Profile, 'displayName' | 'avatar'>
  stats: Pick<UserStats, 'followersCount'>
}

/** GET /tweets/feed → list[] */
export interface TweetFeedItem {
  id: string
  tweetId: string
  twitterUserId: string
  twitterId: string
  url: string
  text: string
  type: 'original' | 'reply' | 'retweet' | 'quote'
  media: TweetMedia[]
  metrics: TweetMetrics
  publishedAt: string
  fetchedAt: string
  aiStatus: -1 | 1 | -2
  aiAnalyzedAt: string | null
  aiSuggestions: AISuggestions | null
  author: TweetAuthor | null
}

/** GET /tweets/feed 查询参数 */
export interface TweetFeedParams {
  page?: number
  limit?: number
  twitterUserId?: string
  aiStatus?: -1 | 1 | -2
  type?: 'original' | 'reply' | 'retweet' | 'quote'
  startDate?: string
  endDate?: string
}

// ============================================
// 统计 — GET /stats/overview
// ============================================

export interface StatsOverview {
  monitors: {
    total: number
    active: number
    paused: number
  }
  tweets: {
    total: number
    today: number
    pending: number
    completed: number
    failed: number
  }
  ai: {
    avgScore: number
    highScoreCount: number
  }
  dingtalk: {
    todaySent: number
  }
}
