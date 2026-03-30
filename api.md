# Social Tool API 文档

> 版本: v1.0  
> 更新时间: 2026-03-27  
> 时区: Asia/Shanghai (北京时间)

## API 总览

| 序号 | 方法 | 路径 | 功能说明 | 对应 Web 界面 |
|------|------|------|----------|---------------|
| **认证** |
| 1 | POST | `/auth/login` | 邮箱登录 | 登录页 |
| 2 | GET | `/user/me` | 获取当前用户信息 | 侧边栏用户卡片 |
| **监控账号管理** |
| 3 | GET | `/monitors` | 获取监控账号列表 | 监控中心 → 我的监控列表 |
| 4 | POST | `/monitors/add` | 添加监控账号 | 监控中心 → + 添加监控（弹窗） |
| 5 | DELETE | `/monitors/:id` | 删除监控账号 | 监控中心 → 删除按钮 |
| 6 | PUT | `/monitors/:id` | 更新监控设置 | 监控中心 → 编辑按钮 |
| **推文监控** |
| 7 | GET | `/tweets/feed` | 获取监控动态 | 监控中心 → 最新动态列表 |
| **钉钉推送** |
| 8 | PUT | `/settings/dingtalk` | 更新钉钉配置 | 设置页面 → 钉钉配置 |
| **数据统计** |
| 9 | GET | `/stats/overview` | 获取监控统计 | 监控中心 → 统计卡片 |
---

## 基础信息
| 项目 | 说明 |
|------|------|
| Base URL | `http://localhost:8080/api/v1` |
| Content-Type | `application/json` |
| 认证方式 | Bearer Token (JWT) |
| 请求头 | `Authorization: Bearer <token>` |

### 通用响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

### 通用错误码

| code | 说明 |
|------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 / Token 失效 |
| 404 | 资源不存在 |
| 409 | 冲突（如账号已在监控列表） |
| 500 | 服务器内部错误 |

### 通用分页

**请求参数（Query）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码，默认 1 |
| limit | int | 否 | 每页数量，默认 20，最大 100 |

**分页响应：**

```json
{
  "total": 46,
  "page": 1,
  "limit": 20,
  "list": []
}
```

---

## 1. 邮箱登录

简化登录：只校验邮箱格式，密码固定为 `88888888`。

```
POST /auth/login
```

**请求参数（Body）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 邮箱地址，需符合邮箱格式 |
| password | string | 是 | 密码，固定为 `88888888` |

**请求示例：**

```json
{
  "email": "peter@example.com",
  "password": "88888888"
}
```

**响应字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| token | string | JWT Token，后续请求放入 `Authorization: Bearer <token>` |
| expiresIn | int | Token 有效期（秒），默认 604800（7天） |
| user | object | 当前用户信息 |
| user.id | string | 用户ID |
| user.email | string | 邮箱 |
| user.name | string | 用户名 |

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 604800,
    "user": {
      "id": "69c5fc9fa511c779139c28aa",
      "email": "peter@example.com",
      "name": "Peter Lee"
    }
  }
}
```

**错误场景：**

| code | message | 说明 |
|------|---------|------|
| 400 | `invalid email format` | 邮箱格式不正确 |
| 401 | `invalid password` | 密码不是 88888888 |
| 404 | `user not found` | 该邮箱未注册（首次登录自动创建用户） |

**特殊逻辑：**
- 首次登录时，如果邮箱不存在，自动创建用户（`users` 表），name 取邮箱 @ 前缀
- 密码不入库，仅在接口层校验 `password === "88888888"`

---

## 2. 获取当前用户信息

返回当前登录用户的基本信息，用于侧边栏展示。

> 数据来源：`users`

```
GET /user/me
```

**请求头：** `Authorization: Bearer <token>`

**响应字段：**

| 字段 | 类型 | 来源表 | 说明 |
|------|------|--------|------|
| id | string | `users._id` | 用户ID |
| email | string | `users.email` | 邮箱 |
| name | string | `users.name` | 用户名 |
| avatar | string | `users.avatar` | 头像URL（可能为空） |
| twitter | object | `users.twitter` | 绑定的Twitter信息（可能为空） |
| twitter.username | string | `users.twitter.username` | Twitter用户名 |
| settings | object | `users.settings` | 设置 |
| settings.dingtalkWebhook | string | — | 钉钉Webhook（脱敏） |
| notifications | object | `users.notifications` | 通知配置 |
| notifications.dingtalk | boolean | — | 钉钉通知开关 |

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "69c5fc9fa511c779139c28aa",
    "email": "peter@example.com",
    "name": "Peter Lee",
    "avatar": "",
    "twitter": {
      "username": "0xpeterlee"
    },
    "settings": {
      "dingtalkWebhook": "https://oapi.dingtalk.com/robot/send?access_token=3aa3...4abc"
    },
    "notifications": {
      "dingtalk": true
    }
  }
}
```

