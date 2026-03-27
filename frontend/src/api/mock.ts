import type {
  User,
  MonitoredAccount,
  Tweet,
  TweetComment,
  TrendingTopic,
  Draft,
  FeedSummary,
  UserSettings,
  NotifyChannel,
  PlatformConnection,
  PlatformInfo,
} from '../types'

// ============================================
// Mock 用户
// ============================================
export const MOCK_USER: User = {
  id: 'mock_user_001',
  twitter_id: '1234567890',
  twitter_username: '0xziheng',
  display_name: 'Ziheng',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ziheng',
  email: 'ziheng@example.com',
}

// ============================================
// Mock 监控账号
// ============================================
export const MOCK_MONITORED_ACCOUNTS: MonitoredAccount[] = [
  {
    id: 'acc_001',
    platform_user_id: '44196397',
    platform: 'twitter',
    username: 'elonmusk',
    display_name: 'Elon Musk',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=elon',
    bio: 'Mars & Cars',
    follower_count: 180000000,
    following_count: 500,
    is_blue_verified: true,
    enabled: true,
    tags: ['tech', 'space'],
    created_at: '2026-03-15T10:00:00Z',
    updated_at: '2026-03-15T10:00:00Z',
  },
  {
    id: 'acc_002',
    platform_user_id: '2345678901',
    platform: 'twitter',
    username: 'naval',
    display_name: 'Naval',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=naval',
    bio: 'Founder of @AngelList. Investor in 100+ companies.',
    follower_count: 2500000,
    following_count: 800,
    is_blue_verified: true,
    enabled: true,
    tags: ['startup', 'philosophy'],
    created_at: '2026-03-16T10:00:00Z',
    updated_at: '2026-03-16T10:00:00Z',
  },
  {
    id: 'acc_003',
    platform_user_id: '3456789012',
    platform: 'twitter',
    username: 'pmarca',
    display_name: 'Marc Andreessen',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=marc',
    bio: 'Co-founder @a16z. Software is eating the world.',
    follower_count: 1200000,
    following_count: 200,
    is_blue_verified: true,
    enabled: true,
    tags: ['vc', 'tech'],
    created_at: '2026-03-17T10:00:00Z',
    updated_at: '2026-03-17T10:00:00Z',
  },
]

// ============================================
// Mock 推文评论
// ============================================
export const MOCK_TWEET_COMMENTS: TweetComment[] = [
  {
    id: 'comment_001',
    platform_comment_id: '1901234567891',
    author_username: 'user_a',
    author_display_name: 'User A',
    author_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user_a',
    author_is_blue_verified: false,
    content: "Can't wait! This is huge for the space industry! 🚀",
    like_count: 5200,
    published_at: '2026-03-21T08:30:00Z',
    is_reply: false,
  },
  {
    id: 'comment_002',
    platform_comment_id: '1901234567892',
    author_username: 'user_b',
    author_display_name: 'User B',
    author_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user_b',
    author_is_blue_verified: true,
    content: 'When exactly? Any specific dates?',
    like_count: 3100,
    published_at: '2026-03-21T08:45:00Z',
    is_reply: false,
  },
  {
    id: 'comment_003',
    platform_comment_id: '1901234567893',
    author_username: 'user_c',
    author_display_name: 'Space Enthusiast',
    author_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=space',
    author_is_blue_verified: false,
    content: 'History in the making! So excited for this milestone.',
    like_count: 2800,
    published_at: '2026-03-21T09:00:00Z',
    is_reply: false,
  },
]

