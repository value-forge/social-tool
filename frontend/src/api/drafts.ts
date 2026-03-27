import api from './auth'
import type { Draft, DraftListResponse, DraftStatus } from '../types'

interface GetDraftsParams {
  user_id: string
  platform?: string
  status?: DraftStatus
  post_id?: string
  page?: number
  page_size?: number
}

/** 获取草稿列表 */
export async function getDrafts(params: GetDraftsParams): Promise<DraftListResponse> {
  try {
    const { data } = await api.get<DraftListResponse>('/drafts', { params })
    return data
  } catch (error) {
    // API 失败时返回空数据
    console.log('Using empty drafts data')
    return {
      drafts: [],
      total: 0,
      page: params.page || 1,
      page_size: params.page_size || 10,
    }
  }
}

/** 获取草稿详情 */
export async function getDraftDetail(id: string): Promise<Draft> {
  const { data } = await api.get<Draft>(`/drafts/${id}`)
  return data
}

/** 编辑草稿 */
export async function updateDraft(
  id: string,
  draftContent: string
): Promise<{
  id: string
  draft_content: string
  status: 'edited'
  updated_at: string
}> {
  const { data } = await api.put(`/drafts/${id}`, { draft_content: draftContent })
  return data
}

/** 更新草稿状态 */
export async function updateDraftStatus(
  id: string,
  status: Extract<DraftStatus, 'copied' | 'sent'>
): Promise<void> {
  await api.patch(`/drafts/${id}/status`, { status })
}

/** 评分草稿 */
export async function rateDraft(id: string, rating: number): Promise<void> {
  await api.post(`/drafts/${id}/rate`, { rating })
}

/** 批量删除草稿 */
export async function batchDeleteDrafts(ids: string[]): Promise<void> {
  await api.post('/drafts/batch-delete', { ids })
}