**错误场景：**

| code | message | 说明 |
|------|---------|------|
| 401 | `unauthorized` | Token 无效或过期 |

---

## 3. 获取监控账号列表

获取当前用户监控的所有 Twitter 账号（需登录）。

> 数据来源：`user_monitored_accounts` JOIN `twitter_users`

```
GET /monitors
```

**查询参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码，默认 1 |
| limit | int | 否 | 每页数量，默认 20 |
| status | int | 否 | 筛选状态：`1`=监控中，`-1`=已暂停，不传=全部 |

**响应字段：**

| 字段 | 类型 | 来源表 | 说明 |
|------|------|--------|------|
| total | int | — | 总数量 |
| page | int | — | 当前页码 |
| limit | int | — | 每页数量 |
| list | array | — | 监控账号列表 |
| list[].id | string | `user_monitored_accounts._id` | 监控关系ID |
| list[].twitterUserId | string | `user_monitored_accounts.twitterUserId` | Twitter用户ID |
| list[].status | int | `user_monitored_accounts.status` | 状态：`1`=监控中，`-1`=已暂停 |
| list[].notes | string | `user_monitored_accounts.notes` | 备注 |
| list[].ct | string | `user_monitored_accounts.ct` | 创建时间 |
| list[].ut | string | `user_monitored_accounts.ut` | 更新时间 |
| list[].username | string | `twitter_users.username` | Twitter用户名 |
| list[].profile | object | `twitter_users.profile` | 用户资料 |
| list[].profile.displayName | string | `twitter_users.profile.displayName` | 显示名称 |
| list[].profile.avatar | string | `twitter_users.profile.avatar` | 头像URL |
| list[].profile.bio | string | `twitter_users.profile.bio` | 简介 |
| list[].profile.verified | boolean | `twitter_users.profile.verified` | 是否认证 |
| list[].profile.location | string | `twitter_users.profile.location` | 位置 |
| list[].profile.website | string | `twitter_users.profile.website` | 网站 |
| list[].stats | object | `twitter_users.stats` | 统计数据 |
| list[].stats.followersCount | int | `twitter_users.stats.followersCount` | 粉丝数 |
| list[].stats.followingCount | int | `twitter_users.stats.followingCount` | 关注数 |
| list[].stats.tweetsCount | int | `twitter_users.stats.tweetsCount` | 推文总数 |
| list[].stats.updatedAt | string | `twitter_users.stats.updatedAt` | 统计更新时间 |
| list[].monitorStatus | int | `twitter_users.monitorStatus` | 全局监控状态：`1`=监控中，`-1`=不在监控 |
| list[].lastFetchedAt | string | `twitter_users.lastFetchedAt` | 最后抓取时间 |

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 2,
    "page": 1,
    "limit": 20,
    "list": [
      {
        "id": "69c5fc9fa511c779139c28ee",
        "twitterUserId": "1691056639804399616",
        "status": 1,
        "notes": "重点关注技术观点",
        "ct": "2026-03-27T11:40:34+08:00",
        "ut": "2026-03-27T16:39:52+08:00",
        "username": "XXY177",
        "profile": {
          "displayName": "夏雪宜",
          "avatar": "https://pbs.twimg.com/profile_images/xxx.jpg",
          "bio": "BTC矿工 | 链上数据分析",
          "verified": false,
          "location": "Singapore",
          "website": ""
        },
        "stats": {
          "followersCount": 69951,
          "followingCount": 320,
          "tweetsCount": 8500,
          "updatedAt": "2026-03-27T16:39:52+08:00"
        },
        "monitorStatus": 1,
        "lastFetchedAt": "2026-03-27T16:39:48+08:00"
      },
      {
        "id": "69c60a1ba511c779139c28ef",
        "twitterUserId": "1403881130802225152",
        "status": 1,
        "notes": "",
        "ct": "2026-03-27T12:30:00+08:00",
        "ut": "2026-03-27T16:39:52+08:00",
        "username": "BTCdayu",
        "profile": {
          "displayName": "大宇",
          "avatar": "https://pbs.twimg.com/profile_images/xxx.jpg",
          "bio": "每日精选要闻 顶级大所永省最高等级手续费...",
          "verified": false,
          "location": "",
          "website": ""
        },
        "stats": {
          "followersCount": 300369,
          "followingCount": 4322,
          "tweetsCount": 20809,
          "updatedAt": "2026-03-27T16:39:52+08:00"
        },
        "monitorStatus": 1,
        "lastFetchedAt": "2026-03-27T16:39:52+08:00"
      }
    ]
  }
}
```

---

## 4. 添加监控账号

添加 Twitter 账号到当前用户的监控列表。

> 写入表：`user_monitored_accounts`（新建关系）+ `twitter_users`（不存在则创建，存在则 `refCount++`）

```
POST /monitors/add
```

**请求参数（Body）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | Twitter用户名（不含@） |
| notes | string | 否 | 备注，如"重点关注技术观点" |

**请求示例：**

```json
{
  "username": "VitalikButerin",
  "notes": "重点关注技术观点"
}
```

**响应字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 新创建的 `user_monitored_accounts._id` |
| twitterUserId | string | `twitter_users._id`（Twitter数字ID） |
| username | string | Twitter用户名 |
| status | int | 状态，固定为 `1`（监控中） |
| notes | string | 备注 |
| profile | object | Twitter用户资料（来自 `twitter_users.profile`） |
| profile.displayName | string | 显示名称 |
| profile.avatar | string | 头像URL |
| profile.bio | string | 简介 |
| profile.verified | boolean | 是否认证 |
| stats | object | Twitter用户统计（来自 `twitter_users.stats`） |
| stats.followersCount | int | 粉丝数 |
| stats.followingCount | int | 关注数 |
| stats.tweetsCount | int | 推文总数 |
| ct | string | 创建时间 |

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "69c5fc9fa511c779139c28ee",
    "twitterUserId": "295218901",
    "username": "VitalikButerin",
    "status": 1,
    "notes": "重点关注技术观点",
    "profile": {
      "displayName": "Vitalik.eth",
      "avatar": "https://pbs.twimg.com/profile_images/...jpg",
      "bio": "Ethereum 创始人",
      "verified": true
    },
    "stats": {
      "followersCount": 5200000,
      "followingCount": 1000,
      "tweetsCount": 15000
    },
    "ct": "2026-03-27T17:00:00+08:00"
  }
}
```

