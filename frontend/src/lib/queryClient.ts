import { QueryClient } from '@tanstack/react-query'

/** 单例：登出 / 换账号登录后须 clear，否则会沿用旧用户的 React Query 缓存 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})
