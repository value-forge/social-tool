# Social Tool - 前端架构设计（重构版）

> 基于 api.md 9 个接口，聚焦**登录 + 监控中心**页面  
> 参考 prototype-web.html 的暗色 UI 风格  
> 更新时间: 2026-03-29

---

## 技术栈（沿用现有）

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **框架** | React | 19 | 函数组件 + Hooks |
| **语言** | TypeScript | 5.9 | 严格模式 |
| **构建** | Vite | 8 | HMR + 代理 |
| **UI 组件** | Ant Design | 6 | 按需引入，暗色主题 |
| **样式** | Tailwind CSS | 4 | 原子类 + antd token |
| **路由** | React Router | 7 | SPA 路由 |
| **请求** | Axios + React Query | 5 | 缓存 + 自动重试 |
| **图标** | Lucide React | — | 轻量 SVG 图标 |

---

## 目录结构

```
src/
├── api/                          # API 请求层
│   ├── client.ts                 # axios 实例 + 拦截器
│   ├── auth.ts                   # POST /auth/login
│   ├── user.ts                   # GET /user/me
│   ├── monitors.ts               # GET/POST/PUT/DELETE /monitors
│   ├── tweets.ts                 # GET /tweets/feed
│   └── stats.ts                  # GET /stats/overview
│
├── types/                        # TypeScript 类型（与 api.md 严格对齐）
│   └── index.ts
│
├── hooks/                        # 自定义 Hooks
│   ├── useAuth.ts                # 认证状态管理
│   ├── useMonitors.ts            # 监控账号 CRUD hooks
│   ├── useTweetsFeed.ts          # 推文动态 hook
│   └── useStats.ts               # 统计数据 hook
│
├── pages/                        # 页面
│   ├── LoginPage/
│   │   └── index.tsx             # 邮箱登录页
│   └── DashboardPage/
│       └── index.tsx             # 监控中心（含侧边栏布局）
│
├── components/                   # 组件
│   ├── layout/
│   │   ├── Sidebar.tsx           # 左侧导航栏
│   │   ├── RightPanel.tsx        # 右侧信息栏
│   │   └── UserCard.tsx          # 侧边栏底部用户卡片
│   │
│   ├── dashboard/
│   │   ├── StatsCards.tsx         # 统计卡片区（4张）
│   │   ├── QuickActions.tsx       # 快捷操作网格（4个）
│   │   ├── FeedList.tsx           # 最新动态列表（Tab 1）
│   │   ├── FeedItem.tsx           # 单条推文卡片（含展开）
│   │   ├── MonitorList.tsx        # 我的监控列表（Tab 2）
│   │   ├── MonitorItem.tsx        # 单条监控账号卡片
│   │   └── Pagination.tsx         # 通用分页组件
│   │
│   └── modals/
│       ├── AddMonitorModal.tsx    # 添加监控弹窗
│       └── MonitorDetailModal.tsx # 监控详情/编辑弹窗
│
├── theme/
│   └── ThemeProvider.tsx          # antd 暗色主题配置
│
├── lib/
│   └── queryClient.ts            # React Query 客户端
│
├── App.tsx                        # 路由入口
├── main.tsx                       # 渲染入口
└── index.css                      # Tailwind 全局样式
```

### 需要删除的旧文件

```
# 旧 API 文件（与新 api.md 不匹配）
src/api/apiPrefix.ts              → 合并到 client.ts
src/api/mock.ts                   → 删除
src/api/mockDingTalk.ts           → 删除
src/api/mockTweetDetail.ts        → 删除
src/api/drafts.ts                 → 删除
src/api/following.ts              → 删除
src/api/trending.ts               → 删除
src/api/platform.ts               → 删除
src/api/settings.ts               → 删除
src/api/feed.ts                   → 删除
src/api/twitter.ts                → 删除
src/api/monitored.ts              → 用 monitors.ts 替代
src/api/index.ts                  → 重写

# 旧页面（监控中心以外的页面）
src/pages/CallbackPage/           → 删除（OAuth 回调，不再需要）
src/pages/TrendingPage/           → 删除
src/pages/DraftHistoryPage/       → 删除
src/pages/PlatformConnectionsPage/ → 删除
src/pages/SettingsPage/           → 删除
src/pages/DingTalkConfigPage/     → 删除
src/pages/TweetDetailPage/        → 删除
src/pages/TweetDetailPanel/       → 删除

# 旧组件
src/components/dashboard/FollowingListPanel.tsx    → 删除
src/components/dashboard/MonitoredAccountsPanel.tsx → 用 MonitorList.tsx 替代
src/components/dashboard/TrendingPanel.tsx          → 删除
src/components/dashboard/TweetsPanel.tsx            → 用 FeedList.tsx 替代
src/components/common/ErrorBoundary.tsx             → 保留

# 旧类型（全部重写）
src/types/index.ts                → 重写
src/types/auth.ts                 → 合并到 types/index.ts
```