**错误场景：**

| code | message | 说明 |
|------|---------|------|
| 400 | `username is required` | 缺少用户名 |
| 404 | `twitter user not found` | Twitter用户不存在 |
| 409 | `already monitored` | 已在监控列表中 |

---

## 5. 删除监控账号

从当前用户的监控列表中移除一个账号。

> 写入表：删除 `user_monitored_accounts` 记录 + `twitter_users.refCount--`（refCount 降为 0 时标记 `monitorStatus: -1`）

```
DELETE /monitors/:id
```

**路径参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | `user_monitored_accounts._id` |

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

**错误场景：**

| code | message | 说明 |
|------|---------|------|
| 404 | `monitor not found` | 监控关系不存在 |

---

## 6. 更新监控设置

更新监控关系的配置（状态、备注）。

> 写入表：`user_monitored_accounts`

```
PUT /monitors/:id
```

**路径参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | `user_monitored_accounts._id` |

**请求参数（Body）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | int | 否 | `1`=恢复监控，`-1`=暂停监控 |
| notes | string | 否 | 更新备注 |

**请求示例：**

```json
{
  "status": -1,
  "notes": "暂时不关注了"
}
```

**响应字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | `user_monitored_accounts._id` |
| status | int | 更新后的状态 |
| notes | string | 更新后的备注 |
| ut | string | 更新时间 |

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "69c5fc9fa511c779139c28ee",
    "status": -1,
    "notes": "暂时不关注了",
    "ut": "2026-03-27T17:10:00+08:00"
  }
}
```

**错误场景：**

| code | message | 说明 |
|------|---------|------|
| 400 | `invalid status, must be 1 or -1` | status 值不合法 |
| 404 | `monitor not found` | 监控关系不存在 |

---

## 7. 获取监控动态（推文Feed）

获取当前用户所有监控账号的推文动态列表。

> 数据来源：`user_monitored_accounts`（当前用户的监控列表）→ `tweets`（匹配 twitterUserId）JOIN `twitter_users`（作者信息）

```
GET /tweets/feed
```

**查询参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码，默认 1 |
| limit | int | 否 | 每页数量，默认 20 |
| twitterUserId | string | 否 | 筛选特定 Twitter 用户，对应 `tweets.twitterUserId` |
| aiStatus | int | 否 | 筛选 AI 状态：`-1`=待分析，`1`=已完成，`-2`=分析失败 |
| type | string | 否 | 筛选推文类型：`original` / `reply` / `retweet` / `quote` |
| startDate | string | 否 | 起始日期，格式 `2026-03-27` |
| endDate | string | 否 | 结束日期，格式 `2026-03-27` |

**响应字段：**

| 字段 | 类型 | 来源表 | 说明 |
|------|------|--------|------|
| total | int | — | 总数量 |
| page | int | — | 当前页码 |
| limit | int | — | 每页数量 |
| list | array | — | 推文列表 |
| list[].id | string | `tweets._id` | MongoDB ObjectId |
| list[].tweetId | string | `tweets.tweetId` | Twitter 推文 ID |
| list[].twitterUserId | string | `tweets.twitterUserId` | 所属 Twitter 用户 ID |
| list[].twitterId | string | `tweets.twitterId` | Twitter 数字 ID |
| list[].url | string | `tweets.url` | 推文链接 |
| list[].text | string | `tweets.text` | 推文完整文本 |
| list[].type | string | `tweets.type` | 类型：`original` / `reply` / `retweet` / `quote` |
| list[].media | array | `tweets.media` | 媒体附件 |
| list[].media[].type | string | `tweets.media[].type` | 类型：`photo` / `video` / `gif` |
| list[].media[].url | string | `tweets.media[].url` | 媒体URL |
| list[].metrics | object | `tweets.metrics` | 互动数据 |
| list[].metrics.retweetCount | int | `tweets.metrics.retweetCount` | 转发数 |
| list[].metrics.replyCount | int | `tweets.metrics.replyCount` | 回复数 |
| list[].metrics.likeCount | int | `tweets.metrics.likeCount` | 点赞数 |
| list[].metrics.viewCount | int | `tweets.metrics.viewCount` | 浏览数 |
| list[].publishedAt | string | `tweets.publishedAt` | 发布时间（北京时间） |
| list[].fetchedAt | string | `tweets.fetchedAt` | 抓取时间 |
| list[].aiStatus | int | `tweets.aiStatus` | AI状态：`-1`=待分析，`1`=已完成，`-2`=分析失败 |
| list[].aiAnalyzedAt | string/null | `tweets.aiAnalyzedAt` | AI 分析完成时间 |
| list[].aiSuggestions | object/null | `tweets.aiSuggestions` | AI 分析结果（aiStatus=1 时有值） |
| list[].aiSuggestions.score | float | `tweets.aiSuggestions.score` | 评分（1-10） |
| list[].aiSuggestions.summary | string | `tweets.aiSuggestions.summary` | 内容摘要 |
| list[].aiSuggestions.suggestion | object | `tweets.aiSuggestions.suggestion` | 评论建议 |
| list[].aiSuggestions.suggestion.type | string | — | 建议类型：`data` / `insight` / `humor` / `story` |
| list[].aiSuggestions.suggestion.content | string | — | 建议内容 |
| list[].aiSuggestions.suggestion.reason | string | — | 推荐理由 |
| list[].author | object | `twitter_users` | 作者信息（JOIN） |
| list[].author.username | string | `twitter_users.username` | 用户名 |
| list[].author.profile | object | `twitter_users.profile` | 用户资料 |
| list[].author.profile.displayName | string | — | 显示名称 |
| list[].author.profile.avatar | string | — | 头像 |
| list[].author.stats | object | `twitter_users.stats` | 用户统计 |
| list[].author.stats.followersCount | int | — | 粉丝数 |

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 46,
    "page": 1,
    "limit": 20,
    "list": [
      {
        "id": "69c6a1b2f3e4d5c6b7a89012",
        "tweetId": "2037341664512205179",
        "twitterUserId": "1403881130802225152",
        "twitterId": "1403881130802225152",
        "url": "https://x.com/BTCdayu/status/2037341664512205179",
        "text": "把CLAUDE pro升级到了MAX！\n\n保留了GROK（反正和蓝V一起）\n保留了KIMI\n保留了GEMINI(一年才200U的关系）\n\n退订了GPT\n退订了MANUS\n退订了即梦\n退订了QQ音乐换汽水\n\n弃用了千问、元宝、Deepseek",
        "type": "original",
        "media": [],
        "metrics": {
          "retweetCount": 1,
          "replyCount": 23,
          "likeCount": 48,
          "viewCount": 12500
        },
        "publishedAt": "2026-03-27T19:52:13+08:00",
        "fetchedAt": "2026-03-27T16:34:29+08:00",
        "aiStatus": 1,
        "aiAnalyzedAt": "2026-03-27T16:34:47+08:00",
        "aiSuggestions": {
          "score": 7.5,
          "summary": "用户分享AI工具订阅调整，保留Claude/GROK/Kimi/Gemini，退订GPT/Manus等，弃用国产模型",
          "suggestion": {
            "type": "insight",
            "content": "Claude MAX确实值，代码能力吊打GPT，特别是长上下文理解。但GROK留着是为了推特数据吧？这波工具矩阵配得很聪明。",
            "reason": "认可作者选择的同时提出洞见，展示对AI工具的深度理解"
          }
        },
        "author": {
          "username": "BTCdayu",
          "profile": {
            "displayName": "大宇",
            "avatar": "https://pbs.twimg.com/profile_images/xxx.jpg"
          },
          "stats": {
            "followersCount": 300369
          }
        }
      },
      {
        "id": "69c6b2c3d4e5f6a7b8c90123",
        "tweetId": "2037448577992294560",
        "twitterUserId": "1691056639804399616",
        "twitterId": "1691056639804399616",
        "url": "https://x.com/XXY177/status/2037448577992294560",
        "text": "关于BTC矿工的一些思考...",
        "type": "original",
        "media": [
          {
            "type": "photo",
            "url": "https://pbs.twimg.com/media/...jpg"
          }
        ],
        "metrics": {
          "retweetCount": 0,
          "replyCount": 3,
          "likeCount": 12,
          "viewCount": 3200
        },
        "publishedAt": "2026-03-27T16:30:00+08:00",
        "fetchedAt": "2026-03-27T16:39:48+08:00",
        "aiStatus": 1,
        "aiAnalyzedAt": "2026-03-27T16:40:11+08:00",
        "aiSuggestions": {
          "score": 7.5,
          "summary": "BTC矿工运营经验分享",
          "suggestion": {
            "type": "data",
            "content": "从矿工角度分析很有价值，可以补充算力数据佐证观点",
            "reason": "专业视角容易引发关注"
          }
        },
        "author": {
          "username": "XXY177",
          "profile": {
            "displayName": "夏雪宜",
            "avatar": "https://pbs.twimg.com/profile_images/xxx.jpg"
          },
          "stats": {
            "followersCount": 69951
          }
        }
      }
    ]
  }
}
```

