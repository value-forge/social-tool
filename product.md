# 社媒运营 Tool

> **项目名称**: social-tool  
> **项目状态**: 开发中（骨架已搭建，Twitter OAuth 登录已实现）  
> **产品详细文档**: `./product.md`

## 项目定义

- **名称**: 社媒运营工具（Social Tool）
- **愿景**: 一站式多平台社交媒体运营助手——监控目标账号动态、AI 生成互动内容、聚合信息流摘要
- **首期范围**: 仅支持 **Twitter** 平台，实现「监控推文 → 排名评论 + 内容提炼 → AI 生成回复草稿 → 一键复制 → 手动发送」+「Twitter 热点大盘」+ 钉钉推送
- **MVP 边界**: **不实现**机器自动发推；用户复制草稿后手动粘贴到 Twitter 发送
- **扩展规划**: 架构预留多平台接口，后续按优先级接入更多社媒平台

### 平台支持路线图

| 平台 | 类型 | 首期状态 | 接入方式 | 说明 |
|------|------|----------|----------|------|
| Twitter / X | 海外社媒 | ✅ 首期实现 | Twitter API v2 + OAuth 2.0 | 监控推文、生成回复、推荐流摘要 |
| 小红书 | 国内社媒 | 🔮 预留 | 开放平台 API / 非官方 API | 监控笔记、生成评论草稿 |
| TikTok | 海外短视频 | 🔮 预留 | TikTok API for Business | 监控视频评论、生成互动内容 |
| 抖音 | 国内短视频 | 🔮 预留 | 抖音开放平台 API | 监控视频评论、生成互动内容 |
| Farcaster | Web3 社交 | 🔮 预留 | Farcaster Hub API | 监控 casts、生成回复 |
| Telegram | 即时通讯 | 🔮 预留 | Telegram Bot API | 监控频道/群组消息 |
| Discord | 社区 | 🔮 预留 | Discord Bot API | 监控服务器频道消息 |
| Instagram | 海外社媒 | 🔮 预留 | Instagram Graph API | 监控帖子、生成评论草稿 |

---

## 核心概念：登录认证 vs 平台连接

系统有两个独立但关联的概念，必须清晰区分：

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  登录认证（Auth）                平台连接（Platform）         │
│  ─────────────                  ─────────────               │
│  "你是谁？"                     "你要运营哪些社媒？"         │
│                                                             │
│  ┌───────────────┐              ┌───────────────┐           │
│  │ Twitter OAuth  │ (MVP)        │ Twitter 平台   │ (MVP)     │
│  │ Google OAuth   │ (预留)       │ 小红书 平台    │ (预留)     │
│  │ 邮箱 + 密码    │ ────────→   │ TikTok 平台    │ (预留)     │
│  │ GitHub OAuth   │  进入设置页  │ Farcaster 平台 │ (预留)     │
│  │ ...           │  连接平台    │ ...           │           │
│  └───────────────┘              └───────────────┘           │
│                                                             │
│  用途：身份验证，进入系统        用途：授权系统读取该平台数据  │
│  存储：User.auth_providers      存储：PlatformConnection     │
│  一次性：登录后即完成            持续性：Token 需定期刷新     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- **登录认证**：解决"你是谁"的问题。用户通过 Twitter / Google / 邮箱任一方式登录，获得系统身份。
- **平台连接**：解决"你要运营哪些平台"的问题。登录后，在设置页中连接具体社媒平台，授权系统读取该平台数据。

> **MVP 路径**：用户通过 Twitter 登录系统 → 系统自动将 Twitter OAuth Token 复用为平台连接 → 无需二次授权，直接开始监控推文。  
> **后续路径示例**：用户通过 Google 登录系统 → 在设置页手动连接 Twitter 平台 → 系统获得 Twitter 读取权限 → 开始监控推文。

---

## 平台扩展架构

首期仅实现 Twitter，但所有核心抽象均围绕「平台无关」设计，后续新增平台只需实现对应适配器。

```
┌──────────────────────────────────────────────────────────────────┐
│                         前端 UI 层                               │
│                                                                  │
│  ┌─────────────┐                                                 │
│  │  LoginPage   │ ← MVP: Twitter OAuth（预留 Google / 邮箱）     │
│  └──────┬───────┘                                                │
│         ↓ 登录成功                                                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  主应用                                                      │ │
│  │                                                              │ │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │ │
│  │  │Dashboard │  │ 帖子列表  │  │ 草稿历史  │  │  设置页      │  │ │
│  │  │(总览)    │  │(按平台Tab)│  │          │  │             │  │ │
│  │  └─────────┘  └──────────┘  └──────────┘  │ ┌─────────┐ │  │ │
│  │                                            │ │平台连接  │ │  │ │
│  │  平台 Tab 栏:                               │ │管理面板  │ │  │ │
│  │  [Twitter ✅] [小红书 🔒] [TikTok 🔒] ...  │ └─────────┘ │  │ │
│  └──────────────────────────────────────────────────────────┘ │ │
└──────────────────────┬───────────────────────────────────────────┘
                       │ REST API
┌──────────────────────┴───────────────────────────────────────────┐
│                        后端服务层                                 │
│                                                                  │
│  ┌──── Auth Service ────┐    ┌── Platform Connection Service ──┐ │
│  │ JWT 签发/验证         │    │ 管理用户的平台连接状态           │ │
│  │ OAuth 回调处理        │    │ Token 加密存储与自动刷新         │ │
│  │ 邮箱注册/登录         │    │ 连接健康检查                    │ │
│  └──────────────────────┘    └─────────────┬──────────────────┘ │
│                                            │                    │
│  ┌─────────────── Platform Adapter 接口 ───┴──────────────────┐ │
│  │                                                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │ │
│  │  │TwitterAdapter │  │XiaohongshuAd.│  │ TikTokAdapter│ ... │ │
│  │  │  (首期实现)   │  │  (预留)      │  │  (预留)      │      │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                       │
│  │ LLM 服务 │  │ 定时任务  │  │ 中间件    │                       │
│  └──────────┘  └──────────┘  └──────────┘                       │
└──────────────────────┬───────────────────────────────────────────┘
                       │
┌──────────────────────┴───────────────────────────────────────────┐
│                    统一数据层（MongoDB）                           │
│     所有模型通过 platform 字段区分来源平台                         │
│     PlatformConnection 存储各平台的授权凭证                       │
└──────────────────────────────────────────────────────────────────┘
```

### Platform Adapter 接口定义（Go 伪码）

```go
type PlatformType string

const (
    PlatformTwitter      PlatformType = "twitter"
    PlatformXiaohongshu  PlatformType = "xiaohongshu"
    PlatformTikTok       PlatformType = "tiktok"
    PlatformDouyin       PlatformType = "douyin"
    PlatformFarcaster    PlatformType = "farcaster"
    PlatformTelegram     PlatformType = "telegram"
    PlatformDiscord      PlatformType = "discord"
    PlatformInstagram    PlatformType = "instagram"
)

// PlatformAdapter — 每个社媒平台实现此接口即可接入
type PlatformAdapter interface {
    // 基础信息
    Platform() PlatformType
    DisplayName() string                // "Twitter" / "小红书" / "TikTok"
    IconURL() string                    // 平台图标
    IsAvailable() bool                  // 是否已上线（未上线的展示为「即将支持」）

    // OAuth 授权流程（用于平台连接，非登录）
    GetOAuthURL(ctx context.Context, callbackURL string, state string) (string, error)
    HandleOAuthCallback(ctx context.Context, code string) (*PlatformToken, error)
    RefreshToken(ctx context.Context, refreshToken string) (*PlatformToken, error)

    // 数据拉取
    FetchPosts(ctx context.Context, token *PlatformToken, accountID string, since time.Time) ([]Post, error)
    FetchPostComments(ctx context.Context, token *PlatformToken, postID string, limit int) ([]PostComment, error)
    FetchFeed(ctx context.Context, token *PlatformToken) ([]Post, error)
    FetchTrending(ctx context.Context, token *PlatformToken) ([]TrendingRaw, error)
    GetAccountInfo(ctx context.Context, token *PlatformToken, username string) (*AccountInfo, error)
    GetFollowing(ctx context.Context, token *PlatformToken, cursor string) ([]AccountInfo, string, error)
    SearchAccounts(ctx context.Context, token *PlatformToken, query string) ([]AccountInfo, error)

    // 辅助
    BuildPostURL(post Post) string
    GetRateLimits() RateLimitConfig
}

type PlatformToken struct {
    AccessToken  string
    RefreshToken string
    ExpiresAt    time.Time
    Scopes       []string
    RawData      map[string]interface{} // 平台特有的额外字段
}

// PlatformRegistry — 适配器注册中心
type PlatformRegistry struct {
    adapters map[PlatformType]PlatformAdapter
}

func (r *PlatformRegistry) Register(adapter PlatformAdapter) { ... }
func (r *PlatformRegistry) Get(platform PlatformType) (PlatformAdapter, error) { ... }
func (r *PlatformRegistry) ListAll() []PlatformAdapter { ... }          // 包含未上线的
func (r *PlatformRegistry) ListAvailable() []PlatformAdapter { ... }    // 仅已上线的
```

首期只需实现 `TwitterAdapter`，后续新增平台：
1. 在 `internal/platform/` 下新建目录（如 `xiaohongshu/`）
2. 实现 `PlatformAdapter` 接口
3. 在 `main.go` 中注册到 `PlatformRegistry`
4. 业务层、API 层、前端均自动支持，**零改动**

