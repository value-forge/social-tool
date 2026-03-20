import api from './auth'

export interface TwitterFollowingAccount {
  platform_user_id: string
  username: string
  display_name: string
  avatar_url: string
  bio: string
  follower_count: number
  following_count: number
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
