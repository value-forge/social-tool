// 推文详情的 Mock 数据
import type { Tweet, TweetComment, LLMModel } from '../types'

const MOCK_TWEET: Tweet = {
  id: 'tweet_001',
  platform_post_id: '1901234567890',
  platform: 'twitter',
  account_id: 'acc_001',
  author_username: 'elonmusk',
  author_display_name: 'Elon Musk',
  author_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=elon',
  author_is_blue_verified: true,
  content: 'Exciting progress on Starship. Full stack test flight soon! 🚀 The team has been working around the clock to make this happen. Mars, here we come!',
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
  content_summary: 'SpaceX 星舰全栈测试飞行即将进行，团队正在全力以赴',
  content_key_points: ['星舰开发取得重大进展', '全栈测试飞行时间临近', '团队正在全力以赴'],
  draft_generated: false,
  fetched_at: '2026-03-21T08:05:00Z',
}

const MOCK_COMMENTS: TweetComment[] = [
  {
    id: 'comment_001',
    platform_comment_id: '1901234567891',
    author_username: 'user_a',
    author_display_name: 'Space Fan',
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
    author_display_name: 'Tech Insider',
    author_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user_b',
    author_is_blue_verified: true,
    content: 'When exactly? Any specific dates? The anticipation is killing me!',
    like_count: 3100,
    published_at: '2026-03-21T08:45:00Z',
    is_reply: false,
  },
  {
    id: 'comment_003',
    platform_comment_id: '1901234567893',
    author_username: 'user_c',
    author_display_name: 'Mars Enthusiast',
    author_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=space',
    author_is_blue_verified: false,
    content: 'History in the making! So excited for this milestone. Go SpaceX! 🌎➡️🔴',
    like_count: 2800,
    published_at: '2026-03-21T09:00:00Z',
    is_reply: false,
  },
  {
    id: 'comment_004',
    platform_comment_id: '1901234567894',
    author_username: 'user_d',
    author_display_name: 'Engineering Mind',
    author_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=eng',
    author_is_blue_verified: false,
    content: 'The engineering challenges they must have overcome are incredible. Would love to see a behind-the-scenes documentary.',
    like_count: 1950,
    published_at: '2026-03-21T09:15:00Z',
    is_reply: false,
  },
  {
    id: 'comment_005',
    platform_comment_id: '1901234567895',
    author_username: 'user_e',
    author_display_name: 'Future Astronaut',
    author_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=astro',
    author_is_blue_verified: true,
    content: "This is why I'm studying aerospace engineering. Dreams do come true!",
    like_count: 1650,
    published_at: '2026-03-21T09:30:00Z',
    is_reply: false,
  },
  {
    id: 'comment_006',
    platform_comment_id: '1901234567896',
    author_username: 'user_f',
    author_display_name: 'SpaceX Investor',
    author_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=investor',
    author_is_blue_verified: false,
    content: 'Long-term vision paying off. The commercial space industry is about to explode. 🚀📈',
    like_count: 1420,
    published_at: '2026-03-21T09:45:00Z',
    is_reply: false,
  },
  {
    id: 'comment_007',
    platform_comment_id: '1901234567897',
    author_username: 'user_g',
    author_display_name: 'Physics PhD',
    author_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=physics',
    author_is_blue_verified: false,
    content: 'From a physics perspective, the orbital mechanics involved in the full stack test are fascinating. Hope they share more technical details!',
    like_count: 1280,
    published_at: '2026-03-21T10:00:00Z',
    is_reply: false,
  },
  {
    id: 'comment_008',
    platform_comment_id: '1901234567898',
    author_username: 'user_h',
    author_display_name: 'STEM Teacher',
    author_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher',
    author_is_blue_verified: false,
    content: 'My students are going to love this! Using this as a case study in our next class about aerospace engineering.',
    like_count: 980,
    published_at: '2026-03-21T10:15:00Z',
    is_reply: false,
  },
  {
    id: 'comment_009',
    platform_comment_id: '1901234567899',
    author_username: 'user_i',
    author_display_name: 'Science Writer',
    author_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=writer',
    author_is_blue_verified: true,
    content: 'This moment will be remembered as a turning point in human space exploration. Great coverage coming soon on my blog!',
    like_count: 850,
    published_at: '2026-03-21T10:30:00Z',
    is_reply: false,
  },
  {
    id: 'comment_010',
    platform_comment_id: '1901234567900',
    author_username: 'user_j',
    author_display_name: 'Space Artist',
    author_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=artist',
    author_is_blue_verified: false,
    content: 'Already working on an artwork inspired by this announcement! The future is bright 🌟',
    like_count: 720,
    published_at: '2026-03-21T10:45:00Z',
    is_reply: false,
  },
]

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** 获取推文详情（Mock） */
export async function getMockTweetDetail(_tweetId: string): Promise<{
  tweet: Tweet
  comments: TweetComment[]
  existing_drafts: Array<{ id: string; draft_content: string; model: string; status: string; created_at: string }>
}> {
  await delay(800)
  return {
    tweet: MOCK_TWEET,
    comments: MOCK_COMMENTS,
    existing_drafts: [],
  }
}

/** 生成草稿（Mock） */
export async function generateMockDrafts(
  model: LLMModel,
  _prompt?: string,
  tone?: string
): Promise<{ drafts: Array<{ id: string; content: string; model: LLMModel; created_at: string }> }> {
  await delay(1500)

  const toneResponses: Record<string, string[]> = {
    friendly: [
      `This is absolutely incredible! 🚀 So excited to see SpaceX pushing the boundaries of what is possible. Can't wait for the full stack test flight! Go team! 🌟`,
      `Wow, amazing progress! The dedication of the SpaceX team is truly inspiring. Looking forward to seeing Starship fly soon! Mars awaits! 🚀🔴`,
    ],
    professional: [
      `The progress on Starship represents a significant milestone in aerospace engineering. The full stack test flight will provide critical data for future Mars missions. Looking forward to the results.`,
      `Impressive advancement in spacecraft development. The successful completion of the full stack test will be a pivotal moment for commercial space travel and interplanetary exploration.`,
    ],
    humorous: [
      `Mars: "Is that a Starship I see coming?" Earth: "Yeah, and it has got snacks!" 😄 Can't wait to see this bird fly! 🚀🍿`,
      `Plot twist: The real reason for the full stack test is to deliver pizza to the Mars colony. Priority mail! 🍕🚀😂 Excited nonetheless!`,
    ],
    concise: [
      `Exciting news! Looking forward to the test flight. 🚀`,
      `Great progress! Can't wait to see Starship fly. Go SpaceX! 🚀🔴`,
    ],
  }

  const responses = toneResponses[tone || 'friendly'] || toneResponses.friendly

  // 随机选择两条
  const selectedResponses = responses.slice(0, 2)

  return {
    drafts: selectedResponses.map((content, index) => ({
      id: `draft_${Date.now()}_${index}`,
      content,
      model,
      created_at: new Date().toISOString(),
    })),
  }
}
