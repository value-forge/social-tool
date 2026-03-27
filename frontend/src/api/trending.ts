import api from './auth'
import type {
  TrendingTopic,
  TrendingListResponse,
  TrendingSnapshot,
  TrendingSnapshotDetail,
  Draft,
  LLMModel,
} from '../types'

interface GetTrendingParams {
  user_id: string
  platform?: string
}

/** 获取热点列表 */
export async function getTrendingTopics(
  params: GetTrendingParams
): Promise<TrendingListResponse> {
  const { data } = await api.get<TrendingListResponse>('/trending', { params })
  return data
}

/** 刷新热点 */
export async function refreshTrending(userId: string): Promise<{ message: string }> {
  const { data } = await api.post('/trending/refresh', { user_id: userId })
  return data
}

/** 获取热点详情 */
export async function getTrendingTopicDetail(id: string): Promise<TrendingTopic> {
  const { data } = await api.get<TrendingTopic>(`/trending/${id}`)
  return data
}

/** 基于热点生成推文草稿 */
export async function generateDraftFromTrending(
  id: string,
  userId: string,
  model: LLMModel
): Promise<{ drafts: Draft[] }> {
  const { data } = await api.post(`/trending/${id}/generate-draft`, {
    user_id: userId,
    model,
  })
  return data
}

/** 获取历史快照列表 */
export async function getTrendingSnapshots(
  platform?: string,
  page?: number,
  page_size?: number
): Promise<{ snapshots: TrendingSnapshot[]; total: number }> {
  const { data } = await api.get('/trending/snapshots', {
    params: { platform, page, page_size },
  })
  return data
}

/** 获取快照详情 */
export async function getTrendingSnapshotDetail(
  id: string
): Promise<TrendingSnapshotDetail> {
  const { data } = await api.get<TrendingSnapshotDetail>(`/trending/snapshots/${id}`)
  return data
}