---

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 前端 | Vite + React + TypeScript | SPA 应用 |
| 前端状态 | TanStack Query | 服务端状态缓存与请求管理 |
| 前端路由 | React Router | 页面路由 |
| 前端 UI | Tailwind CSS + shadcn/ui | 样式与组件库 |
| 前端请求 | axios | 调用后端 REST API |
| 后端 | Go + Kratos v2 | 微服务框架，提供 HTTP/gRPC 双协议、依赖注入、配置管理 |
| 数据库驱动 | go.mongodb.org/mongo-driver | MongoDB 官方 Go 驱动 |
| 存储 | MongoDB | 持久化所有业务数据 |
| 缓存 | Redis | 会话管理、API 频率控制、热数据缓存 |
| 推文获取 | Twitter API v2 | 读取推文、评论、推荐流（首期） |
| LLM | Kimi（月之暗面）/ Claude API | 生成回复草稿与信息流摘要 |
| 认证 | JWT + OAuth 2.0 | 登录认证 + 平台连接授权 |

---

## 前端设计规范

> 设计风格参考 X Developer Console，采用暗色主题 + 左侧导航 + 数据驱动面板。在此基础上根据社媒运营场景做定制优化。

### 设计系统

| 要素 | 规范 |
|------|------|
| 主题 | 暗色主题为主（Dark Mode First），预留浅色主题切换 |
| 主背景色 | `#0a0a0a`（纯黑偏深） |
| 侧栏背景 | `#111111`（深灰） |
| 卡片背景 | `#1a1a1a`（微亮深灰） |
| 边框色 | `#2a2a2a`（低对比度分割线） |
| 主强调色 | `#1d9bf0`（Twitter 蓝，用于核心操作按钮和高亮） |
| 辅助强调色 | `#f59e0b`（琥珀色，用于热点/警告/新出现标记） |
| 成功色 | `#22c55e`（绿色，用于已连接/正常状态） |
| 危险色 | `#ef4444`（红色，用于错误/新热点标记） |
| 文字主色 | `#e7e9ea`（高对比度浅灰白） |
| 文字次色 | `#71767b`（低对比度灰） |
| 字体 | `Inter`（英文）+ `Noto Sans SC`（中文），系统等宽作 fallback |
| 圆角 | 卡片 `12px`，按钮 `8px`，Badge `9999px` |
| 组件库 | shadcn/ui（深色主题配置）+ Tailwind CSS |
| 图表 | Recharts（折线图/柱状图）或 Tremor（数据面板组件） |
| 图标 | Lucide Icons（与 shadcn/ui 一致） |

### 全局布局

```
┌──────────────────────────────────────────────────────────────────────┐
│  顶栏 (Top Bar, h=56px)                                              │
│  ┌───────┐                    ┌──────────┐    ┌──────┐  ┌─────────┐ │
│  │ Logo  │  Social Ops Tool   │ 🔍 搜索   │    │ 🔔   │  │ @用户名 │ │
│  └───────┘                    └──────────┘    └──────┘  └─────────┘ │
├────────────┬─────────────────────────────────────────────────────────┤
│            │                                                         │
│  侧栏      │  主内容区域                                              │
│  (w=240px) │                                                         │
│            │  ┌─ 通知横幅 (可关闭) ─────────────────────────────┐     │
│  Dashboard │  │ ⚡ 热点大盘有 3 个新话题          [查看]  [×]   │     │
│  ──────    │  └─────────────────────────────────────────────────┘     │
│  📊 总览   │                                                         │
│  👥 关注   │  ┌─ 页面标题区 ──────────────────────────────────┐      │
│  🎯 监控   │  │ @username                                     │      │
│  🔥 热点   │  │ Dashboard · pay-per-use          [Buy Credits]│      │
│  ──────    │  └───────────────────────────────────────────────┘      │
│  📝 草稿   │                                                         │
│  ──────    │  ┌─ 数据卡片网格 ────────────────────────────────┐      │
│  ⚙️ 设置   │  │                                               │      │
│    平台连接 │  │  （页面具体内容）                               │      │
│    推送通道 │  │                                               │      │
│    通用设置 │  │                                               │      │
│            │  └───────────────────────────────────────────────┘      │
│            │                                                         │
└────────────┴─────────────────────────────────────────────────────────┘
```

### 侧栏导航结构

```
┌────────────────────┐
│ 🐦 Social Ops Tool │  ← Logo + 产品名
│                    │
│ 📊 Dashboard       │  ← 总览面板（默认首页）
│ 👥 关注列表        │  ← 关注用户 → 加入监控
│ 🎯 监控账号        │  ← 监控列表 → 点击进详情
│ 🔥 热点大盘        │  ← Twitter Trending
│                    │
│ ────────────────── │  ← 分割线
│                    │
│ 📝 草稿历史        │  ← 所有生成的草稿
│                    │
│ ────────────────── │  ← 分割线
│                    │
│ ⚙️ 设置            │  ← 可展开子菜单
│   ├ 平台连接       │
│   ├ 推送通道       │
│   └ 通用设置       │
│                    │
│ ────────────────── │
│                    │
│ 🐦 @0xpeterlee     │  ← 底部用户信息
│    登出            │
└────────────────────┘
```

### Dashboard 页面（登录后首页）

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ⚡ 热点大盘有 3 个新话题上榜              [查看热点大盘]  [×]        │
│                                                                      │
│  @0xpeterlee · Twitter 已连接                                        │
│  ┌─────────────┐                                                     │
│  │ pay-per-use │  ← Badge（类似参考图的 pay-per-use 标签）           │
│  └─────────────┘                                                     │
│                                                                      │
│  ┌─ 数据概览卡片 ────────────────────────────────────────────────┐   │
│  │                                                                │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │   │
│  │  │ 监控账号      │  │ 今日新推文    │  │ 待处理草稿    │         │   │
│  │  │              │  │              │  │              │         │   │
│  │  │  12          │  │  47          │  │  8           │         │   │
│  │  │  个账号       │  │  条（+15）   │  │  条待复制     │         │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘         │   │
│  │                                                                │   │
│  │  ┌──────────────┐  ┌──────────────┐                            │   │
│  │  │ 热点话题      │  │ LLM 调用      │                            │   │
│  │  │              │  │              │                            │   │
│  │  │  28 个在榜    │  │ 今日 156 次   │                            │   │
│  │  │  🔴 3 个新!   │  │ Kimi 89 / Claude 67                     │   │
│  │  └──────────────┘  └──────────────┘                            │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─ 推文活动（最近 30 天）────────────┐  ┌─ 快捷操作 ──────────────┐ │
│  │                                    │  │                          │ │
│  │   ▓                                │  │ 👥 查看关注列表          │ │
│  │   ▓  ▓                             │  │    从关注中添加监控账号   │ │
│  │   ▓  ▓     ▓                       │  │                          │ │
│  │   ▓  ▓  ▓  ▓  ▓                   │  │ 🔥 查看热点大盘          │ │
│  │   ▓  ▓  ▓  ▓  ▓  ▓  ▓            │  │    3 个新话题上榜         │ │
│  │  ────────────────────              │  │                          │ │
│  │  03/01  03/05  03/10  03/15  03/20 │  │ 📝 待处理的草稿          │ │
│  │                                    │  │    8 条草稿待复制发送     │ │
│  │  • 新推文  • 生成草稿  • 已复制    │  │                          │ │
│  └────────────────────────────────────┘  │ ⚙️ 配置钉钉推送          │ │
│                                          │    还未配置推送通道       │ │
│  ┌─ 最新动态（实时） ─────────────────┐  │                          │ │
│  │                                    │  └──────────────────────────┘ │
│  │ 🐦 @elonmusk 发布了新推文  3m ago  │                              │
│  │   "Exciting progress on..."        │                              │
│  │   ❤️ 120k  💬 8.2k    [查看详情]   │                              │
│  │                                    │                              │
│  │ 🐦 @naval 发布了新推文    15m ago  │                              │
│  │   "The best founders..."           │                              │
│  │   ❤️ 5.3k  💬 890     [查看详情]   │                              │
│  │                                    │                              │
│  │ 🤖 @elonmusk 的草稿已生成  5m ago  │                              │
│  │   Kimi + Claude 各 1 份   [去复制]  │                              │
│  │                                    │                              │
│  │          [查看更多动态]             │                              │
│  └────────────────────────────────────┘                              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 设计要点

1. **布局对标 X Developer Console**：暗色背景 + 固定左侧栏 + 顶栏搜索/通知/用户头像 + 主内容区自适应宽度
2. **数据卡片风格**：圆角深灰卡片 + 大号数字 + 次色描述文字，与参考图的 "Credit remaining $0.00" 卡片保持同一视觉语言
3. **图表样式**：折线/柱状图使用 Twitter 蓝（`#1d9bf0`）为主色，灰色网格线，背景透明，与参考图的 Usage 图表风格一致
4. **通知横幅**：页面顶部可关闭的通知条，深色背景 + 琥珀色图标 + 右侧操作按钮，对标参考图的 "Recommended: Never run out of credits" 横幅
5. **Badge 标签**：用户名旁的状态标签（如 "Twitter 已连接"），使用 pill 形状 + 深底浅字，对标参考图的 "pay-per-use" 标签
6. **快捷操作区**：右侧固定宽度卡片，列出常用入口 + 状态提示，对标参考图的 "Quick Actions" 区域
7. **动态流**：左下方实时展示最新监控动态，时间线样式，每条带图标 + 时间戳 + 操作按钮
8. **响应式**：侧栏在窄屏下可收缩为图标模式（w=64px），移动端隐藏侧栏改为底部 Tab

### 页面间交互

