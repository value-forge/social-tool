import { useQuery } from '@tanstack/react-query'
import type { TweetFeedParams } from '../types'
import { getTweetsFeed } from '../api/tweets'

export function useTweetsFeed(params?: TweetFeedParams) {
  return useQuery({
    queryKey: ['tweets-feed', params],
    queryFn: () => getTweetsFeed(params),
    staleTime: 30_000,
    refetchInterval: 300_000, // 5 分钟轮询
  })
}