// ============================================
// Mock 推文
// ============================================
export const MOCK_TWEETS: Tweet[] = [
  {
    id: 'tweet_001',
    platform_post_id: '1901234567890',
    platform: 'twitter',
    account_id: 'acc_001',
    author_username: 'elonmusk',
    author_display_name: 'Elon Musk',
    author_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=elon',
    author_is_blue_verified: true,
    content: 'Exciting progress on Starship. Full stack test flight soon! 🚀',
    media_urls: [],
    post_url: 'https://x.com/elonmusk/status/1901234567890',
    published_at: '2026-03-21T08:00:00Z',
    like_count: 125000,
    repost_count: 35000,
    reply_count: 8200,
    view_count: 1500000,
    is_reply: false,
    is_quote: false,
    language: 'en',
    content_summary: 'SpaceX 星舰全栈测试飞行即将进行',
    content_key_points: ['星舰开发取得重大进展', '全栈测试飞行时间临近', '暗示可能有更多技术细节公布'],
    draft_generated: true,
    fetched_at: '2026-03-21T08:05:00Z',
  },
  {
    id: 'tweet_002',
    platform_post_id: '1901234567894',
    platform: 'twitter',
    account_id: 'acc_002',
    author_username: 'naval',
    author_display_name: 'Naval',
    author_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=naval',
    author_is_blue_verified: true,
    content: 'The best founders are artists in their domain. They see patterns others miss.',
    media_urls: [],
    post_url: 'https://x.com/naval/status/1901234567894',
    published_at: '2026-03-21T07:30:00Z',
    like_count: 5300,
    repost_count: 890,
    reply_count: 120,
    view_count: 45000,
    is_reply: false,
    is_quote: false,
    language: 'en',
    content_summary: '优秀创始人是领域内的艺术家，能看到他人忽视的模式',
    draft_generated: false,
    fetched_at: '2026-03-21T07:35:00Z',
  },
  {
    id: 'tweet_003',
    platform_post_id: '1901234567895',
    platform: 'twitter',
    account_id: 'acc_001',
    author_username: 'elonmusk',
    author_display_name: 'Elon Musk',
    author_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=elon',
    author_is_blue_verified: true,
    content: 'AI is advancing at an incredible pace. The rate of improvement is exponential.',
    media_urls: [],
    post_url: 'https://x.com/elonmusk/status/1901234567895',
    published_at: '2026-03-20T18:00:00Z',
    like_count: 98000,
    repost_count: 28000,
    reply_count: 15000,
    view_count: 2000000,
    is_reply: false,
    is_quote: false,
    language: 'en',
    content_summary: 'AI 发展速度惊人，呈指数级改进',
    draft_generated: true,
    fetched_at: '2026-03-20T18:05:00Z',
  },
]