```
Dashboard（总览）
  ├── 点击「监控账号」数字卡片 → 跳转 MonitorPage
  ├── 点击「今日新推文」数字卡片 → 跳转 MonitorPage（筛选今日）
  ├── 点击「待处理草稿」数字卡片 → 跳转 DraftHistoryPage（筛选未发送）
  ├── 点击「热点话题」数字卡片 → 跳转 TrendingPage
  ├── 点击快捷操作「查看关注列表」→ 跳转 FollowingPage
  ├── 点击快捷操作「配置钉钉推送」→ 跳转 SettingsPage > 推送通道
  └── 点击最新动态中的「查看详情」→ 跳转 AccountDetailPage 具体推文锚点
```

---

## 目录结构（规划）

```
social-tool/
├── frontend/                           # Vite + React 前端
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage/              # 登录页
│   │   │   ├── DashboardPage/          # 仪表盘（监控概览 + 入口）
│   │   │   ├── FollowingPage/          # 关注列表页（勾选 → 加入监控）
│   │   │   ├── MonitorPage/            # 监控账号列表页
│   │   │   ├── AccountDetailPage/      # 监控账号详情页（推文 + 评论 + 摘要 + 草稿）
│   │   │   ├── TrendingPage/           # 热点大盘页
│   │   │   ├── DraftHistoryPage/       # 草稿历史记录页
│   │   │   └── SettingsPage/           # 设置页（平台连接 + 推送通道 + 通用配置）
│   │   ├── components/
│   │   │   ├── auth/                   # 登录相关组件
│   │   │   │   ├── TwitterLoginButton.tsx  # Twitter OAuth 登录按钮（MVP）
│   │   │   │   └── OAuthButton.tsx     # 通用 OAuth 登录按钮（预留多 provider 复用）
│   │   │   ├── platform/              # 平台连接相关组件
│   │   │   │   ├── PlatformGrid.tsx    # 平台连接网格（设置页用）
│   │   │   │   ├── PlatformCard.tsx    # 单个平台连接卡片
│   │   │   │   ├── PlatformTabs.tsx    # 平台切换 Tab 栏
│   │   │   │   └── renderers/          # 各平台专属渲染器
│   │   │   │       ├── TwitterPost.tsx # Twitter 推文渲染
│   │   │   │       ├── XhsNote.tsx     # 小红书笔记渲染（预留）
│   │   │   │       └── TikTokVideo.tsx # TikTok 视频渲染（预留）
│   │   │   ├── post/                   # 帖子展示组件（平台无关）
│   │   │   ├── draft/                  # 草稿编辑/展示组件
│   │   │   ├── settings/               # 设置相关组件
│   │   │   │   ├── NotifyChannelForm.tsx   # 推送通道配置表单
│   │   │   │   ├── NotifyChannelList.tsx   # 已配置的推送通道列表
│   │   │   │   └── GeneralSettings.tsx     # 通用设置（轮询频率、LLM 等）
│   │   │   └── common/                 # 通用 UI 组件
│   │   ├── api/                        # 后端 API 请求封装
│   │   ├── hooks/                      # 自定义 hooks
│   │   ├── types/
│   │   │   ├── auth.ts                 # 登录认证类型
│   │   │   ├── platform.ts             # 平台连接类型
│   │   │   ├── post.ts                 # 帖子类型
│   │   │   └── draft.ts               # 草稿类型
│   │   └── utils/
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                            # Go + Kratos v2 后端（标准 Kratos Layout）
│   ├── api/                             # Protobuf API 定义（gRPC + HTTP 转码）
│   │   └── socialtool/
│   │       └── v1/
│   │           ├── auth.proto           # 认证服务 API
│   │           ├── platform.proto       # 平台连接管理 API
│   │           ├── account.proto        # 监控账号 API
│   │           ├── following.proto       # 关注列表 API
│   │           ├── post.proto           # 帖子 + 评论 + 内容提炼 API
│   │           ├── draft.proto          # 草稿 API
│   │           ├── trending.proto       # 热点大盘 API
│   │           ├── feed_summary.proto   # 信息流摘要 API
│   │           └── settings.proto       # 用户设置 + 推送通道配置 API
│   │
│   ├── cmd/
│   │   └── server/
│   │       ├── main.go                  # 程序入口（wire 依赖注入）
│   │       ├── wire.go                  # Wire 依赖注入声明
│   │       └── wire_gen.go              # Wire 生成代码
│   │
│   ├── internal/
│   │   ├── conf/                        # 配置结构（由 proto 生成）
│   │   │   └── conf.proto               # 配置定义
│   │   │
│   │   ├── server/                      # HTTP/gRPC 服务器初始化
│   │   │   ├── http.go                  # HTTP 服务器 + 路由注册 + 中间件
│   │   │   └── grpc.go                  # gRPC 服务器（可选，后续微服务拆分用）
│   │   │
│   │   ├── service/                     # 服务层（对接 Protobuf，调用 biz）
│   │   │   ├── auth.go                  # 认证服务
│   │   │   ├── platform.go              # 平台连接
│   │   │   ├── following.go             # 关注列表
│   │   │   ├── account.go               # 监控账号
│   │   │   ├── post.go                  # 帖子 + 评论 + 内容提炼
│   │   │   ├── draft.go                 # 草稿
│   │   │   ├── trending.go              # 热点大盘
│   │   │   ├── feed_summary.go          # 信息流摘要
│   │   │   └── settings.go              # 用户设置 + 推送通道
│   │   │
│   │   ├── biz/                         # 核心业务逻辑层（纯业务，不依赖框架）
│   │   │   ├── auth.go                  # 认证
│   │   │   ├── platform.go              # 平台连接
│   │   │   ├── following.go             # 关注列表 + 导入监控
│   │   │   ├── account.go               # 监控账号
│   │   │   ├── post.go                  # 帖子（含评论拉取、内容提炼、推送触发）
│   │   │   ├── draft.go                 # 草稿（生成完成后触发推送）
│   │   │   ├── trending.go              # 热点大盘（含 LLM 分析、写作建议）
│   │   │   ├── feed_summary.go          # 信息流摘要
│   │   │   ├── settings.go              # 用户设置
│   │   │   └── biz.go                   # biz 层 ProviderSet（Wire 用）
│   │   │
│   │   ├── data/                        # 数据访问层（实现 biz 中定义的 repo 接口）
│   │   │   ├── data.go                  # MongoDB/Redis 连接初始化 + ProviderSet
│   │   │   ├── user.go                  # User repo
│   │   │   ├── platform_connection.go   # PlatformConnection repo
│   │   │   ├── monitored_account.go     # MonitoredAccount repo
│   │   │   ├── post.go                  # Post repo（含评论嵌入文档操作）
│   │   │   ├── draft.go                 # ReplyDraft repo
│   │   │   ├── trending.go              # TrendingTopic + TrendingSnapshot repo
│   │   │   ├── feed_summary.go          # FeedSummary repo
│   │   │   ├── user_settings.go         # UserSettings repo
│   │   │   └── notify_log.go            # NotifyLog repo
│   │   │
│   │   ├── platform/                    # 平台适配器（核心扩展点）
│   │   │   ├── adapter.go               # PlatformAdapter 接口 + PlatformRegistry
│   │   │   ├── types.go                 # 公共类型（PlatformToken, AccountInfo 等）
│   │   │   ├── twitter/                 # Twitter 适配器（首期实现）
│   │   │   │   ├── adapter.go
│   │   │   │   ├── client.go
│   │   │   │   └── types.go
│   │   │   ├── xiaohongshu/             # 小红书适配器（预留）
│   │   │   │   └── adapter.go           # 骨架代码，IsAvailable() 返回 false
│   │   │   ├── tiktok/                  # TikTok 适配器（预留）
│   │   │   │   └── adapter.go
│   │   │   └── farcaster/               # Farcaster 适配器（预留）
│   │   │       └── adapter.go
│   │   │
│   │   ├── llm/                         # LLM 调用层
│   │   │   ├── provider.go              # LLM Provider 接口
│   │   │   ├── kimi.go
│   │   │   └── claude.go
│   │   │
│   │   ├── auth/                        # 认证工具（JWT + OAuth 客户端）
│   │   │   ├── jwt.go                   # JWT 签发/验证
│   │   │   ├── oauth.go                 # 通用 OAuth 2.0 流程封装（预留多 provider）
│   │   │   └── twitter_oauth.go         # Twitter OAuth 2.0 PKCE（MVP 唯一登录）
│   │   │
│   │   ├── notifier/                    # 消息推送通道（核心扩展点）
│   │   │   ├── notifier.go              # Notifier 接口 + NotifierRegistry
│   │   │   ├── types.go                 # 推送事件类型、消息格式定义
│   │   │   ├── dingtalk/                # 钉钉自定义机器人（MVP 实现）
│   │   │   │   └── dingtalk.go          # 钉钉 Webhook + 加签实现
│   │   │   └── feishu/                  # 飞书自定义机器人（预留）
│   │   │       └── feishu.go            # 骨架代码
│   │   │
│   │   └── job/                         # 定时任务
│   │       ├── scheduler.go             # Cron 调度器
│   │       ├── post_fetcher.go          # 帖子拉取（拉取后同时抓评论 + LLM 提炼 + 推送）
│   │       ├── trending_fetcher.go      # 热点大盘拉取（10 分钟一次 + LLM 分析 + 推送）
│   │       ├── feed_fetcher.go          # 信息流拉取（摘要生成后推送）
│   │       └── token_refresher.go       # 平台 Token 自动刷新
│   │
│   ├── third_party/                     # 第三方 proto 依赖（google/api 等）
│   ├── configs/
│   │   └── config.yaml                  # 运行配置
│   ├── Makefile                         # 构建脚本（proto 生成、wire 生成、编译等）
│   └── go.mod
│
├── .env.example
├── .gitignore
├── docker-compose.yml                   # MongoDB + Redis
└── README.md
```

---

## 登录与认证体系

### 登录方式（进入系统的身份认证）

