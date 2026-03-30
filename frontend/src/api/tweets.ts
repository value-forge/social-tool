import type {
  ApiResponse,
  PaginatedData,
  TweetFeedItem,
  TweetFeedParams,
} from '../types'
import client from './client'

export async function getTweetsFeed(
  params?: TweetFeedParams,
): Promise<PaginatedData<TweetFeedItem>> {
  const res = await client.get<ApiResponse<PaginatedData<TweetFeedItem>>>(
    '/tweets/feed',
    { params },
  )
  return res.data.data
}
