import api from './auth'
import type { Tweet, TweetComment, LLMModel } from '../types'
import { getMockTweetDetail, generateMockDrafts } from './mockTweetDetail'

interface TweetDetailResponse {
  tweet: Tweet
  comments: TweetComment[]
  existing_drafts: Array<{
    id: string
    draft_content: string
    model: string
    status: string
    created_at: string
  }>
}

interface GenerateDraftResponse {
  drafts: Array<{
    id: string
    content: string
    model: LLMModel
    created_at: string
  }>
}

const DEFAULT_USER_ID = import.meta.env.VITE_TWITTER_USERNAME || 'default_0xziheng'

/** 获取推文详情 */
export async function getTweetDetail(tweetId: string, userId: string = DEFAULT_USER_ID): Promise<TweetDetailResponse> {
  try {
    const { data } = await api.get(`/tweets/${tweetId}`, {
      params: { user_id: userId }
    })
    return data
  } catch (error) {
    console.error('Failed to get tweet detail:', error)
    // 如果 API 失败，返回 mock 数据
    return getMockTweetDetail(tweetId)
  }
}

/** 生成回复草稿 */
export async function generateDraft(
  tweetId: string, 
  userId: string = DEFAULT_USER_ID, 
  model: LLMModel = 'kimi',
  tone: string = 'friendly',
  prompt?: string
): Promise<GenerateDraftResponse> {
  try {
    const { data } = await api.post(`/tweets/${tweetId}/generate-draft`, {
      user_id: userId,
      model,
      tone,
      prompt
    })
    return data
  } catch (error) {
    console.error('Failed to generate draft:', error)
    // 如果 API 失败，使用 mock 生成
    return generateMockDrafts(model, prompt, tone)
  }
}

/** 批量生成草稿（多个模型） */
export async function batchGenerateDrafts(
  tweetId: string,
  userId: string = DEFAULT_USER_ID,
  tone: string = 'friendly'
): Promise<GenerateDraftResponse> {
  try {
    const { data } = await api.post(`/tweets/${tweetId}/generate-batch`, {
      user_id: userId,
      tone
    })
    return data
  } catch (error) {
    console.error('Failed to batch generate drafts:', error)
    // 如果 API 失败，使用 mock 批量生成
    const results: GenerateDraftResponse['drafts'] = []
    for (const model of ['kimi', 'claude'] as LLMModel[]) {
      const mockData = await generateMockDrafts(model, undefined, tone)
      results.push(...mockData.drafts)
    }
    return { drafts: results }
  }
}