| 方式 | 首期状态 | 协议 | 说明 |
|------|----------|------|------|
| Twitter OAuth 2.0 | ✅ MVP 实现 | OAuth 2.0 PKCE | 登录 + 自动复用为 Twitter 平台连接，MVP 唯一登录方式 |
| Google OAuth 2.0 | 🔮 预留 | OAuth 2.0 | 通用登录，无平台特殊权限 |
| 邮箱 + 密码 | 🔮 预留 | — | 注册/登录，密码 bcrypt 加密 |
| GitHub OAuth | 🔮 预留 | OAuth 2.0 | 开发者友好的登录选项 |
| 手机号 + 验证码 | 🔮 预留 | — | 国内用户友好（接入小红书/抖音时考虑） |

> **MVP 设计决策**: 首期产品聚焦 Twitter 运营，使用 Twitter OAuth 登录既完成身份认证又自动获得 Twitter 平台读取权限，用户一次授权即可开始使用，体验最简。后续增加其他登录方式时，只需实现对应的 auth provider 并在登录页增加按钮。

### MVP 登录流程（Twitter OAuth Only）

```
用户打开应用 → 登录页
       ↓
  ┌──────────────────────────────────────────┐
  │                                          │
  │         Social Ops Tool                  │
  │                                          │
  │    ┌──────────────────────────────┐      │
  │    │  🐦 使用 Twitter 账号登录     │      │
  │    └──────────────┬───────────────┘      │
  │                   │                      │
  │    ─ ─ ─ ─ ─ 即将支持 ─ ─ ─ ─ ─         │
  │    Google 登录 · 邮箱登录 (灰色)         │
  │                                          │
  └───────────────────┬──────────────────────┘
                      ↓
        跳转 Twitter OAuth 2.0 PKCE 授权页
                      ↓
        用户授权 → Twitter 回调
                      ↓
        后端用 code 换取 access_token
                      ↓
        创建/更新 User + 自动创建 PlatformConnection
                      ↓
        签发 JWT（Access Token + Refresh Token）
                      ↓
        前端存储 JWT → 直接进入 Dashboard
        （Twitter 平台已自动连接，无需额外操作）
```

### JWT Token 规范

- **Access Token**: 有效期 2 小时，`Authorization: Bearer <token>`
- **Refresh Token**: 有效期 7 天，httpOnly cookie
- Payload: `user_id`, `email`, `auth_provider`, `exp`

### 登录后自动连接逻辑

MVP 阶段仅 Twitter OAuth 登录，登录即自动连接 Twitter 平台。后续增加其他登录方式时按以下规则判断：

| 登录方式 | 自动连接 | 说明 |
|----------|----------|------|
| Twitter OAuth | ✅ 自动连接 Twitter 平台 | OAuth scope 包含读取权限，直接复用（MVP 唯一路径） |
| Google OAuth | ❌ 不自动连接 | Google 登录不等于任何社媒平台（预留） |
| 邮箱登录 | ❌ 不自动连接 | 需手动到设置页连接平台（预留） |

---

## 平台连接管理

### 设置页 — 平台连接面板

登录成功后，用户在「设置 → 平台连接」中管理社媒平台的连接状态。

```
┌──────────────────────────────────────────────────────────────┐
│  设置 > 平台连接                                              │
│                                                              │
│  已连接的平台                                                 │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ 🐦 Twitter                                    [管理] │    │
│  │    已连接 · @your_handle · 连接于 2026-03-15         │    │
│  │    权限: 读取推文、读取关注列表                        │    │
│  │    Token 状态: ✅ 有效（2026-04-15 过期）             │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  可连接的平台                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ 📕 小红书     │  │ 🎵 TikTok    │  │ 🎶 抖音      │       │
│  │              │  │              │  │              │       │
│  │  即将支持    │  │  即将支持     │  │  即将支持     │       │
│  │  [通知我]    │  │  [通知我]     │  │  [通知我]     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ 🌐 Farcaster │  │ ✈️ Telegram  │  │ 💬 Discord   │       │
│  │              │  │              │  │              │       │
│  │  即将支持    │  │  即将支持     │  │  即将支持     │       │
│  │  [通知我]    │  │  [通知我]     │  │  [通知我]     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 平台连接流程

```
用户点击「连接」按钮
       ↓
前端调用 GET /api/platforms/:platform/oauth-url
       ↓
后端通过 PlatformAdapter.GetOAuthURL() 生成授权 URL
       ↓
用户跳转到平台授权页 → 同意授权
       ↓
平台回调 → POST /api/platforms/:platform/oauth-callback
       ↓
后端通过 PlatformAdapter.HandleOAuthCallback() 换取 Token
       ↓
创建 PlatformConnection 记录（Token AES-256 加密存储）
       ↓
前端刷新平台连接状态 → 该平台功能解锁
```

### 平台连接状态机

```
  未连接 ──[用户点击连接]──→ 授权中 ──[授权成功]──→ 已连接
    ↑                         │                      │
    │                    [授权失败]              [Token 过期]
    │                         ↓                      ↓
    └──[用户断开连接]──── 连接失败              Token 刷新中
                                                     │
                                              [刷新成功] [刷新失败]
                                                  ↓         ↓
                                               已连接    需重新授权
