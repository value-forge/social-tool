# Social Tool - MongoDB 数据库设计

## 核心设计

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│   users         │────▶│  user_monitored     │◀────│  twitter_users  │
│  (系统用户)      │     │  _accounts          │     │  (全局Twitter用户)│
└─────────────────┘     └─────────────────────┘     └─────────────────┘
                                                            │
                                                            ▼
                                                    ┌─────────────────┐
                                                    │     tweets      │
                                                    │  (推文+AI分类)   │
                                                    └─────────────────┘
```

**设计原则：**
- **twitter_users**: 全局唯一，被多个用户共享，避免重复存储
- **user_monitored_accounts**: 只存关注关系和显示配置
- **tweets**: 全局推文 + AI分类总结，不存每个用户的处理状态
- **users**: 全局通知配置，所有监控账号共用

---

## 1. users - 系统用户表

```javascript
{
  _id: ObjectId,
  
  email: "peter@example.com",
  name: "Peter Lee",
  avatar: "https://...",
  
  // Twitter 绑定（用于发推）
  twitter: {
    userId: "1717372691270053888",
    username: "0xpeterlee",
    accessToken: "encrypted...",
    refreshToken: "encrypted..."
  },
  
  // 设置
  settings: {
    dingtalkWebhook: "https://oapi.dingtalk.com/...",
  },
  
  // 全局通知设置（所有监控账号共用）
  notifications: {
    dingtalk: true,               // 钉钉总开关
  },

  ct: ISODate("2026-01-01T00:00:00Z"),
  ut: ISODate("2026-03-25T14:30:00Z")
}

// 索引
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ "twitter.userId": 1 }, { sparse: true })
```

---

## 2. twitter_users - 全局 Twitter 用户表

被多个系统用户共享，通过 `refCount` 管理生命周期。

```javascript
{
  _id: "295218901",              // Twitter 数字ID，唯一
  username: "VitalikButerin",    // 当前用户名
  
  profile: {
    displayName: "Vitalik.eth",
    avatar: "https://pbs.twimg.com/profile_images/...jpg",
    bio: "Ethereum 创始人",
    verified: true,
    location: "Singapore",
    website: "https://vitalik.ca"
  },
  
  stats: {
    followersCount: 5200000,
    followingCount: 1000,
    tweetsCount: 15000,
    updatedAt: ISODate("2026-03-25T14:30:00Z")
  },
  
  refCount: 5,                   // 引用计数：多少个用户在监控
  monitorStatus: 1,              // 1: 正常监控, -1:不在监控
  
  lastFetchedAt: ISODate("2026-03-25T14:30:00Z"),
  
  ct: ISODate("2026-01-01T00:00:00Z"),
  ut: ISODate("2026-03-25T14:30:00Z")
}

// 索引
db.twitter_users.createIndex({ twitterId: 1 }, { unique: true })
db.twitter_users.createIndex({ username: 1 })
db.twitter_users.createIndex({ refCount: 1, monitorStatus: 1 })
db.twitter_users.createIndex({ lastFetchedAt: 1 })
```

---

## 3. user_monitored_accounts - 用户关注关系表

只存个性化显示配置，通知配置在 users 表统一管理。

```javascript
{
  _id: ObjectId,
  
  userId: ObjectId("..."),
  twitterUserId: ObjectId("..."),
  
  status: 1,              // active:1, paused:-1
  notes: "重点关注技术观点",
  
  ct: ISODate("2026-01-01T00:00:00Z"),
  ut: ISODate("2026-03-25T14:30:00Z")
}

// 索引
db.user_monitored_accounts.createIndex({ userId: 1, twitterUserId: 1 }, { unique: true })
db.user_monitored_accounts.createIndex({ userId: 1, status: 1 })
db.user_monitored_accounts.createIndex({ twitterUserId: 1 })
```

---
## 4. tweets - 推文表
全局推文 + AI分类总结。

```javascript
{
  _id: ObjectId,
  
  twitterUserId: ObjectId("..."),
  
  tweetId: "1846987139428634856",
  url: "https://twitter.com/VitalikButerin/status/1846987139428634856",
  text: "关于 L2 扩容方案的一些新思考...",
  twitterId: "295218901",
  
  media: [{
    type: "photo",
    url: "https://pbs.twimg.com/media/...jpg"
  }],
  
  metrics: {
    retweetCount: 1200,
    replyCount: 300,
    likeCount: 5600,
    viewCount: 125000
  },
  
  type: "original",              // original, reply, retweet, quote
  
  publishedAt: ISODate("2026-03-25T06:23:34Z"),
  fetchedAt: ISODate("2026-03-25T06:23:45Z"),
  
  // ========== AI 分类和总结 ==========
  aiStatus: -1,             // -2：ai分析失败 -1：未完成ai分析 1:完成ai分析
  aiAnalyzedAt: ISODate("2026-03-25T06:23:45Z"),       // AI 分析完成时间
  aiSuggestions: {
    "score": 7.0,
    "summary": "主张生命在于静止而非运动，提出运动时间成本悖论（运动2小时换寿命2小时不划算），推崇躺平玩手机、水疗按摩的生活方式",
    "suggestion": {
      "type": "data",
      "content": "其实《英国运动医学杂志》2023年有个追踪10年的研究：每周150分钟中等强度运动（比如快走）的人，平均寿命延长3.4年，关键是这3.4年是'健康寿命'而非卧床时间。另外运动对BDNF脑源性神经营养因子的提升是躺平无法获得的，简单说就是防老年痴呆。不过同意博主一点：为了长寿而痛苦运动确实本末倒置，找到能坚持的'微运动'（比如散步、拉伸）可能比高强度训练更符合人性。",
      "reason": "该观点忽略了运动的复利效应和认知收益，仅用简单的时间换算存在逻辑漏洞。通过引入权威数据可温和纠正认知偏差，避免情绪化争论，建立专业可信度。"
    }
  }
  
  ct: ISODate("2026-03-25T06:23:45Z"),
  ut: ISODate("2026-04-25T06:23:45Z")
}

// 索引
db.tweets.createIndex({ tweetId: 1 }, { unique: true })
db.tweets.createIndex({ twitterUserId: 1, publishedAt: -1 })
db.tweets.createIndex({ publishedAt: -1 })
db.tweets.createIndex({ aiStatus: 1, publishedAt: -1 })  // 新增：按AI状态查询
db.tweets.createIndex({ category: 1, publishedAt: -1 })
db.tweets.createIndex({ isFrontRowOpportunity: 1, publishedAt: -1 })
db.tweets.createIndex({ topics: 1, publishedAt: -1 })
db.tweets.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```