---

## TypeScript 类型定义

> 与 api.md 严格一一对应，字段名 camelCase

```typescript
// ============================================
// 通用
// ============================================

/** 通用 API 响应 */
interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

/** 通用分页响应 */
interface PaginatedData<T> {
  total: number
  page: number
  limit: number
  list: T[]
}

// ============================================
// 认证 — POST /auth/login
// ============================================

interface LoginRequest {
  email: string
  password: string
}

interface LoginData {
  token: string
  expiresIn: number
  user: LoginUser
}

interface LoginUser {
  id: string
  email: string
  name: string
}

// ============================================
// 用户 — GET /user/me
// ============================================

interface UserMe {
  id: string
  email: string
  name: string
  avatar: string
  twitter: {
    username: string
  } | null
  settings: {
    dingtalkWebhook: string
  }
  notifications: {
    dingtalk: boolean
  }
}

// ============================================
// 监控账号 — GET /monitors
// ============================================

interface Profile {
  displayName: string
  avatar: string
  bio: string
  verified: boolean
  location: string
  website: string
}

interface UserStats {
  followersCount: number
  followingCount: number
  tweetsCount: number
  updatedAt: string
}

/** GET /monitors → list[] */
interface MonitorAccount {
  id: string
  twitterUserId: string
  status: 1 | -1                // 1=监控中, -1=已暂停
  notes: string
  ct: string
  ut: string
  username: string
  profile: Profile
  stats: UserStats
  monitorStatus: 1 | -1         // 全局监控状态
  lastFetchedAt: string
}

/** POST /monitors/add 请求 */
interface AddMonitorRequest {
  username: string
  notes?: string
}

/** POST /monitors/add 响应 */
interface AddMonitorData {
  id: string
  twitterUserId: string
  username: string
  status: 1
  notes: string
  profile: Pick<Profile, 'displayName' | 'avatar' | 'bio' | 'verified'>
  stats: Pick<UserStats, 'followersCount' | 'followingCount' | 'tweetsCount'>
  ct: string
}

/** PUT /monitors/:id 请求 */
interface UpdateMonitorRequest {
  status?: 1 | -1
  notes?: string
}

/** PUT /monitors/:id 响应 */
interface UpdateMonitorData {
  id: string
  status: 1 | -1
  notes: string
  ut: string
}

// ============================================
// 推文动态 — GET /tweets/feed
// ============================================

interface TweetMedia {
  type: 'photo' | 'video' | 'gif'
  url: string
}

interface TweetMetrics {
  retweetCount: number
  replyCount: number
  likeCount: number
  viewCount: number
}

interface AISuggestion {
  type: 'data' | 'insight' | 'humor' | 'story' | 'professional'
  content: string
  reason: string
}

interface AISuggestions {
  score: number
  summary: string
  suggestion: AISuggestion
}

interface TweetAuthor {
  username: string
  profile: Pick<Profile, 'displayName' | 'avatar'>
  stats: Pick<UserStats, 'followersCount'>
}

/** GET /tweets/feed → list[] */
interface TweetFeedItem {
  id: string
  tweetId: string
  twitterUserId: string
  twitterId: string
  url: string
  text: string
  type: 'original' | 'reply' | 'retweet' | 'quote'
  media: TweetMedia[]
  metrics: TweetMetrics
  publishedAt: string
  fetchedAt: string
  aiStatus: -1 | 1 | -2         // -1=待分析, 1=已完成, -2=失败
  aiAnalyzedAt: string | null
  aiSuggestions: AISuggestions | null
  author: TweetAuthor
}

/** GET /tweets/feed 查询参数 */
interface TweetFeedParams {
  page?: number
  limit?: number
  twitterUserId?: string
  aiStatus?: -1 | 1 | -2
  type?: 'original' | 'reply' | 'retweet' | 'quote'
  startDate?: string
  endDate?: string
}

// ============================================
// 统计 — GET /stats/overview
// ============================================

interface StatsOverview {
  monitors: {
    total: number
    active: number
    paused: number
  }
  tweets: {
    total: number
    today: number
    pending: number
    completed: number
    failed: number
  }
  ai: {
    avgScore: number
    highScoreCount: number
  }
  dingtalk: {
    todaySent: number
  }
}
```