// ============================================
// Mock 热点话题
// ============================================
export const MOCK_TRENDING: TrendingTopic[] = [
  {
    id: 'trend_001',
    platform: 'twitter',
    topic_name: '#SpaceX',
    topic_query: '%23SpaceX',
    topic_url: 'https://x.com/search?q=%23SpaceX',
    tweet_volume: 125000,
    occurrence_count: 12,
    first_seen_at: '2026-03-20T14:00:00Z',
    last_seen_at: '2026-03-21T10:00:00Z',
    is_new: true,
    consecutive_count: 3,
    peak_rank: 1,
    current_rank: 1,
    core_summary: 'SpaceX 星舰即将进行全栈测试飞行，Elon Musk 在推特上发布了最新进展，引发全球航天爱好者热议',
    writing_suggestions: [
      {
        angle: '技术解读',
        title_suggestion: '星舰全栈测试的技术挑战与突破',
        description: '面向航天技术爱好者，解读试飞的技术难点和突破意义',
        target_audience: '航天技术爱好者',
      },
      {
        angle: '行业影响',
        title_suggestion: 'SpaceX 试飞成功将如何改变商业航天格局',
        description: '分析试飞成功对商业航天产业的深远影响',
        target_audience: '投资者和行业从业者',
      },
      {
        angle: '热点评论',
        title_suggestion: '为什么全世界都在关注这次星舰试飞',
        description: '通俗解读热点背景，让更多人理解航天探索的意义',
        target_audience: '大众读者',
      },
    ],
    analysis_generated_at: '2026-03-21T10:00:00Z',
    status: 'new',
    created_at: '2026-03-20T14:00:00Z',
    updated_at: '2026-03-21T10:00:00Z',
  },
  {
    id: 'trend_002',
    platform: 'twitter',
    topic_name: '#AI',
    topic_query: '%23AI',
    topic_url: 'https://x.com/search?q=%23AI',
    tweet_volume: 89000,
    occurrence_count: 48,
    first_seen_at: '2026-02-01T10:00:00Z',
    last_seen_at: '2026-03-21T10:00:00Z',
    is_new: false,
    consecutive_count: 48,
    peak_rank: 1,
    current_rank: 2,
    core_summary: '人工智能持续是全球热议话题，各大科技公司竞相发布新模型',
    writing_suggestions: [
      {
        angle: '技术趋势',
        title_suggestion: '2026年 AI 发展的五大趋势预测',
        description: '从技术角度分析 AI 发展方向',
        target_audience: '技术从业者',
      },
    ],
    analysis_generated_at: '2026-03-21T10:00:00Z',
    status: 'active',
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-03-21T10:00:00Z',
  },
  {
    id: 'trend_003',
    platform: 'twitter',
    topic_name: '#Bitcoin',
    topic_query: '%23Bitcoin',
    topic_url: 'https://x.com/search?q=%23Bitcoin',
    tweet_volume: 76000,
    occurrence_count: 36,
    first_seen_at: '2026-01-15T08:00:00Z',
    last_seen_at: '2026-03-21T10:00:00Z',
    is_new: false,
    consecutive_count: 15,
    peak_rank: 1,
    current_rank: 3,
    core_summary: '比特币价格波动引发加密货币社区热议',
    writing_suggestions: [],
    analysis_generated_at: '2026-03-21T10:00:00Z',
    status: 'active',
    created_at: '2026-01-15T08:00:00Z',
    updated_at: '2026-03-21T10:00:00Z',
  },
  {
    id: 'trend_004',
    platform: 'twitter',
    topic_name: 'Trump',
    topic_query: 'Trump',
    topic_url: 'https://x.com/search?q=Trump',
    tweet_volume: 63000,
    occurrence_count: 3,
    first_seen_at: '2026-03-18T12:00:00Z',
    last_seen_at: '2026-03-21T10:00:00Z',
    is_new: false,
    consecutive_count: 3,
    peak_rank: 2,
    current_rank: 4,
    core_summary: '特朗普相关新闻再次成为热点话题',
    writing_suggestions: [],
    status: 'returning',
    created_at: '2026-03-18T12:00:00Z',
    updated_at: '2026-03-21T10:00:00Z',
  },
  {
    id: 'trend_005',
    platform: 'twitter',
    topic_name: '#OpenAI',
    topic_query: '%23OpenAI',
    topic_url: 'https://x.com/search?q=%23OpenAI',
    tweet_volume: 52000,
    occurrence_count: 8,
    first_seen_at: '2026-03-19T09:00:00Z',
    last_seen_at: '2026-03-21T10:00:00Z',
    is_new: true,
    consecutive_count: 2,
    peak_rank: 5,
    current_rank: 5,
    core_summary: 'OpenAI 发布新功能引发开发者社区热议',
    writing_suggestions: [
      {
        angle: '开发者视角',
        title_suggestion: 'OpenAI 新功能对开发者的影响',
        description: '从技术实现角度分析新功能的应用场景',
        target_audience: '开发者',
      },
    ],
    analysis_generated_at: '2026-03-21T10:00:00Z',
    status: 'new',
    created_at: '2026-03-19T09:00:00Z',
    updated_at: '2026-03-21T10:00:00Z',
  },
]

// ============================================
// Mock 草稿
// ============================================
export const MOCK_DRAFTS: Draft[] = [
  {
    id: 'draft_001',
    post_id: 'tweet_001',
    platform: 'twitter',
    original_content: 'Exciting progress on Starship. Full stack test flight soon! 🚀',
    draft_content: 'This is a monumental step for space exploration! The Starship full stack test represents years of innovation. Can\'t wait to see the results! 🚀✨',
    model: 'kimi',
    prompt_used: 'Generate a positive reply to this tweet about SpaceX Starship',
    tone: 'enthusiastic',
    status: 'generated',
    created_at: '2026-03-21T08:10:00Z',
    updated_at: '2026-03-21T08:10:00Z',
    post: {
      platform_post_id: '1901234567890',
      author_username: 'elonmusk',
      content: 'Exciting progress on Starship. Full stack test flight soon! 🚀',
      post_url: 'https://x.com/elonmusk/status/1901234567890',
    },
  },
  {
    id: 'draft_002',
    post_id: 'tweet_001',
    platform: 'twitter',
    original_content: 'Exciting progress on Starship. Full stack test flight soon! 🚀',
    draft_content: 'The pace of innovation at SpaceX continues to amaze. Each milestone brings us closer to making life multi-planetary. Rooting for the team! 🚀🌎➡️🔴',
    model: 'claude',
    prompt_used: 'Generate a thoughtful reply to this tweet about SpaceX Starship',
    tone: 'thoughtful',
    status: 'copied',
    copied_at: '2026-03-21T08:15:00Z',
    rating: 5,
    created_at: '2026-03-21T08:12:00Z',
    updated_at: '2026-03-21T08:15:00Z',
    post: {
      platform_post_id: '1901234567890',
      author_username: 'elonmusk',
      content: 'Exciting progress on Starship. Full stack test flight soon! 🚀',
      post_url: 'https://x.com/elonmusk/status/1901234567890',
    },
  },
]

