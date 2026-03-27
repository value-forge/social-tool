# Social Tool - 后端架构设计（重构版）

## 技术栈
| 层级 | 技术 | 说明 |
|------|------|------|
| **框架** | Go-Kratos | 微服务框架，支持 gRPC + HTTP |
| **数据库** | MongoDB Atlas | M0 免费版，存储推文、用户、监控关系 |
| **缓存** | 无 | 不需要，每次重启后5分钟轮询一次 |
| **消息队列** | Go Channel | 内建队列，只有一个 AI 处理队列 |
| **外部 API** | bird-cli | 通过 exec 调用，使用 auth_token + ct0 |
| **AI** | Kimi API | 推文分析、评论建议生成 |
| **通知** | DingTalk Webhook | 机器人推送 |
| **部署** | Railway / Render | Docker 容器化 |
---
## 系统架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              API Gateway                                 │
│                    (Kratos HTTP/gRPC, JWT Auth)                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│   User Service │          │ Monitor Svc   │          │  Tweet Service │
│   - 登录/注册   │          │ - 监控管理    │          │ - 推文查询     │
│   - 设置管理   │          │ - 通知规则    │          │ - AI 分析结果  │
└───────────────┘          └───────────────┘          └───────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Worker Services（Go Channel，只有一个队列）                   │
│                                                                          │
│   ┌─────────────┐        ┌─────────────────────────────────────┐       │
│   │   Fetcher   │───────▶│         AI Processor                │       │
│   │(5min轮询)   │aiQueue │   （AI分析 + 发送钉钉一体化）        │       │
│   └─────────────┘        └─────────────────────────────────────┘       │
│       │                             │                                   │
│       │  旧推文：UPDATE metrics      │  1. 调用 Kimi API                 │
│       │  新推文：INSERT (pending)   │  2. 更新 aiSuggestions            │
│       │       └── 入队 ─────────────│  3. 直接发送钉钉                   │
│       │                             │  4. 记录已通知                     │
│       └─────────────────────────────┘                                   │
│                                                                          │
│   队列说明（Go Channel）：                                                │
│   - aiQueue: chan string  // AI处理队列，缓冲100                         │
│   - 可启动多个 AI Processor 并发消费                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              Data Layer                                  │
│  MongoDB: users | twitter_users | user_monitored_accounts | tweets      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 核心流程

### 流程概览

```
Worker (Fetcher)              Worker (AI Processor)
    │                                  │
    ├── 5分钟定时触发                  │
    │                                  │
    ├── 获取监控列表                   │
    │                                  │
    ├── 遍历每个账号                   │
    │   ├── bird user-tweets           │
    │   ├── sleep 2-3秒                │
    │   └── 处理推文                   │
    │       ├── 已存在 → UPDATE metrics│
    │       └── 新推文 → INSERT        │
    │           └── aiQueue <─ tweetId │
    │                                  ├── 消费队列
    │                                  ├── 查推文内容
    │                                  ├── 调用 Kimi API
    │                                  ├── UPDATE aiSuggestions
    │                                  ├── 过滤检查
    │                                  ├── 发送钉钉
    │                                  └── UPDATE recentNotifiedTweets
    │
    └── 等待下一轮
```

### 1. 抓取流程（Fetcher）

**职责：** 快速抓取，新推文入队

```
Worker-Fetcher (5分钟定时触发)
    │
    ├── 1. 获取监控列表
    │   └── 查 user_monitored_accounts
    │       └── 获取所有 status=active 的 twitterUserId
    │
    ├── 2. 遍历每个监控账号
    │       │
    │       ├── 3. 抓取
    │       │   └── bird user-tweets <username> -n 20 --json
    │       │
    │       ├── 4. 账号间延迟 (sleep 2-3秒，防rate limit)
    │       │
    │       └── 5. 处理该账号的推文
    │               │
    │               ├── 查重 (tweets 表 by tweetId)
    │               │       │
    │               │       ├──【已存在】
    │               │       │   └── UPDATE tweets.metrics
    │               │       │       └── 更新点赞/转发/评论数
    │               │       │
    │               │       └──【不存在】
    │               │           │
    │               │           ├── 保存推文（待分析状态）
    │               │           │   └── INSERT tweets
    │               │           │       ├── text, metrics, publishedAt...
    │               │           │       ├── aiStatus: "pending"
    │               │           │       └── aiSuggestions: null
    │               │           │
    │               │           └── 发送到 AI 处理队列
    │               │               └── aiQueue <- tweetId
    │
    └── 6. 等待下一轮（5分钟后）
```

