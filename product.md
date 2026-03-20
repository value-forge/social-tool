# 社媒运营 Tool

> **项目名称**: social-tool。  
> **项目状态**: 规划阶段，尚未有实现代码。  
> **产品详细文档**: `./product.md`

## 项目定义

- **名称**: Twitter 运营工具（Twitter Ops Tool）
- **目标**: 帮助用户高效运营 Twitter 账号——监控关注对象推文，自动生成回复草稿，用户复制后手动粘贴到 Twitter 发送
- **MVP 边界**: 仅实现「读推文 + 生成回复草稿 + 推荐流摘要」，**不实现**机器自动发推

---

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 前端 | Vite + React + TypeScript
| 前端状态 | TanStack Query | 服务端状态缓存 |
| 前端路由 | React Router | 页面路由 |
| 前端请求 | axios / fetch | 调用后端 REST API |
| 后端 | Go + Kratos | 微服务框架，提供 REST/gRPC-Gateway |
| ORM | GORM | 数据库访问 |
| 存储 | MongoDB | 持久化所有业务数据 |
| 推文获取 | Twitter 官方 API | 读取公开推文、推荐流 |
| LLM | Kimi（月之暗面）API、Claude API | 生成回复草稿与推荐流摘要 |

---

## 目录结构（规划）

```
twitter-ops-tool/
├── frontend/                  # Vite + React 前端
│   ├── src/
│   │   ├── pages/             # 页面组件
│   │   │   ├── MonitorPage    # 监控账号管理页
│   │   │   ├── TweetListPage  # 推文列表 + 草稿生成页
│   │   │   ├── DraftHistory   # 草稿历史记录页
│   │   │   └── FeedSummary    # 推荐流摘要页
│   │   ├── components/        # 通用 UI 组件
│   │   ├── api/               # 后端 API 请求封装
│   │   └── stores/            # 全局状态管理
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                   # Go-Kratos 后端
│   ├── api/                   # Protobuf API 定义
│   ├── cmd/                   # 程序入口
│   ├── internal/
│   │   ├── biz/               # 核心业务逻辑（Nitter 抓取、LLM 调用）
│   │   ├── data/              # 数据访问层（GORM + MongoDB）
│   │   ├── service/           # 服务层（API handler）
│   │   └── job/               # 定时任务（推文拉取 cron、推荐流 cron）
│   ├── configs/               # 配置文件
│   └── go.mod
│
├── .env                       # 环境变量（不提交到仓库）
├── .gitignore
└── README.md
```

---

## 功能清单与状态

| ID | 功能 | 优先级 | 状态 | 描述 |
|----|------|--------|------|------|
| F1 | 监控账号配置 | P0 | 待开发 | 手动添加/删除 Twitter 用户名到监控列表 |
| F2 | 定时拉取推文 | P0 | 待开发 | 按设定频率（5/10/15 分钟）通过 Twitter API 拉取指定账号新推文 |
| F3 | LLM 生成回复草稿 | P0 | 待开发 | 对新推文调用 Kimi/Claude 生成多份回复草稿，支持自定义 prompt |
| F4 | 草稿展示与一键复制 | P0 | 待开发 | 展示原推文 + 多份草稿，支持编辑、一键复制到剪贴板 |
| F5 | 生成记录与历史 | P1 | 待开发 | 存储已生成的草稿，支持历史查看与防重复 |
| F6 | 按账号配置回复策略 | P1 | 待开发 | 不同被监控账号可设置不同 prompt 模板 |
| F7 | 推荐流 5 分钟刷新 + 摘要 | P1 | 待开发 | 定时拉取推荐流，用 LLM 生成结构化摘要 |
| F8 | 机器自动发推 | P2 | 暂不实现 | MVP 不实现，用户手动复制粘贴 |

---

## 数据模型

### MonitoredAccount（被监控账号）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | ObjectID | 主键 |
| username | string | Twitter 用户名（不含 @） |
| display_name | string | 显示名称 |
| enabled | bool | 是否启用监控 |
| reply_prompt | string | 该账号专属的回复 prompt 模板（可选） |
| created_at | datetime | 创建时间 |

### Tweet（推文）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | ObjectID | 主键 |
| tweet_id | string | Twitter 推文 ID（用于去重） |
| author_username | string | 作者用户名 |
| author_display_name | string | 作者显示名 |
| content | string | 推文正文 |
| tweet_url | string | 推文链接 |
| published_at | datetime | 推文发布时间 |
| draft_generated | bool | 是否已生成草稿 |
| processed_at | datetime | 处理时间 |

### ReplyDraft（回复草稿）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | ObjectID | 主键 |
| tweet_id | string | 关联的推文 ID |
| original_content | string | 原推文内容快照 |
| draft_content | string | 生成的回复草稿 |
| model | string | 使用的 LLM 模型（kimi / claude） |
| prompt_used | string | 使用的 prompt 模板 |
| created_at | datetime | 生成时间 |