```

---

## 功能清单与状态

### 首期功能（Twitter 平台）

| ID | 功能 | 优先级 | 状态 | 描述 |
|----|------|--------|------|------|
| F1 | 用户认证 | P0 | 待开发 | Twitter OAuth 2.0 PKCE 登录（MVP 唯一登录方式）；JWT 认证体系；预留 Google/邮箱登录扩展点 |
| F2 | 平台连接管理 | P0 | 待开发 | 设置页中的平台连接面板；首期仅 Twitter 可连接，其他展示「即将支持」 |
| F3 | 关注列表 → 监控导入 | P0 | 待开发 | 展示 Twitter 关注列表，勾选用户直接标记为监控账号；也支持手动输入用户名添加 |
| F4 | 监控账号详情页 | P0 | 待开发 | 进入监控账号详情，展示该账号的推文列表，每条推文展示 Top 10 评论 + LLM 内容摘要 |
| F5 | 推文 Top 10 评论 | P0 | 待开发 | 拉取每条监控推文的排名前十评论（按点赞排序），展示在推文下方 |
| F6 | 推文内容提炼 | P0 | 待开发 | 对每条推文调用 LLM 提炼核心内容（一句话摘要 + 关键要点），展示在推文卡片上 |
| F7 | LLM 生成回复草稿 | P0 | 待开发 | 基于推文+评论上下文，调用 Kimi/Claude 生成多份回复草稿，支持自定义 prompt |
| F8 | 草稿展示与一键复制 | P0 | 待开发 | 展示原推文 + 多份草稿，编辑、一键复制到剪贴板 |
| F9 | Twitter 热点大盘 | P0 | 待开发 | 实时监控 Twitter 热点话题，10 分钟更新一次，追踪出现次数，新旧热点颜色区分，LLM 提炼热点核心 + 写作方向建议 |
| F10 | 定时拉取推文 | P0 | 待开发 | 通过 Twitter API v2 按频率（5/10/15 分钟）拉取指定账号新推文 |
| F11 | 消息推送通道 | P0 | 待开发 | 新推文 / 草稿生成 / 热点更新时推送到 IM；MVP 仅支持钉钉，预留飞书 |
| F12 | 生成记录与历史 | P1 | 待开发 | 存储草稿，历史查看、状态追踪、防重复 |
| F13 | 按账号配置回复策略 | P1 | 待开发 | 不同被监控账号可设置不同 prompt 模板与回复风格 |
| F14 | 个人设置 | P1 | 待开发 | 轮询频率、默认 prompt、LLM 模型选择、推送通道配置，全部存储在服务端 |

### 后续扩展功能

| ID | 功能 | 优先级 | 状态 | 描述 |
|----|------|--------|------|------|
| F15 | 飞书推送通道 | P1 | 预留 | 增加飞书自定义机器人推送，实现 FeishuNotifier |
| F16 | Google OAuth 登录 | P1 | 预留 | 增加 Google 登录选项，拓宽用户入口 |
| F17 | 邮箱密码登录 | P1 | 预留 | 邮箱注册/登录，适用于无 Twitter 账号的用户 |
| F18 | 小红书平台接入 | P2 | 预留 | 实现 XiaohongshuAdapter，监控笔记、生成评论草稿 |
| F19 | TikTok 平台接入 | P2 | 预留 | 实现 TikTokAdapter，监控视频评论、生成互动内容 |
| F20 | 抖音平台接入 | P2 | 预留 | 实现 DouyinAdapter，监控视频评论、生成互动内容 |
| F21 | Farcaster 平台接入 | P2 | 预留 | 实现 FarcasterAdapter，监控 casts、生成回复 |
| F22 | Telegram / Discord | P2 | 预留 | 监控频道/群组消息，生成回复建议 |
| F23 | Instagram 平台接入 | P2 | 预留 | 监控帖子、生成评论草稿 |
| F24 | 跨平台仪表盘 | P2 | 预留 | 统一展示所有已连接平台的动态、草稿、摘要 |
| F25 | 机器自动发送 | P3 | 暂不实现 | 通过平台 API 自动发送，需严格风控 |

---

## 数据模型

> 所有业务模型均包含 `user_id` 做多用户数据隔离，包含 `platform` 字段区分来源平台。

### User（用户）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | ObjectID | 主键 |
| twitter_id | string | Twitter 用户 ID（MVP 唯一标识，唯一索引） |
| twitter_username | string | Twitter 用户名（不含 @） |
| email | string | 邮箱（可选，Twitter 授权返回时填充；后续邮箱登录用，唯一索引） |
| password_hash | string | bcrypt 加密密码（预留，MVP 不使用） |
| display_name | string | 显示名称（首次从 Twitter profile 获取） |
| avatar_url | string | 头像 URL（首次从 Twitter profile 获取） |
| auth_providers | []AuthProvider | 已绑定的登录方式列表 |
| default_llm_model | string | 用户偏好的默认 LLM 模型 |
| created_at | datetime | 注册时间 |
| updated_at | datetime | 更新时间 |

### AuthProvider（登录方式，嵌入 User 文档）

| 字段 | 类型 | 说明 |
|------|------|------|
| provider | string | MVP: "twitter"；预留: "google" / "email" / "github" |
| provider_user_id | string | 第三方平台用户 ID |
| provider_email | string | 第三方平台关联邮箱 |
| linked_at | datetime | 绑定时间 |

> 注意：AuthProvider **不存储** access_token。登录 Token 仅用于一次性身份验证后签发 JWT，无需持久化。平台的长期 Token 存储在 PlatformConnection 中。  
> MVP 阶段每个用户只有一条 `provider = "twitter"` 的记录，后续增加登录方式时追加即可。

### PlatformConnection（平台连接 —— 新增核心模型）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | ObjectID | 主键 |
| user_id | ObjectID | 所属用户 |
| platform | string | 平台标识："twitter" / "xiaohongshu" / "tiktok" / ... |
| platform_user_id | string | 该平台上的用户 ID |
| platform_username | string | 该平台上的用户名 |
| platform_display_name | string | 该平台上的显示名称 |
| platform_avatar_url | string | 该平台上的头像 |
| access_token | string | 加密存储的 access token（AES-256） |
| refresh_token | string | 加密存储的 refresh token |
| token_expires_at | datetime | Token 过期时间 |
| token_scopes | []string | 授权的权限范围 |
| status | string | 连接状态："active" / "expired" / "revoked" / "error" |
| last_synced_at | datetime | 最近一次成功同步数据的时间 |
| error_message | string | 最近的错误信息（状态异常时） |
| auto_connected | bool | 是否由登录自动连接（Twitter 登录 → 自动连接） |
| connected_at | datetime | 首次连接时间 |
| updated_at | datetime | 更新时间 |

### MonitoredAccount（被监控账号）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | ObjectID | 主键 |
| user_id | ObjectID | 所属用户 |
| platform | string | 平台标识 |
| platform_user_id | string | 平台内用户 ID |
| username | string | 平台用户名 |
| display_name | string | 显示名称 |
| avatar_url | string | 头像 URL |
| enabled | bool | 是否启用监控 |
| reply_prompt | string | 专属回复 prompt 模板（可选） |
| reply_tone | string | 回复风格 |
| tags | []string | 用户自定义标签 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### Post（帖子 —— 平台无关的统一模型）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | ObjectID | 主键 |
| user_id | ObjectID | 所属用户 |
| platform | string | 来源平台 |
| platform_post_id | string | 平台内帖子 ID（用于去重） |
| account_id | ObjectID | 关联的 MonitoredAccount ID |
| author_username | string | 作者用户名 |
| author_display_name | string | 作者显示名 |
| author_avatar_url | string | 作者头像 |
| content | string | 帖子正文 |
| media_urls | []string | 图片/视频链接 |
| post_url | string | 帖子原始链接 |
| published_at | datetime | 发布时间 |
| like_count | int | 点赞数 |
| repost_count | int | 转发数 |
| reply_count | int | 回复数 |
| is_reply | bool | 是否为回复帖子 |
| language | string | 帖子语言 |
| source | string | "monitor" / "feed" |
| **LLM 内容提炼** | | |
| content_summary | string | LLM 提炼的一句话摘要 |
| content_key_points | []string | LLM 提取的关键要点列表 |
| summary_model | string | 提炼所用的 LLM 模型 |
| summary_generated_at | datetime | 摘要生成时间 |
| **评论** | | |
| top_comments | []PostComment | 排名前十的评论（嵌入文档，按点赞排序） |
| comments_fetched_at | datetime | 评论拉取时间 |
| **状态** | | |
| draft_generated | bool | 是否已生成草稿 |
| platform_extra | JSON | 平台特有字段 |
| fetched_at | datetime | 系统抓取时间 |

### PostComment（帖子评论，嵌入 Post 文档）

> 存储每条推文的 Top 10 评论，按点赞数降序排列。

| 字段 | 类型 | 说明 |
|------|------|------|
| platform_comment_id | string | 平台内评论 ID |
| author_username | string | 评论者用户名 |
| author_display_name | string | 评论者显示名 |
| author_avatar_url | string | 评论者头像 |
| content | string | 评论内容 |
| like_count | int | 评论点赞数 |
| published_at | datetime | 评论发布时间 |
| rank | int | 排名（1-10） |

### ReplyDraft（回复草稿）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | ObjectID | 主键 |
| user_id | ObjectID | 所属用户 |
| post_id | ObjectID | 关联的 Post ID |
| platform | string | 平台标识 |
| original_content | string | 原帖内容快照 |
| draft_content | string | 生成的回复草稿 |
| model | string | LLM 模型（"kimi" / "claude"） |
| prompt_used | string | 使用的 prompt 模板 |
| tone | string | 回复风格标签 |
| status | string | "generated" / "edited" / "copied" / "sent" |
| copied_at | datetime | 复制时间 |
| rating | int | 草稿质量评分（1-5） |
| created_at | datetime | 生成时间 |
| updated_at | datetime | 更新时间 |

### TrendingTopic（热点话题 —— 热点大盘核心模型）

> 每 10 分钟从 Twitter Trending API 拉取，持久化到数据库，追踪出现次数和生命周期。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | ObjectID | 主键 |
| platform | string | 平台标识（首期 "twitter"） |
| topic_name | string | 热点话题名称（如 "#AI" 或 "SpaceX"） |
| topic_query | string | 热点搜索词（Twitter 返回的 query） |
| topic_url | string | 话题链接 |
| tweet_volume | int | 话题推文量（Twitter 返回，可能为 null） |
| **追踪数据** | | |
| occurrence_count | int | 累计出现次数（每个拉取周期出现则 +1） |
| first_seen_at | datetime | 首次出现时间 |
| last_seen_at | datetime | 最近一次出现时间 |
| is_new | bool | 是否为本轮新出现（前一轮未出现则为 true） |
| consecutive_count | int | 连续出现次数（中断则重置） |
| peak_rank | int | 历史最高排名 |
| current_rank | int | 当前排名 |
| **LLM 分析** | | |
| core_summary | string | LLM 提炼的热点核心内容（一句话） |
| writing_suggestions | []WritingSuggestion | LLM 生成的写作方向建议 |
| analysis_generated_at | datetime | 分析生成时间 |
| **状态** | | |
| status | string | "active"（当前在榜）/ "faded"（已退出热榜） |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### WritingSuggestion（写作方向建议，嵌入 TrendingTopic）

| 字段 | 类型 | 说明 |
|------|------|------|
| angle | string | 写作切入角度（如 "技术解读"、"观点评论"、"数据分析"） |
| title_suggestion | string | 推荐标题/开头 |
| description | string | 简要说明为什么这个方向值得写 |
| target_audience | string | 目标受众 |

### TrendingSnapshot（热点快照 —— 保存每轮拉取的完整榜单）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | ObjectID | 主键 |
| platform | string | 平台标识 |
| fetched_at | datetime | 拉取时间 |
| topics | []SnapshotTopic | 本轮完整的热点列表（排名快照） |

### SnapshotTopic（快照条目，嵌入 TrendingSnapshot）

| 字段 | 类型 | 说明 |
|------|------|------|
| topic_name | string | 话题名称 |
| rank | int | 本轮排名 |
| tweet_volume | int | 推文量 |
| is_new | bool | 本轮是否新出现 |

### FeedSummary（信息流摘要）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | ObjectID | 主键 |
| user_id | ObjectID | 所属用户 |
| platform | string | 平台标识 |
| fetched_at | datetime | 拉取时间 |
| post_count | int | 纳入摘要的帖子数量 |
| post_snapshot | []PostSnapshot | 帖子快照列表 |
| summary_content | string | LLM 生成的结构化摘要 |
| highlights | []Highlight | 高亮条目 |
| created_at | datetime | 创建时间 |

### Highlight（高亮条目，嵌入 FeedSummary）

| 字段 | 类型 | 说明 |
|------|------|------|
| type | string | "hot_topic" / "key_opinion" / "recommended_account" |
| title | string | 标题 |
| description | string | 描述 |
| related_post_ids | []string | 关联的帖子 ID |

### UserSettings（用户个人设置 —— 服务端存储）

> 每个用户一条记录，首次登录时创建默认值。所有偏好配置集中存储，前端通过 API 读写。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | ObjectID | 主键 |
| user_id | ObjectID | 所属用户（唯一索引） |
| **轮询配置** | | |
| poll_interval_minutes | int | 帖子拉取频率（默认 10） |
| feed_poll_interval_minutes | int | 推荐流拉取频率（默认 5） |
| **LLM 配置** | | |
| default_llm_model | string | 默认 LLM 模型："kimi" / "claude" |
| default_reply_prompt | string | 全局默认回复 prompt 模板 |
| default_reply_tone | string | 全局默认回复风格 |
| **推送通道配置** | | |
| notify_channels | []NotifyChannel | 已配置的推送通道列表 |
| notify_on_new_post | bool | 新推文到达时是否推送（默认 true） |
| notify_on_draft_ready | bool | 草稿生成完成时是否推送（默认 true） |
| notify_on_trending | bool | 热点大盘更新时是否推送（默认 true） |
| notify_on_feed_summary | bool | 信息流摘要生成时是否推送（默认 false） |
| **其他** | | |
| timezone | string | 用户时区（默认 "Asia/Shanghai"） |
| language | string | 界面语言（默认 "zh-CN"） |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### NotifyChannel（推送通道，嵌入 UserSettings）

| 字段 | 类型 | 说明 |
|------|------|------|
| type | string | 通道类型：MVP 仅 "dingtalk"，预留 "feishu" / "slack" / "webhook" |
| name | string | 用户自定义通道名称（如 "我的工作群"） |
| webhook_url | string | Webhook 地址（加密存储） |
| secret | string | 签名密钥（钉钉加签用，加密存储） |
| enabled | bool | 是否启用 |
| notify_events | []string | 该通道接收哪些事件：["new_post", "draft_ready", "trending", "feed_summary"] |
| created_at | datetime | 创建时间 |

### NotifyLog（推送记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | ObjectID | 主键 |
| user_id | ObjectID | 所属用户 |
| channel_type | string | 通道类型 |
| channel_name | string | 通道名称 |
| event_type | string | 事件类型："new_post" / "draft_ready" / "trending" / "feed_summary" |
| payload | JSON | 推送内容快照 |
| status | string | "success" / "failed" |
| error_message | string | 失败原因（失败时记录） |
| created_at | datetime | 推送时间 |

### WaitlistEntry（平台等待通知）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | ObjectID | 主键 |
| user_id | ObjectID | 用户 |
| platform | string | 等待的平台 |
| created_at | datetime | 登记时间 |

---

## 用户流程

### 首次使用完整流程（MVP）

```
1. 打开应用 → 登录页（仅展示 Twitter 登录按钮）
       ↓