---

## 8. 更新钉钉配置

更新当前用户的钉钉推送设置。

> 写入表：`users.settings.dingtalkWebhook` + `users.notifications.dingtalk`

```
PUT /settings/dingtalk
```

**请求参数（Body）：**

| 字段 | 类型 | 必填 | 来源表字段 | 说明 |
|------|------|------|-----------|------|
| dingtalkWebhook | string | 否 | `users.settings.dingtalkWebhook` | 钉钉机器人 Webhook 地址 |
| dingtalk | boolean | 否 | `users.notifications.dingtalk` | 钉钉通知总开关 |

**请求示例：**

```json
{
  "dingtalkWebhook": "https://oapi.dingtalk.com/robot/send?access_token=3aa3d51d8e0d30f7...",
  "dingtalk": true
}
```

**响应字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| settings | object | 更新后的设置 |
| settings.dingtalkWebhook | string | Webhook 地址（脱敏显示） |
| notifications | object | 更新后的通知配置 |
| notifications.dingtalk | boolean | 钉钉通知开关 |
| ut | string | 更新时间 |

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "settings": {
      "dingtalkWebhook": "https://oapi.dingtalk.com/robot/send?access_token=3aa3...4abc"
    },
    "notifications": {
      "dingtalk": true
    },
    "ut": "2026-03-27T17:20:00+08:00"
  }
}
```

**错误场景：**

| code | message | 说明 |
|------|---------|------|
| 400 | `invalid webhook url` | Webhook 地址格式不正确 |

---

## 9. 获取监控统计

获取当前用户的监控总览统计数据。

> 数据来源：聚合 `user_monitored_accounts` + `tweets` + `twitter_users`

```
GET /stats/overview
```

**查询参数：** 无

**响应字段：**

| 字段 | 类型 | 说明 | 计算方式 |
|------|------|------|----------|
| monitors | object | 监控账号统计 | — |
| monitors.total | int | 监控账号总数 | `count(user_monitored_accounts where userId=当前用户)` |
| monitors.active | int | 监控中数量 | `count(... where status=1)` |
| monitors.paused | int | 已暂停数量 | `count(... where status=-1)` |
| tweets | object | 推文统计 | — |
| tweets.total | int | 推文总数 | `count(tweets where twitterUserId in 当前用户监控列表)` |
| tweets.today | int | 今日新推文 | `count(... where publishedAt >= 今日零点)` |
| tweets.pending | int | 待分析数量 | `count(... where aiStatus=-1)` |
| tweets.completed | int | 已分析数量 | `count(... where aiStatus=1)` |
| tweets.failed | int | 分析失败数量 | `count(... where aiStatus=-2)` |
| ai | object | AI 分析统计 | — |
| ai.avgScore | float | 平均评分 | `avg(tweets.aiSuggestions.score where aiStatus=1)` |
| ai.highScoreCount | int | 高分推文数（≥7分） | `count(... where aiSuggestions.score >= 7)` |
| dingtalk | object | 钉钉推送统计 | — |
| dingtalk.todaySent | int | 今日推送数 | 今日成功推送到钉钉的推文数量 |

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "monitors": {
      "total": 2,
      "active": 2,
      "paused": 0
    },
    "tweets": {
      "total": 46,
      "today": 37,
      "pending": 0,
      "completed": 46,
      "failed": 0
    },
    "ai": {
      "avgScore": 6.8,
      "highScoreCount": 12
    },
    "dingtalk": {
      "todaySent": 12
    }
  }
}
```