### FeedSummary（推荐流摘要）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | ObjectID | 主键 |
| fetched_at | datetime | 拉取时间 |
| tweet_snapshot | JSON | 本周期推文快照列表 |
| summary_content | string | LLM 生成的结构化摘要 |
| summary_style | string | 摘要风格（技术/资讯/观点） |
| created_at | datetime | 创建时间 |

---

## 用户流程

### 主流程：监控推文 → 生成草稿 → 手动发送

```
用户添加监控账号
       ↓
系统定时拉取推文（Twitter API, cron）
       ↓
对新推文调用 LLM 生成回复草稿（可多模型并行）
       ↓
用户查看原推文 + 草稿列表
       ↓
用户编辑草稿（可选）→ 一键复制
       ↓
用户手动打开 Twitter → 粘贴发送
       ↓
系统记录生成历史
```

### 副流程：推荐流摘要

```
系统每 5 分钟拉取推荐流
       ↓
将推文列表交给 LLM 生成结构化摘要
（热点话题、关键观点、值得关注的账号/推文）
       ↓
展示最新摘要，支持查看历史
```

---

## 后端 API 设计（规划）

### 监控账号

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/accounts | 获取所有监控账号列表 |
| POST | /api/accounts | 添加监控账号 |
| PUT | /api/accounts/:id | 更新账号配置（启用/禁用、prompt） |
| DELETE | /api/accounts/:id | 删除监控账号 |

### 推文

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/tweets | 获取推文列表（支持分页、筛选账号） |
| POST | /api/tweets/:id/generate-draft | 对指定推文生成回复草稿 |

### 草稿

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/drafts | 获取草稿列表（支持分页、按推文筛选） |
| PUT | /api/drafts/:id | 编辑草稿内容 |

### 推荐流摘要

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/feed-summaries | 获取摘要列表（支持分页） |
| GET | /api/feed-summaries/latest | 获取最新一条摘要 |

### 登录（Twitter / Google / 邮箱）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/auth/session | 获取当前 session 信息（需 X-Session-ID） |
| GET | /api/auth/twitter/url?callback_url= | 获取 Twitter 登录 URL |
| POST | /api/auth/twitter/callback | 用 code 换取 session |
| GET | /api/auth/twitter/following | 获取关注列表（需 X-Session-ID，仅 Twitter 登录） |
| POST | /api/auth/twitter/import | 批量导入关注到监控列表（需 X-Session-ID，仅 Twitter 登录） |
| GET | /api/auth/google/url?callback_url= | 获取 Google 登录 URL |
| POST | /api/auth/google/callback | 用 code 换取 session |
| POST | /api/auth/email/register | 邮箱注册 |
| POST | /api/auth/email/login | 邮箱登录 |

### 配置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/settings | 获取全局配置（轮询频率、默认 prompt） |
| PUT | /api/settings | 更新全局配置 |

---

## 环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| KIMI_API_KEY | 是 | Kimi（月之暗面）API Key，从 https://platform.moonshot.cn/ 获取 |
| CLAUDE_API_KEY | 否 | Claude API Key，用于多模型草稿生成 |
| TWITTER_BEARER_TOKEN | 否 | Twitter API Bearer Token，用于拉取推文（无则用 mock） |
| TWITTER_CLIENT_ID | 否 | Twitter OAuth 2.0 Client ID，Callback: /auth/callback/twitter |
| TWITTER_CLIENT_SECRET | 否 | Twitter OAuth 2.0 Client Secret |
| GOOGLE_CLIENT_ID | 否 | Google OAuth 2.0 Client ID，Redirect URI: /auth/callback/google |
| GOOGLE_CLIENT_SECRET | 否 | Google OAuth 2.0 Client Secret |
| MONGODB_URI | 是 | MongoDB 连接字符串 |
| POLL_INTERVAL_MINUTES | 否 | 推文拉取频率，默认 10 分钟 |
| FEED_POLL_INTERVAL_MINUTES | 否 | 推荐流拉取频率，默认 5 分钟 |

> 所有密钥写入 `.env` 文件，**禁止提交到代码仓库**。

---

## 启动方式

### 后端

```bash
cd backend
cp configs/config.example.yaml configs/config.yaml  # 填写配置
go run cmd/server/main.go
# 默认运行在 http://localhost:8080
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

1. **推文去重**: 以 `tweet_id` 为唯一键，拉取时跳过已存在的推文
2. **多模型并行**: 对同一推文可同时调用 Kimi 和 Claude 生成多份草稿供用户选择
3. **Prompt 模板**: 支持全局默认 prompt + 按被监控账号覆盖，模板中可用 `{{tweet_content}}`、`{{author}}` 等占位符
4. **定时任务**: 后端 `internal/job/` 中注册两个 cron——推文拉取和推荐流拉取
5. **推荐流降级**: 若无法获取个性化推荐流，降级为热门/探索页推文
6. **防重复生成**: 推文标记 `draft_generated` 后默认不重复生成，用户可手动触发重新生成

---

## 合规与风险

- 控制 Twitter API 请求频率，遵守速率限制
- 所有 API Key 通过环境变量管理，禁止硬编码
- MVP 不实现自动发推，规避自动化操控风险