2. 点击「使用 Twitter 账号登录」→ Twitter OAuth 授权
       ↓
3. 授权成功 → 自动创建用户 + 自动连接 Twitter 平台
       ↓
4. 进入「关注列表」页 → 展示 Twitter 关注的所有用户
       ↓
5. 勾选想监控的账号 → 点击「加入监控」→ 批量添加到监控列表
       ↓
6. 进入 Dashboard → 查看已监控账号动态 + 热点大盘
       ↓
7. 点击某个监控账号 → 进入详情页 → 看推文 + 评论 + 内容摘要
       ↓
8. 对感兴趣的推文生成回复草稿 → 编辑 → 复制 → 手动发送
```

### 流程 A：关注列表 → 标记监控

```
┌──────────────────────────────────────────────────────────────┐
│  我的关注列表                              [搜索关注用户...]  │
│                                                              │
│  ☑ @elonmusk · Elon Musk                          [已监控]  │
│  ☐ @vaborhttps · Vitalik Buterin                   [监控]   │
│  ☑ @naval · Naval Ravikant                         [已监控]  │
│  ☐ @pmarca · Marc Andreessen                       [监控]   │
│  ☐ @balaborhttps · Balaji Srinivasan               [监控]   │
│  ... （滚动加载更多）                                         │
│                                                              │
│  已选 2 个账号                    [批量加入监控]               │
└──────────────────────────────────────────────────────────────┘

操作：
  - 每个用户右侧有 [监控] / [已监控] 按钮，可单个操作
  - 也可通过左侧勾选框批量选择 → 点击「批量加入监控」
  - 已监控的账号标记为灰色「已监控」，避免重复
  - 支持搜索过滤关注列表
```

### 流程 B：监控账号详情页

```
┌──────────────────────────────────────────────────────────────────┐
│  ← 返回监控列表                                                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 🐦 @elonmusk · Elon Musk                                │    │
│  │ 粉丝 180M · 监控中 · 拉取频率 10min · 最近更新 3min 前    │    │
│  │ [编辑监控设置]  [暂停监控]                                 │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  最新推文                                                         │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 📝 推文内容                                    3 小时前    │    │
│  │ "Exciting progress on Starship. Full stack test          │    │
│  │  flight soon..."                                          │    │
│  │                                                          │    │
│  │ ❤️ 120k  🔁 35k  💬 8.2k                                 │    │
│  │                                                          │    │
│  │ 💡 核心内容提炼                                           │    │
│  │ ┌────────────────────────────────────────────────────┐   │    │
│  │ │ 摘要: SpaceX 星舰全栈测试飞行即将进行                │   │    │
│  │ │ 要点: • 星舰开发取得重大进展                         │   │    │
│  │ │       • 全栈测试飞行时间临近                         │   │    │
│  │ │       • 暗示可能有更多技术细节公布                   │   │    │
│  │ └────────────────────────────────────────────────────┘   │    │
│  │                                                          │    │
│  │ 🔥 Top 10 评论                                           │    │
│  │ ┌────────────────────────────────────────────────────┐   │    │
│  │ │ 1. @user_a: "Can't wait! This is huge..."  ❤️ 5.2k│   │    │
│  │ │ 2. @user_b: "When exactly? Dates?"         ❤️ 3.1k│   │    │
│  │ │ 3. @user_c: "History in the making"         ❤️ 2.8k│   │    │
│  │ │ ... 展开更多                                        │   │    │
│  │ └────────────────────────────────────────────────────┘   │    │
│  │                                                          │    │
│  │ 🤖 生成回复草稿                                           │    │
│  │ ┌─────────────┐ ┌─────────────┐                          │    │
│  │ │ Kimi 生成    │ │ Claude 生成  │                          │    │
│  │ └─────────────┘ └─────────────┘                          │    │
│  │                                                          │    │
│  │ 已生成的草稿：                                            │    │
│  │ ┌────────────────────────────────────────────────────┐   │    │
│  │ │ [Kimi] "This is a monumental step for..."          │   │    │
│  │ │                               [编辑] [复制] [发送]  │   │    │
│  │ ├────────────────────────────────────────────────────┤   │    │
│  │ │ [Claude] "The pace of innovation at SpaceX..."     │   │    │
│  │ │                               [编辑] [复制] [发送]  │   │    │
│  │ └────────────────────────────────────────────────────┘   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  （下一条推文...）                                                │
└──────────────────────────────────────────────────────────────────┘
```

### 流程 C：Twitter 热点大盘

```
┌──────────────────────────────────────────────────────────────────┐
│  🔥 Twitter 热点大盘                    最近更新: 2 分钟前        │
│                                         自动刷新: 每 10 分钟      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 排名  话题              推文量    出现次数  状态    操作   │    │
│  │────────────────────────────────────────────────────────── │    │
│  │  1   #SpaceX           125k      12 次    🔴 新!   [详情]│    │
│  │  2   #AI               89k       48 次    ⚪ 持续  [详情]│    │
│  │  3   #Bitcoin          76k       36 次    ⚪ 持续  [详情]│    │
│  │  4   Trump             63k       3 次     🟡 回归  [详情]│    │
│  │  5   #OpenAI           52k       8 次     🔴 新!   [详情]│    │
│  │  ...                                                     │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  颜色说明:                                                        │
│  🔴 新! = 本轮首次出现（前一轮不在榜）                             │
│  ⚪ 持续 = 连续多轮在榜                                           │
│  🟡 回归 = 曾经退出后重新回到榜单                                  │
│                                                                  │
│  展开详情 — #SpaceX                                               │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 📊 热点追踪                                               │    │
│  │ 首次出现: 2026-03-20 14:00  |  累计出现: 12 次            │    │
│  │ 最高排名: #1  |  当前推文量: 125,000                       │    │
│  │                                                          │    │
│  │ 💡 热点核心                                               │    │
│  │ SpaceX 星舰即将进行全栈测试飞行，Elon Musk 在推特上       │    │
│  │ 发布了最新进展，引发全球航天爱好者热议。                    │    │
│  │                                                          │    │
│  │ ✍️ 写作方向建议                                           │    │
│  │ ┌────────────────────────────────────────────────────┐   │    │
│  │ │ 1. 技术解读                                        │   │    │
│  │ │    "星舰全栈测试的技术挑战与突破"                    │   │    │
│  │ │    面向航天技术爱好者，解读试飞的技术难点            │   │    │
│  │ │                                                    │   │    │
│  │ │ 2. 行业影响                                        │   │    │
│  │ │    "SpaceX 试飞成功将如何改变商业航天格局"           │   │    │
│  │ │    面向投资者和行业从业者                            │   │    │
│  │ │                                                    │   │    │
│  │ │ 3. 热点评论                                        │   │    │
│  │ │    "为什么全世界都在关注这次星舰试飞"                │   │    │
│  │ │    面向大众读者，通俗解读热点背景                    │   │    │
│  │ └────────────────────────────────────────────────────┘   │    │
│  │                                                          │    │
│  │ [基于此热点生成推文草稿]                                  │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  历史热点  [查看历史快照]                                          │
└──────────────────────────────────────────────────────────────────┘
```

### 流程 D：监控帖子 → 生成草稿 → 手动发送

```
系统定时拉取帖子（通过 PlatformAdapter，cron 调度）
       ↓
新帖子入库 → 同时拉取该推文的 Top 10 评论
       ↓
调用 LLM 提炼推文核心内容（一句话摘要 + 关键要点）
       ↓
推送通知到钉钉（如已配置）
       ↓
用户进入监控账号详情页 → 查看推文 + 评论 + 内容摘要
       ↓
基于推文 + 评论上下文，调用 LLM 生成多份回复草稿（多模型并行）
       ↓
用户编辑草稿（可选）→ 一键复制 → 手动到 Twitter 粘贴发送
       ↓
系统记录生成历史 → 用户可评分草稿质量
```

### 流程 E：热点大盘定时更新

```
每 10 分钟 cron 触发
       ↓
通过 Twitter API 拉取当前 Trending Topics
       ↓
保存 TrendingSnapshot（本轮完整快照）
       ↓
与数据库中已有 TrendingTopic 比对：
  ├─ 新话题 → 创建记录，is_new = true，occurrence_count = 1
  ├─ 已有话题仍在榜 → occurrence_count++，更新排名和推文量
  └─ 已有话题退出榜单 → status = "faded"
       ↓
