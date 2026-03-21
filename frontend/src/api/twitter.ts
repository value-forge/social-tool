import api from './auth'
import axios from 'axios'
import { getApiPrefix } from './apiPrefix'

export interface TwitterFollowingAccount {
  platform_user_id: string
  username: string
  display_name: string
  avatar_url: string
  bio: string
  follower_count: number
  following_count: number
  is_blue_verified?: boolean
}

export interface TwitterFollowingResponse {
  accounts: TwitterFollowingAccount[]
  next_cursor: string
}

/** 拉取当前登录用户在 X 上的关注列表（分页，使用服务端保存的 OAuth token） */
export async function getTwitterFollowing(cursor?: string): Promise<TwitterFollowingResponse> {
  const { data } = await api.get<TwitterFollowingResponse>('/twitter/following', {
    params: cursor ? { cursor } : {},
  })
  return data
}

/** 使用 bird-cli 获取关注列表（无需登录，直接指定用户名） */
export async function getBirdFollowing(username: string, count?: number): Promise<{
  accounts: TwitterFollowingAccount[]
  source: string
  username: string
  fetched_at: string
}> {
  // 使用相对路径，让 Vite 代理到后端
  const { data } = await axios.get(`${getApiPrefix()}/bird/following`, {
    params: { username, count: count ?? 100 },
  })
  return data
}
