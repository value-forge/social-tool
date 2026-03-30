import { useQuery } from '@tanstack/react-query'
import { getStatsOverview } from '../api/stats'

export function useStatsOverview() {
  return useQuery({
    queryKey: ['stats-overview'],
    queryFn: getStatsOverview,
    staleTime: 30_000,
    refetchInterval: 60_000, // 1 分钟轮询
  })
}