---

## 附录：数据库字段映射

### tweets.aiSuggestions.suggestion.type 枚举

| 值 | 说明 |
|------|------|
| data | 数据驱动型回复 |
| insight | 洞见/观点型回复 |
| humor | 轻松幽默型回复 |
| story | 故事叙事型回复 |
| professional | 专业分析型回复 |

### tweets.type 枚举

| 值 | 说明 |
|------|------|
| original | 原创推文 |
| reply | 回复 |
| retweet | 转推 |
| quote | 引用推文 |

### tweets.aiStatus 枚举

| 值 | 说明 |
|------|------|
| -1 | 待分析 |
| 1 | 已完成 |
| -2 | 分析失败 |

### user_monitored_accounts.status 枚举

| 值 | 说明 |
|------|------|
| 1 | 监控中 |
| -1 | 已暂停 |

### twitter_users.monitorStatus 枚举

| 值 | 说明 |
|------|------|
| 1 | 有用户在监控 |
| -1 | 无用户监控（refCount=0） |

### 时间格式

所有时间字段统一使用 ISO 8601 格式，北京时间（+08:00）：

```
2026-03-27T16:34:47+08:00
```

### 钉钉推送消息模板

```
📱 推特：@{username} | 🕐 {MM-DD HH:mm}

📝 {text}

💬 {aiSuggestions.summary}

⭐ 评分：{aiSuggestions.score}/10 | 💡 {aiSuggestions.suggestion.content}

👍 {metrics.likeCount} 💬 {metrics.replyCount} 🔄 {metrics.retweetCount}

🔗 {url}
```