对新出现的热点 + 排名上升的热点调用 LLM：
  - 提炼热点核心内容
  - 生成 2-3 个写作方向建议
       ↓
推送热点更新到钉钉（如已配置）
```

### 副流程：消息推送（钉钉/飞书）

```
触发时机（任一）：
  ├─ 新推文入库（post_fetcher 拉取到新帖子）
  ├─ 草稿生成完成（LLM 返回结果）
  └─ 信息流摘要生成完成
       ↓
查询用户 UserSettings.notify_channels
       ↓
过滤启用的通道 + 匹配事件类型（notify_events）
       ↓
通过 NotifierRegistry 获取对应 Notifier 实例
       ↓
  ┌─────────────────────────────────────────────────┐
  │ DingtalkNotifier（MVP）                          │
  │                                                  │
  │  1. 构造 Markdown 消息体                          │
  │  2. 用 secret 计算 HmacSHA256 签名（加签模式）    │
  │  3. POST webhook_url + timestamp + sign           │
  │  4. 记录 NotifyLog（成功/失败）                    │
  └─────────────────────────────────────────────────┘
       ↓
推送消息示例（钉钉 Markdown 卡片）：
  ┌──────────────────────────────────────┐
  │ 🐦 新推文提醒                        │
  │                                      │
  │ @elonmusk 发布了新推文：              │
  │ "Exciting progress on Starship..."   │
  │                                      │
  │ ❤️ 12.3k  🔁 5.6k  💬 2.1k          │
  │                                      │
  │ [查看原文](https://x.com/...)        │
  │ [去生成回复草稿](https://app/...)     │
  └──────────────────────────────────────┘
```

### Notifier 接口定义（Go 伪码）

```go
type NotifyEvent struct {
    Type      string      // "new_post" / "draft_ready" / "feed_summary"
    UserID    string
    Title     string
    Content   string
    URL       string      // 跳转链接（应用内页面）
    Extra     interface{} // 事件特有数据（Post / ReplyDraft / FeedSummary）
}

type Notifier interface {
    Type() string                                          // "dingtalk" / "feishu" / "slack"
    DisplayName() string                                   // "钉钉" / "飞书" / "Slack"
    IsAvailable() bool                                     // 是否已上线
    Send(ctx context.Context, channel NotifyChannel, event NotifyEvent) error
    ValidateConfig(channel NotifyChannel) error            // 校验 webhook_url / secret 格式
    TestNotify(ctx context.Context, channel NotifyChannel) error  // 发送测试消息
}

type NotifierRegistry struct {
    notifiers map[string]Notifier
}
```

---

## 个人设置 — 推送通道配置 UI

```
┌──────────────────────────────────────────────────────────────────┐
│  设置 > 消息推送                                                  │
│                                                                  │
│  推送事件                                                         │
│  ┌────────────────────────────────────────────────────────┐      │
│  │ ☑ 新推文到达时推送                                      │      │
│  │ ☑ 回复草稿生成完成时推送                                 │      │
│  │ ☑ 热点大盘更新时推送                                     │      │
│  │ ☐ 信息流摘要生成时推送                                   │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                  │
│  已配置的推送通道                                                  │
│  ┌────────────────────────────────────────────────────────┐      │
│  │ 🔔 钉钉 · 我的运营群                           [编辑]  │      │
│  │    状态: ✅ 正常                                        │      │
│  │    接收事件: 新推文、草稿生成                             │      │
│  │    [发送测试消息]  [删除]                                │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                  │
│  添加推送通道                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ 🔔 钉钉      │  │ 📘 飞书      │  │ 💬 Slack     │           │
│  │              │  │              │  │              │           │
│  │  [添加]      │  │  即将支持    │  │  即将支持     │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  添加钉钉机器人（展开表单）                                        │
│  ┌────────────────────────────────────────────────────────┐      │
│  │ 通道名称:   [我的运营群________________]                │      │
│  │ Webhook URL: [https://oapi.dingtalk.com/robot/send?... │      │
│  │ 签名密钥:    [SEC**********************]               │      │
│  │ 接收事件:   ☑ 新推文  ☑ 草稿生成  ☑ 热点更新  ☐ 摘要   │      │
│  │                                                        │      │
│  │ [发送测试消息]                    [取消]  [保存]        │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 后端 API 设计

> 所有业务接口需要 `Authorization: Bearer <token>` 请求头。  
> 分页统一使用 `?page=1&page_size=20&sort_by=created_at&order=desc`。

### 认证（登录）

**MVP 接口（Twitter OAuth）：**

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | /api/auth/twitter/url | 无 | 获取 Twitter OAuth 2.0 PKCE 授权 URL（query: callback_url） |
| POST | /api/auth/twitter/callback | 无 | Twitter 登录回调，用 code 换取 JWT（同时自动创建 PlatformConnection） |
| POST | /api/auth/refresh | Cookie | 用 Refresh Token 刷新 Access Token |
| GET | /api/auth/me | JWT | 获取当前用户信息 |
| PUT | /api/auth/me | JWT | 更新用户信息（显示名称等） |
| POST | /api/auth/logout | JWT | 登出（清除 Refresh Token cookie） |

**预留接口（后续实现）：**

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | /api/auth/google/url | 无 | 获取 Google OAuth 2.0 授权 URL（预留） |
| POST | /api/auth/google/callback | 无 | Google 登录回调（预留） |
| POST | /api/auth/email/register | 无 | 邮箱注册（预留） |
| POST | /api/auth/email/login | 无 | 邮箱登录（预留） |
| POST | /api/auth/link/:provider | JWT | 绑定新登录方式到当前账号（预留） |
| DELETE | /api/auth/link/:provider | JWT | 解绑登录方式（预留） |

### 平台连接管理（新增）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/platforms | 获取所有平台信息（含已上线/未上线状态、图标、名称） |
| GET | /api/platforms/connections | 获取当前用户已连接的平台列表（含状态、Token 有效期等） |
| GET | /api/platforms/:platform/oauth-url | 获取指定平台的 OAuth 授权 URL（用于连接平台） |
| POST | /api/platforms/:platform/oauth-callback | 平台 OAuth 回调，创建 PlatformConnection |
| DELETE | /api/platforms/:platform/connection | 断开与指定平台的连接 |
| POST | /api/platforms/:platform/refresh | 手动刷新指定平台的 Token |
| GET | /api/platforms/:platform/status | 获取指定平台连接的健康状态 |
| POST | /api/platforms/waitlist | 登记「即将支持」平台的通知（body: platform） |

### 关注列表 & 监控账号

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/following | 获取 Twitter 关注列表（分页，含是否已监控标记） |
| POST | /api/following/monitor | 从关注列表批量加入监控（body: platform_user_ids） |
| GET | /api/accounts | 获取监控账号列表（query: platform, tag, enabled） |
| GET | /api/accounts/:id | 获取监控账号详情（含最新推文概览） |
| POST | /api/accounts | 手动添加监控账号（body: platform, username） |
| POST | /api/accounts/batch | 批量添加 |
| PUT | /api/accounts/:id | 更新配置（prompt、风格、标签） |
| DELETE | /api/accounts/:id | 删除监控账号 |

### 帖子 & 评论 & 内容提炼

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/accounts/:id/posts | 获取指定监控账号的推文列表（分页，监控账号详情页用） |
| GET | /api/posts | 帖子列表（query: platform, account_id, source, has_draft, 分页） |
| GET | /api/posts/:id | 帖子详情（含 Top 10 评论 + 内容摘要 + 草稿列表） |
| POST | /api/posts/:id/refresh-comments | 手动刷新指定推文的 Top 10 评论 |
| POST | /api/posts/:id/generate-summary | 手动触发 LLM 内容提炼（如自动生成未触发时） |
| POST | /api/posts/:id/generate-draft | 基于推文 + 评论上下文生成回复草稿 |
| POST | /api/posts/batch-generate | 批量生成草稿 |

### 热点大盘

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/trending | 获取当前热点列表（含出现次数、新旧状态、排名变化） |
| GET | /api/trending/:id | 获取热点详情（含 LLM 核心分析 + 写作方向建议） |
| GET | /api/trending/snapshots | 获取历史快照列表（分页） |
| GET | /api/trending/snapshots/:id | 获取某次快照详情（完整榜单） |
| POST | /api/trending/:id/generate-draft | 基于热点话题生成推文草稿 |

### 草稿

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/drafts | 草稿列表（query: platform, status, post_id, 分页） |
| GET | /api/drafts/:id | 草稿详情 |
| PUT | /api/drafts/:id | 编辑草稿 |
| PATCH | /api/drafts/:id/status | 更新状态（copied / sent） |
| POST | /api/drafts/:id/rate | 评分 |

### 信息流摘要

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/feed-summaries | 摘要列表（query: platform, 分页） |
| GET | /api/feed-summaries/latest | 最新摘要（query: platform） |
| GET | /api/feed-summaries/:id | 摘要详情 |

### 个人设置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/settings | 获取用户个人设置（含推送通道列表） |
| PUT | /api/settings | 更新通用设置（轮询频率、LLM、推送事件开关等） |

### 推送通道管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/settings/notify-channels | 获取所有可用通道类型（含已上线/未上线） |
| POST | /api/settings/notify-channels | 添加推送通道（body: type, name, webhook_url, secret, notify_events） |
| PUT | /api/settings/notify-channels/:id | 更新推送通道配置 |
| DELETE | /api/settings/notify-channels/:id | 删除推送通道 |
| PATCH | /api/settings/notify-channels/:id/toggle | 启用/禁用推送通道 |
| POST | /api/settings/notify-channels/:id/test | 发送测试消息（验证 Webhook 配置是否正确） |
| GET | /api/settings/notify-logs | 获取推送记录（query: channel_type, status, 分页） |

---

## 环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| **应用** | | |
| APP_SECRET | 是 | JWT 签名密钥 |
| APP_ENV | 否 | development / production，默认 development |
| ENCRYPTION_KEY | 是 | 平台 Token 加密密钥（AES-256，32 字节） |
| **存储** | | |
| MONGODB_URI | 是 | MongoDB 连接字符串 |
| REDIS_URI | 是 | Redis 连接字符串 |
| **LLM** | | |
| KIMI_API_KEY | 是 | Kimi（月之暗面）API Key |
| CLAUDE_API_KEY | 否 | Claude API Key |
| **Twitter（MVP 登录 + 平台连接）** | | |
| TWITTER_BEARER_TOKEN | 否 | Twitter API v2 Bearer Token（无则用 mock 数据） |
| TWITTER_CLIENT_ID | 是 | Twitter OAuth 2.0 Client ID（MVP 登录 + 平台连接共用） |
| TWITTER_CLIENT_SECRET | 是 | Twitter OAuth 2.0 Client Secret |
| **Google（预留，后续登录用）** | | |
| GOOGLE_CLIENT_ID | 否 | Google OAuth 2.0 Client ID（预留） |
| GOOGLE_CLIENT_SECRET | 否 | Google OAuth 2.0 Client Secret（预留） |
| **小红书（预留）** | | |
| XHS_APP_KEY | 否 | 小红书开放平台 App Key |
| XHS_APP_SECRET | 否 | 小红书开放平台 App Secret |
| **TikTok（预留）** | | |
| TIKTOK_CLIENT_KEY | 否 | TikTok for Business Client Key |
| TIKTOK_CLIENT_SECRET | 否 | TikTok for Business Client Secret |
| **邮件（预留，邮箱登录/通知用）** | | |
| SMTP_HOST | 否 | 邮件服务器地址（预留） |
| SMTP_PORT | 否 | 邮件服务器端口（预留） |
| SMTP_USERNAME | 否 | 邮件服务器用户名（预留） |
| SMTP_PASSWORD | 否 | 邮件服务器密码（预留） |
| **调度** | | |
| POLL_INTERVAL_MINUTES | 否 | 帖子拉取频率，默认 10 分钟 |
| FEED_POLL_INTERVAL_MINUTES | 否 | 推荐流拉取频率，默认 5 分钟 |

> 所有密钥写入 `.env` 文件，**禁止提交到代码仓库**。  
> 预留的环境变量在首期可不配置，相应平台 Adapter 的 `IsAvailable()` 返回 false。

---

## 启动方式

### 基础设施（Docker Compose）

```bash
docker-compose up -d    # 启动 MongoDB + Redis
```

### 后端

```bash
cd backend
cp configs/config.yaml.example configs/config.yaml  # 填写配置

# 首次或 proto 变更后：生成 protobuf 代码 + wire 依赖注入
make init      # 安装 protoc、kratos CLI 等工具（仅首次）
make api       # 由 .proto 生成 Go 代码（HTTP/gRPC stub）
make generate  # 运行 wire 生成依赖注入代码

# 启动
kratos run
# 或
go run cmd/server/main.go -conf configs/config.yaml
# 默认 HTTP 运行在 http://localhost:8000，gRPC 运行在 localhost:9000
```

### 前端

```bash
cd frontend
npm install
npm run dev
# 默认运行在 http://localhost:5173
```

### 访问

浏览器打开 http://localhost:5173

---

## 关键实现要点

### Kratos 框架相关

1. **Protobuf API 优先**: 所有 API 先在 `api/socialtool/v1/*.proto` 中定义，通过 `google.api.http` 注解同时生成 HTTP + gRPC 接口代码，保证接口规范与文档一致
2. **分层架构（Kratos Layout）**: `service/`（协议转换）→ `biz/`（核心业务）→ `data/`（数据访问），各层通过接口解耦，`biz` 层定义 repo 接口，`data` 层实现
3. **Wire 依赖注入**: 使用 Google Wire 编译期依赖注入，`cmd/server/wire.go` 声明依赖关系，`make generate` 自动生成注入代码
4. **Kratos 中间件**: JWT 认证、限流、日志、错误处理均通过 Kratos middleware 机制注册到 HTTP/gRPC Server
5. **配置管理**: 配置通过 `internal/conf/conf.proto` 定义，支持 YAML/环境变量/远程配置中心，类型安全
6. **错误处理**: 使用 Kratos errors 包定义业务错误码，proto 中声明错误枚举，HTTP/gRPC 自动映射状态码

### 业务相关

7. **登录与平台连接分离**: 登录解决身份认证（JWT），平台连接解决社媒授权（PlatformConnection），两者独立但可自动关联
8. **平台适配器模式**: 所有平台交互通过 `PlatformAdapter` 接口抽象，新增平台只需实现接口 + 注册到 Registry
9. **平台注册中心**: `PlatformRegistry` 管理所有适配器，`ListAll()` 返回全部平台（含未上线），前端据此渲染平台面板
10. **帖子去重**: `platform + platform_post_id` 联合唯一键
11. **多模型并行**: 同一帖子可同时调用 Kimi 和 Claude 生成多份草稿
12. **Prompt 模板**: 全局默认 → 平台级 → 账号级覆盖，模板变量 `{{content}}`、`{{author}}`、`{{platform}}`
13. **Token 自动刷新**: `token_refresher` cron 任务定期检查即将过期的 PlatformConnection，自动调用 `RefreshToken()`
14. **平台特有字段**: Post 模型的 `platform_extra` JSON 字段存储各平台独有数据，无需改表结构
15. **帖子优先级**: `互动量加权分 × 时效衰减因子` 自动排序
16. **草稿状态流转**: generated → edited → copied → sent
17. **优雅降级**: 未配置环境变量的平台 Adapter 自动标记为不可用，不影响系统运行
18. **推文评论抓取**: 帖子拉取后同步抓取 Top 10 评论（按点赞排序），嵌入 Post 文档，减少二次查询
19. **内容提炼流水线**: 新帖子入库 → 自动调用 LLM 提炼核心内容（一句话摘要 + 关键要点），结果直接写入 Post 文档
20. **热点追踪**: 每 10 分钟拉取 Twitter Trending，与已有数据比对计算 occurrence_count / is_new / consecutive_count，保存 Snapshot 用于历史回溯
21. **热点写作建议**: 对新出现或排名上升的热点调用 LLM 生成写作方向（切入角度 + 标题建议 + 目标受众）
22. **推送通道适配器**: 与平台 Adapter 同样的注册中心模式，`NotifierRegistry` 管理所有通道类型，新增通道只需实现 `Notifier` 接口
23. **推送异步化**: 推送操作在独立 goroutine 中执行，不阻塞主流程；失败自动记录 NotifyLog，不影响核心功能
24. **个人设置服务端存储**: 所有用户偏好统一存储在 `UserSettings` 中，前端无需本地持久化，换设备/换浏览器设置自动同步

---

## 迭代计划

### Phase 1：MVP —— 5-6 周

| 周次 | 目标 | 包含功能 |
|------|------|----------|
| W1 | 项目脚手架 + 认证 | Kratos 项目初始化（proto、Wire、Makefile）、前端初始化、Twitter OAuth 2.0 PKCE 登录、JWT 中间件、PlatformAdapter 接口 + Registry |
| W2 | 关注列表 + 监控 | 关注列表页（勾选加入监控）、监控账号 CRUD、TwitterAdapter 实现、定时拉取推文 + Top 10 评论 |
| W3 | 账号详情 + 内容提炼 | 监控账号详情页、推文列表 + 评论展示、LLM 内容提炼（摘要 + 要点）、LLM 草稿生成/编辑/复制 |
| W4 | 热点大盘 | Twitter Trending 拉取（10 分钟 cron）、热点追踪（出现次数 + 新旧标记）、LLM 热点分析 + 写作方向建议、热点大盘页面 |
| W5 | 推送 + 设置 | 钉钉推送通道（Notifier 接口 + DingtalkNotifier）、个人设置页（推送通道 + 通用配置）、推送事件集成（新推文/草稿/热点） |
| W6 | 打磨 + 联调 | 平台连接面板、草稿历史页、整体 UI 打磨与测试、未上线平台展示「即将支持」 |

### Phase 2：增强功能 —— 2-3 周

- 飞书推送通道（FeishuNotifier）
- Google OAuth / 邮箱密码登录（拓宽用户入口）
- 草稿质量评分与 prompt 优化建议
- 帖子智能优先级排序
- 浏览器推送通知（Web Push）
- Token 自动刷新与异常告警
- 数据导出（CSV/JSON）

### Phase 3：多平台扩展 —— 按需

- 小红书 Adapter 实现（监控笔记、生成评论）
- TikTok / 抖音 Adapter 实现（监控视频评论）
- Farcaster Adapter 实现
- Telegram / Discord Adapter 实现
- 跨平台统一仪表盘

---

## 合规与风险

- 遵守各平台 API 速率限制，设置请求频率上限与退避策略
- 所有 API Key 和 OAuth Token 通过环境变量管理，禁止硬编码
- 平台 OAuth Token 在数据库中 AES-256 加密存储，ENCRYPTION_KEY 不可泄露
- MVP 不实现自动发送，规避自动化操控风险
- 用户数据按 `user_id` 严格隔离，不可跨用户访问
- 设置 LLM 调用频率上限，防止滥用导致成本失控
- 平台 Token 刷新失败时通知用户重新授权，不静默失败
- 支持用户数据导出与删除，为后续合规（GDPR 等）做准备
- 小红书/抖音接入时需特别注意国内平台的合规要求与反爬策略