---

## API 层设计

### client.ts — Axios 实例

```typescript
import axios from 'axios'

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截：自动注入 JWT
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截：统一处理 401
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default client
```

### 各接口模块

| 文件 | 函数 | HTTP | 说明 |
|------|------|------|------|
| `auth.ts` | `login(req)` | POST /auth/login | 登录 |
| `user.ts` | `getMe()` | GET /user/me | 当前用户 |
| `monitors.ts` | `getMonitors(params)` | GET /monitors | 监控列表 |
| `monitors.ts` | `addMonitor(req)` | POST /monitors/add | 添加监控 |
| `monitors.ts` | `updateMonitor(id, req)` | PUT /monitors/:id | 编辑监控 |
| `monitors.ts` | `deleteMonitor(id)` | DELETE /monitors/:id | 删除监控 |
| `tweets.ts` | `getTweetsFeed(params)` | GET /tweets/feed | 推文动态 |
| `stats.ts` | `getStatsOverview()` | GET /stats/overview | 统计概览 |

---

## Hooks 层设计

### useAuth.ts — 认证状态

```
Context 管理：
- user: UserMe | null
- token: string | null
- isAuthenticated: boolean
- login(email, password) → 调 POST /auth/login，存 token 到 localStorage
- logout() → 清 token，跳转 /login
- 初始化时：有 token 则调 GET /user/me 拉用户信息
```

### useMonitors.ts — 监控账号 CRUD

```
基于 React Query：
- useMonitorList(page, limit, status?)  → useQuery(['monitors', params])
- useAddMonitor()                        → useMutation → 成功后 invalidate
- useUpdateMonitor()                     → useMutation → 成功后 invalidate
- useDeleteMonitor()                     → useMutation → 成功后 invalidate
```

### useTweetsFeed.ts — 推文动态

```
- useTweetsFeed(params: TweetFeedParams) → useQuery(['tweets-feed', params])
- 自动 5 分钟轮询（refetchInterval: 300000）
```

### useStats.ts — 统计

```
- useStatsOverview() → useQuery(['stats-overview'])
- 自动 1 分钟轮询（refetchInterval: 60000）
```

---

## 路由设计

```
/login          → LoginPage（未认证）
/               → DashboardPage（需认证，ProtectedRoute）
*               → 重定向到 /
```

只有两个路由，极简。

---

## 页面结构

### LoginPage — 邮箱登录

```
┌─────────────────────────────┐
│         Social Tool          │  ← logo
│  登录以监控大V动态...          │  ← 副标题
│                              │
│  ┌────────────────────────┐  │
│  │ 邮箱         [input]   │  │  ← 校验邮箱格式
│  │ 密码         [input]   │  │  ← 固定 88888888
│  │ □ 记住登录   忘记密码?  │  │
│  │ [      登录       ]    │  │  ← POST /auth/login
│  └────────────────────────┘  │
│  提示：密码固定为 88888888     │
└─────────────────────────────┘
```

**交互逻辑：**
1. 前端校验邮箱格式（正则）
2. 调用 `POST /auth/login`
3. 成功 → 存 `token` 到 localStorage → 跳转 `/`
4. 失败 → 显示错误信息

### DashboardPage — 监控中心

```
┌──────────┬────────────────────────────────┬──────────┐
│          │                                │          │
│ Sidebar  │         Content                │ Right    │
│ 232px    │         flex-1                 │ Panel    │
│          │                                │ 320px    │
│ ┌──────┐ │  ┌──────────────────────────┐  │          │
│ │ Logo │ │  │ Header: 监控中心          │  │ 实时动态  │
│ └──────┘ │  │ 副标题                    │  │          │
│          │  └──────────────────────────┘  │ 快捷操作  │
│ 工作台    │                                │          │
│ ● 监控中心│  ┌──────────────────────────┐  │ 今日概览  │
│   热点发现│  │ StatsCards (4个)          │  │          │
│   内容创作│  └──────────────────────────┘  │ 即将上线  │
│          │                                │          │
│ 增长      │  ┌──────────────────────────┐  │          │
│   发现用户│  │ QuickActions (4个)        │  │          │
│   互动管理│  └──────────────────────────┘  │          │
│   数据分析│                                │          │
│          │  ┌──────────────────────────┐  │          │
│ 设置      │  │ 动态监控 Card            │  │          │
│   监控设置│  │ ┌─────────┬────────────┐ │  │          │
│          │  │ │最新动态  │我的监控列表 │ │  │          │
│ ┌──────┐ │  │ └─────────┴────────────┘ │  │          │
│ │用户卡│ │  │ FeedList / MonitorList   │  │          │
│ │片    │ │  │ + Pagination             │  │          │
│ │退出  │ │  └──────────────────────────┘  │          │
│ └──────┘ │                                │          │
└──────────┴────────────────────────────────┴──────────┘
```