// ============================================
// Mock 信息流摘要
// ============================================
export const MOCK_FEED_SUMMARIES: FeedSummary[] = [
  {
    id: 'summary_001',
    platform: 'twitter',
    fetched_at: '2026-03-21T10:00:00Z',
    post_count: 47,
    summary_content: '今日 Twitter 信息流中，SpaceX 星舰测试进展成为最大热点，Elon Musk 发布了多条相关推文。AI 领域讨论持续活跃，特别是关于大模型能力提升的讨论。创业和 VC 领域，Naval 和 Marc Andreessen 分享了关于优秀创始人特质的见解。',
    highlights: [
      {
        type: 'hot_topic',
        title: 'SpaceX 星舰测试',
        description: 'Elon Musk 发布星舰全栈测试进展，引发热议',
        related_post_ids: ['tweet_001'],
      },
      {
        type: 'key_opinion',
        title: '优秀创始人特质',
        description: 'Naval 分享关于创始人应具备的艺术家特质的观点',
        related_post_ids: ['tweet_002'],
      },
    ],
    created_at: '2026-03-21T10:00:00Z',
  },
]

// ============================================
// Mock 用户设置
// ============================================
export const MOCK_USER_SETTINGS: UserSettings = {
  user_id: 'mock_user_001',
  poll_interval_minutes: 10,
  feed_poll_interval_minutes: 5,
  default_llm_model: 'kimi',
  default_reply_prompt: '生成一条友好、专业的回复，不超过 280 字符',
  default_reply_tone: 'friendly',
  notify_on_new_post: true,
  notify_on_draft_ready: true,
  notify_on_trending: true,
  notify_on_feed_summary: false,
  timezone: 'Asia/Shanghai',
  language: 'zh-CN',
  created_at: '2026-03-15T10:00:00Z',
  updated_at: '2026-03-21T08:00:00Z',
}

// ============================================
// Mock 推送通道
// ============================================
export const MOCK_NOTIFY_CHANNELS: NotifyChannel[] = [
  {
    id: 'channel_001',
    type: 'dingtalk',
    name: '我的运营群',
    webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=***abcd',
    enabled: true,
    notify_events: ['new_post', 'draft_ready', 'trending'],
    created_at: '2026-03-16T10:00:00Z',
  },
]

// ============================================
// Mock 平台连接
// ============================================
export const MOCK_PLATFORM_CONNECTIONS: PlatformConnection[] = [
  {
    id: 'conn_001',
    platform: 'twitter',
    platform_user_id: '1234567890',
    platform_username: '0xziheng',
    platform_display_name: 'Ziheng',
    platform_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ziheng',
    status: 'active',
    token_expires_at: '2026-04-15T10:00:00Z',
    auto_connected: true,
    connected_at: '2026-03-15T10:00:00Z',
    last_synced_at: '2026-03-21T10:00:00Z',
  },
]

// ============================================
// Mock 平台信息
// ============================================
export const MOCK_PLATFORMS: PlatformInfo[] = [
  {
    type: 'twitter',
    display_name: 'Twitter / X',
    icon_url: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/twitter/twitter-original.svg',
    is_available: true,
    description: '全球领先的社交媒体平台',
  },
  {
    type: 'xiaohongshu',
    display_name: '小红书',
    icon_url: '',
    is_available: false,
    description: '国内流行的生活方式分享社区',
  },
  {
    type: 'tiktok',
    display_name: 'TikTok',
    icon_url: '',
    is_available: false,
    description: '全球短视频平台',
  },
  {
    type: 'farcaster',
    display_name: 'Farcaster',
    icon_url: '',
    is_available: false,
    description: '去中心化社交协议',
  },
]
