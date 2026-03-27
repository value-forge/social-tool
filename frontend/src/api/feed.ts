import api from './auth'
import type {
  FeedSummary,
  FeedSummaryDetail,
  FeedSummaryListResponse,
} from '../types'

interface GetFeedSummariesParams {
  user_id: string
  platform?: string
  page?: number
  page_size?: number
}

/** 获取信息流摘要列表 */
export async function getFeedSummaries(
  params: GetFeedSummariesParams
): Promise<FeedSummaryListResponse> {
  const { data } = await api.get<FeedSummaryListResponse>('/feed-summaries', { params })
  return data
}

/** 获取最新摘要 */
export async function getLatestFeedSummary(
  userId: string,
  platform?: string
): Promise<FeedSummary> {
  const { data } = await api.get<FeedSummary>('/feed-summaries/latest', {
    params: { user_id: userId, platform },
  })
  return data
}

/** 获取摘要详情 */
export async function getFeedSummaryDetail(id: string): Promise<FeedSummaryDetail> {
  const { data } = await api.get<FeedSummaryDetail>(`/feed-summaries/${id}`)
  return data
}