---

## 组件设计

### layout/Sidebar.tsx

```
Props: 无（用 useAuth 获取 user）
职责:
- Logo "Social Tool"
- 导航菜单（暂时只有"监控中心"可点击，其他 disabled）
- 底部 UserCard（头像、name、@twitter.username）
- 退出登录按钮
数据来源: useAuth() → user (GET /user/me)
```

### layout/RightPanel.tsx

```
Props: 无
职责:
- 实时动态（假数据 / 可用 stats 数据变化模拟）
- 快捷操作按钮（添加监控 → 打开 AddMonitorModal）
- 今日概览（假数据）
- 即将上线（静态文本）
```

### layout/UserCard.tsx

```
Props: { user: UserMe }
渲染:
- 头像（user.avatar 或 name 首字母）
- user.name
- @{user.twitter?.username || user.email}
```

### dashboard/StatsCards.tsx

```
Props: 无
数据: useStatsOverview() → GET /stats/overview
渲染 4 张卡片:
  卡片1: "监控账号" → monitors.total
  卡片2: "今日新推" → tweets.today
  卡片3: "待分析"   → tweets.pending
  卡片4: "本周涨粉" → 假数据（硬编码 +892）
```

### dashboard/QuickActions.tsx

```
Props: { onAddMonitor: () => void }
渲染 4 个快捷操作:
  热点发现 → disabled（后续功能）
  快速发推 → disabled
  发现用户 → disabled
  数据报表 → disabled
```

### dashboard/FeedList.tsx（Tab 1: 最新动态）

```
Props: 无
数据: useTweetsFeed({ page, limit: 20 })
渲染:
  - 列表: FeedItem × N
  - 分页: Pagination
```

### dashboard/FeedItem.tsx

```
Props: { tweet: TweetFeedItem }
渲染:
  折叠态:
  - 头像（author.profile.avatar / displayName 首字母）
  - 昵称（author.profile.displayName）
  - @用户名（author.username）
  - 发布时间（publishedAt 格式化为 M/DD HH:mm）
  - 推文文本（text，最多2行截断）
  - 互动指标：❤️ likeCount 💬 replyCount 🔄 retweetCount
  - AI 评分：⭐ aiSuggestions.score / 10
  - [查看] 按钮 → window.open(url)

  展开态（点击切换）:
  - 内容总结: aiSuggestions.summary
  - 建议回复: aiSuggestions.suggestion.content
```

### dashboard/MonitorList.tsx（Tab 2: 我的监控列表）

```
Props: { onOpenDetail: (account: MonitorAccount) => void }
数据: useMonitorList(page, limit)
渲染:
  - 列表: MonitorItem × N
  - 分页: Pagination
```

### dashboard/MonitorItem.tsx

```
Props: { account: MonitorAccount, onClick: () => void }
渲染:
  - 头像（profile.avatar / displayName 首字母）
  - 昵称（profile.displayName）+ 认证图标（profile.verified）
  - @用户名（username）
  - 状态标签: status=1 → "监控中"(绿), status=-1 → "已暂停"(黄)
  - 粉丝数（stats.followersCount）
  - 关注数（stats.followingCount）
  - 简介（profile.bio，2行截断）
  - 备注（notes，有值才显示）
  - [查看] 按钮 → 触发 onClick
```

### modals/AddMonitorModal.tsx

```
Props: { open, onClose, onSuccess }
表单:
  - 用户名 input（必填，无需@）→ username
  - 备注 textarea（选填）→ notes
交互:
  - 提交 → useAddMonitor() → POST /monitors/add
  - 成功 → onSuccess() → 关闭弹窗 + 刷新列表
  - 409 → "已在监控列表"
  - 404 → "Twitter用户不存在"
```