**关键点：**
- 抓取只判断新/旧，不调用 AI
- 新推文保存后标记 `aiStatus: "pending"`
- 立即发送到 aiQueue，不等待
- 抓取流程快速完成，不被阻塞

---

### 2. AI 处理流程（AI Processor）

**职责：** 消费队列，AI分析后直接发送钉钉

```
Worker-AI-Processor（可启动多个并发实例）
    │
    ├── 1. 消费队列
    │   └── 从 aiQueue 获取 tweetId
    │
    ├── 2. 查询推文
    │   └── 查 tweets 表获取 text 内容
    │
    ├── 3. 调用 Kimi API
    │   └── 生成 aiSuggestions
    │       ├── summary: 内容总结
    │       ├── score: 评论价值分 (1-10)
    │       ├── category: 分类
    │       └── suggestion: 评论建议
    │
    ├── 4. 更新推文
    │   └── UPDATE tweets
    │       ├── SET aiSuggestions = {...}
    │       ├── SET aiStatus = "completed"
    │       └── SET aiAnalyzedAt = now()
    │
    └── 5. 直接发送钉钉
        └── 调用 DingTalk Webhook
```

**关键点：**
- **AI分析后直接发钉钉**，无需过滤检查
- 可启动多个实例并发处理（如 3 个 AI Processor）
- 失败可重试，不影响 Fetcher

---

## 错误处理策略

| 场景 | 处理策略 |
|------|---------|
| bird-cli 失败 | 重试3次，间隔10s，跳过该账号继续下一个 |
| Kimi API 失败 | 重试3次，指数退避，标记 aiStatus="failed" |
| DingTalk 失败 | 重试5次，间隔5s，记录失败次数 |
| MongoDB 连接失败 | 指数退避重连，最多10次后退出 |
| Token 过期 | 检测到 401 错误，停止 Worker，发送告警 |

---

## 监控指标

| 指标名 | 说明 |
|--------|------|
| `fetcher_accounts_total` | 监控账号总数 |
| `fetcher_duration` | 抓取耗时 |
| `ai_queue_length` | AI队列当前长度 |
| `ai_processor_active` | AI Processor 活跃实例数 |
| `ai_analysis_duration` | AI分析耗时 |
| `dingtalk_sent_total` | 钉钉发送数 |
| `dingtalk_failed_total` | 钉钉发送失败数 |

---

## 部署配置

### 服务拆分

| 服务 | 说明 |
|------|------|
| `api` | HTTP API 服务 |
| `worker` | 后台 Worker（Fetcher + AI Processor） |

### 环境变量

| 变量名 | 说明 |
|--------|------|
| `MONGODB_URI` | MongoDB 连接字符串 | 
| `KIMI_API_KEY` | Kimi API Key |
| `BIRD_AUTH_TOKEN` | bird-cli auth_token |
| `BIRD_CT0` | bird-cli ct0 |
| `AI_PROCESSOR_COUNT` | AI Processor 并发数（默认3） |

---

## 关键改进点

1. **极简架构** - 只有4张表，无 Worker 状态表和频率限制表
2. **只有一个队列** - 简化架构，只有 aiQueue
3. **AI + 通知一体化** - AI分析完成后直接发钉钉，不再走额外队列
4. **抓取监控列表** - 遍历我监控的那些账号，逐个抓取
5. **Fetcher 不被阻塞** - 5分钟准时执行，不受 AI 延迟影响
6. **零中间件** - 只用 Go Channel，无 Redis/RabbitMQ 依赖
