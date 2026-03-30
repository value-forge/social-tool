import type { ApiResponse, StatsOverview } from '../types'
import client from './client'

export async function getStatsOverview(): Promise<StatsOverview> {
  const res = await client.get<ApiResponse<StatsOverview>>('/stats/overview')
  return res.data.data
}