### modals/MonitorDetailModal.tsx

```
Props: { open, account: MonitorAccount | null, onClose, onSaved }
渲染:
  只读字段:
  - 监控关系ID (id)
  - Twitter用户ID (twitterUserId)
  - 显示名 (profile.displayName)
  - 用户名 (username)
  - 简介 (profile.bio)
  - 粉丝/关注/认证 (stats + profile.verified)
  可编辑字段:
  - 监控状态 select → status (1/-1)
  - 备注 textarea → notes
交互:
  - 保存 → useUpdateMonitor() → PUT /monitors/:id
  - 成功 → onSaved() → 关闭弹窗 + 刷新列表
```

---

## 主题/样式方案

### 暗色主题（参考 prototype-web.html）

```typescript
// theme/ThemeProvider.tsx
import { ConfigProvider, theme } from 'antd'

const darkTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorBgBase: '#0a0a0a',        // --bg
    colorBgContainer: '#111111',    // --bg-elevated
    colorBgElevated: '#1a1a1a',    // --bg-hover
    colorBorder: '#222222',         // --border
    colorBorderSecondary: '#222222',
    colorText: '#ffffff',           // --text
    colorTextSecondary: '#888888',  // --text-secondary
    colorTextTertiary: '#555555',   // --text-tertiary
    colorSuccess: '#22c55e',        // --success
    colorWarning: '#f59e0b',        // --warning
    colorError: '#ef4444',          // --danger
    borderRadius: 8,
    borderRadiusLG: 12,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro', sans-serif",
  },
}
```

### 样式策略

- **布局**: Tailwind grid/flex（sidebar 240px + content 1fr + rightbar 320px）
- **组件样式**: antd 组件 + token 变量为主
- **自定义样式**: Tailwind 原子类补充
- **滚动条**: CSS 自定义（与原型一致的半透明细条）
- **响应式**:
  - < 1200px: 隐藏右侧栏
  - < 768px: 隐藏侧边栏

---

## Vite 配置

```typescript
// vite.config.ts
export default defineConfig({
  appType: 'spa',
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',   // Go 后端
        changeOrigin: true,
      },
    },
  },
})
```

> 注意：后端端口从旧的 8889 改为 8080（与 api.md Base URL 对齐）

---

## 数据流

```
用户操作
    │
    ▼
Component（UI 交互）
    │
    ▼
Hook（useMonitors / useTweetsFeed / useStats）
    │  ← React Query 管理缓存、轮询、乐观更新
    ▼
API 层（api/monitors.ts 等）
    │  ← axios 实例 + JWT 拦截器
    ▼
Vite Proxy → Go 后端 :8080
```

### 缓存策略（React Query）

| Query Key | staleTime | refetchInterval | 说明 |
|-----------|-----------|-----------------|------|
| `['user-me']` | 10min | — | 用户信息，基本不变 |
| `['monitors', params]` | 30s | — | 监控列表，操作后手动 invalidate |
| `['tweets-feed', params]` | 30s | 5min | 推文动态，自动轮询 |
| `['stats-overview']` | 30s | 1min | 统计卡片，自动轮询 |

### Mutation 后刷新

| 操作 | Mutation | invalidate |
|------|----------|------------|
| 添加监控 | `addMonitor` | `['monitors']` + `['stats-overview']` |
| 编辑监控 | `updateMonitor` | `['monitors']` |
| 删除监控 | `deleteMonitor` | `['monitors']` + `['stats-overview']` |

---

## 开发顺序（建议）

```
Phase 1: 基础骨架
  ├── client.ts（axios 实例）
  ├── types/index.ts（所有类型）
  ├── ThemeProvider（暗色主题）
  ├── App.tsx（路由）
  └── LoginPage（邮箱登录）

Phase 2: 监控中心布局
  ├── DashboardPage（三栏布局）
  ├── Sidebar + UserCard
  ├── RightPanel
  └── useAuth hook

Phase 3: 核心功能
  ├── StatsCards + useStats
  ├── FeedList + FeedItem + useTweetsFeed
  ├── MonitorList + MonitorItem + useMonitors
  └── Pagination

Phase 4: 弹窗交互
  ├── AddMonitorModal
  └── MonitorDetailModal

Phase 5: 收尾
  ├── QuickActions
  ├── 响应式适配
  └── 错误处理 + 空状态
```
