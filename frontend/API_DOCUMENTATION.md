# Social Tool API 接口文档

> 本文档定义了社媒运营工具的所有后端 API 接口，供前端调用参考。
> 基础路径: `/api`
> 认证方式: `Authorization: Bearer <access_token>`

---

## 📋 目录

1. [认证接口 (Auth)](#1-认证接口-auth)
2. [平台连接接口 (Platform)](#2-平台连接接口-platform)
3. [关注列表接口 (Following)](#3-关注列表接口-following)
4. [监控账号接口 (Monitored Account)](#4-监控账号接口-monitored-account)
5. [推文/帖子接口 (Post/Tweet)](#5-推文帖子接口-posttweet)
6. [热点大盘接口 (Trending)](#6-热点大盘接口-trending)
7. [草稿接口 (Draft)](#7-草稿接口-draft)
8. [信息流摘要接口 (Feed Summary)](#8-信息流摘要接口-feed-summary)
9. [用户设置接口 (Settings)](#9-用户设置接口-settings)
10. [推送通道接口 (Notify Channel)](#10-推送通道接口-notify-channel)

---

## 1. 认证接口 (Auth)

### 1.1 获取 Twitter OAuth URL

```http
GET /auth/twitter/url
```

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| quick | string | 否 | 设为 '1' 时不强制重新登录 |

**响应：**
```typescript
{
  "url": string;        // Twitter OAuth 授权页面 URL
  "state": string;      // 防 CSRF 随机字符串
  "code_verifier": string;  // PKCE code_verifier，需存储用于回调
}
```

---

### 1.2 Twitter OAuth 回调

```http
POST /auth/twitter/callback
```

**请求体：**
```typescript
{
  "code": string;           // Twitter 返回的授权码
  "state": string;          // 之前生成的 state
  "code_verifier": string;  // PKCE code_verifier
}
```

**响应：**
```typescript
{
  "access_token": string;   // JWT Access Token
  "refresh_token": string;  // JWT Refresh Token
  "expires_in": number;     // Access Token 过期时间（秒）
  "user": {
    "id": string;
    "twitter_id": string;
    "twitter_username": string;
    "display_name": string;
    "avatar_url": string;
    "email"?: string;
  }
}
```

---

### 1.3 刷新 Token

```http
POST /auth/refresh
```

**请求体：**
```typescript
{
  "refresh_token": string;
}
```

**响应：** 同 1.2

---

### 1.4 获取当前用户信息

```http
GET /auth/me
```

**响应：**
```typescript
{
  "user": {
    "id": string;
    "twitter_id": string;
    "twitter_username": string;
    "display_name": string;
    "avatar_url": string;
    "email"?: string;
  }
}
```

---

### 1.5 登出

```http
POST /auth/logout
```

**响应：** `200 OK`

---

## 2. 平台连接接口 (Platform)

### 2.1 获取所有平台信息

```http
GET /platforms
```

**响应：**
```typescript
{
  "platforms": Array<{
    "type": string;           // "twitter" | "xiaohongshu" | "tiktok" | ...
    "display_name": string;   // 平台显示名称
    "icon_url": string;       // 平台图标 URL
    "is_available": boolean;  // 是否已上线可用
    "description": string;    // 平台描述
  }>
}
```

---

### 2.2 获取用户已连接的平台

```http
GET /platforms/connections
```

**响应：**
```typescript
{
  "connections": Array<{
    "id": string;
    "platform": string;
    "platform_user_id": string;
    "platform_username": string;
    "platform_display_name": string;
    "platform_avatar_url": string;
    "status": "active" | "expired" | "revoked" | "error";
    "token_expires_at": string;  // ISO 8601
    "auto_connected": boolean;   // 是否由登录自动连接
    "connected_at": string;
    "last_synced_at"?: string;
  }>
}
```

---

### 2.3 获取平台 OAuth URL

```http
GET /platforms/:platform/oauth-url
```

**路径参数：**
| 参数名 | 类型 | 说明 |
|--------|------|------|
| platform | string | 平台标识，如 "twitter" |

**响应：**
```typescript
{
  "url": string;
  "state": string;
}
```

---

### 2.4 平台 OAuth 回调

```http
POST /platforms/:platform/oauth-callback
```

**路径参数：** 同上

**请求体：**
```typescript
{
  "code": string;
  "state": string;
}
```

**响应：** `200 OK`

---

### 2.5 断开平台连接

```http
DELETE /platforms/:platform/connection
```

**响应：** `200 OK`

---

### 2.6 刷新平台 Token

```http
POST /platforms/:platform/refresh
```

**响应：** `200 OK`

---

### 2.7 获取平台连接状态

```http
GET /platforms/:platform/status
```

**响应：**
```typescript
{
  "status": "active" | "expired" | "revoked" | "error";
  "error_message"?: string;
}
```

---

### 2.8 登记平台等待通知

```http
POST /platforms/waitlist
```

**请求体：**
```typescript
{
  "platform": string;  // 等待的平台标识
}
```

---

## 3. 关注列表接口 (Following)

### 3.1 获取 Twitter 关注列表

```http
GET /following
```

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| cursor | string | 否 | 分页游标 |
| limit | number | 否 | 每页数量，默认 50 |

**响应：**
```typescript
{
  "accounts": Array<{
    "platform_user_id": string;
    "username": string;
    "display_name": string;
    "avatar_url": string;
    "bio": string;
    "follower_count": number;
    "following_count": number;
    "is_blue_verified": boolean;
  }>;
  "next_cursor": string | null;  // 下一页游标，null 表示没有更多
}
```

---

### 3.2 从关注列表批量加入监控

```http
POST /following/monitor
```

**请求体：**
```typescript
{
  "platform_user_ids": string[];  // 要监控的用户 ID 列表
}
```

**响应：**
```typescript
{
  "added": number;      // 成功添加数量
  "skipped": number;    // 已存在跳过数量
  "failed": number;     // 失败数量
  "accounts": Array<{
    "id": string;
    "username": string;
    "display_name": string;
    "enabled": boolean;
  }>;
}
```

---

### 3.3 使用 bird-cli 获取关注列表

```http
GET /bird/following
```

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| username | string | 是 | Twitter 用户名 |
| count | number | 否 | 获取数量，默认 100 |

**响应：**
```typescript
{
  "accounts": Array<{
    "platform_user_id": string;
    "username": string;
    "display_name": string;
    "avatar_url": string;
    "bio": string;
    "follower_count": number;
    "following_count": number;
    "is_blue_verified": boolean;
  }>;
  "source": string;      // "bird-cli"
  "username": string;    // 查询的用户名
  "fetched_at": string;  // ISO 8601
}
```

---

## 4. 监控账号接口 (Monitored Account)

### 4.1 获取监控账号列表

```http
GET /monitored-accounts
```

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| user_id | string | 是 | 用户 ID |
| platform | string | 否 | 平台筛选 |
| tag | string | 否 | 标签筛选 |
| enabled | boolean | 否 | 是否启用筛选 |
| page | number | 否 | 页码，默认 1 |
| page_size | number | 否 | 每页数量，默认 20 |

**响应：**
```typescript
{
  "accounts": Array<{
    "id": string;
    "platform_user_id": string;
    "platform": string;
    "username": string;
    "display_name": string;
    "avatar_url": string;
    "bio": string;
    "follower_count": number;
    "following_count": number;
    "is_blue_verified": boolean;
    "enabled": boolean;
    "reply_prompt"?: string;    // 专属回复 prompt
    "reply_tone"?: string;      // 回复风格
    "tags": string[];
    "created_at": string;
    "updated_at": string;
  }>;
  "total": number;
  "page": number;
  "page_size": number;
}
```

---

### 4.2 添加监控账号

```http
POST /monitored-accounts
```

**请求体：**
```typescript
{
  "user_id": string;
  "platform_user_id": string;
  "platform": string;          // 默认 "twitter"
  "username": string;
  "display_name": string;
  "avatar_url"?: string;
  "bio"?: string;
  "follower_count"?: number;
  "following_count"?: number;
  "is_blue_verified"?: boolean;
  "reply_prompt"?: string;
  "reply_tone"?: string;
  "tags"?: string[];
}
```

**响应：**
```typescript
{
  "id": string;
  "platform_user_id": string;
  "username": string;
  "display_name": string;
  "enabled": boolean;
  "created_at": string;
}
```

---

### 4.3 批量添加监控账号

```http
POST /monitored-accounts/batch
```

**请求体：**
```typescript
{
  "user_id": string;
  "accounts": Array<{
    "platform_user_id": string;
    "platform": string;
    "username": string;
    "display_name": string;
    "avatar_url"?: string;
    "bio"?: string;
    "follower_count"?: number;
    "following_count"?: number;
    "is_blue_verified"?: boolean;
  }>;
}
```

---

### 4.4 批量检查监控状态

```http
POST /monitored-accounts/check
```

**请求体：**
```typescript
{
  "user_id": string;
  "usernames": string[];  // 用户名列表
}
```

**响应：**
```typescript
{
  "status": {
    [username: string]: boolean;  // true 表示已监控
  }
}
```

---

### 4.5 获取监控账号详情

```http
GET /monitored-accounts/:id
```

**响应：** 同 4.1 的单条数据结构，额外包含：
```typescript
{
  "recent_posts": Array<{
    "id": string;
    "platform_post_id": string;
    "content": string;
    "published_at": string;
    "like_count": number;
    "reply_count": number;
    "repost_count": number;
  }>;  // 最近 5 条推文
}
```

---

### 4.6 更新监控账号配置

```http
PUT /monitored-accounts/:id
```

**请求体：**
```typescript
{
  "enabled"?: boolean;
  "reply_prompt"?: string;
  "reply_tone"?: string;
  "tags"?: string[];
}
```

---

### 4.7 删除监控账号

```http
DELETE /monitored-accounts
```

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| user_id | string | 是 | 用户 ID |
| username | string | 是 | 要删除的用户名 |

**响应：** `200 OK`

---

## 5. 推文/帖子接口 (Post/Tweet)

### 5.1 获取推文列表

```http
GET /tweets
```

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| user_id | string | 是 | 用户 ID |
| account_id | string | 否 | 指定监控账号 ID |
| platform | string | 否 | 平台筛选 |
| has_draft | boolean | 否 | 是否已生成草稿 |
| limit | number | 否 | 返回数量，默认 50 |
| offset | number | 否 | 偏移量 |

**响应：**
```typescript
{
  "tweets": Array<{
    "id": string;
    "platform_post_id": string;
    "platform": string;
    "account_id": string;
    "author_username": string;
    "author_display_name": string;
    "author_avatar_url": string;
    "author_is_blue_verified": boolean;
    "content": string;
    "media_urls": string[];
    "post_url": string;
    "published_at": string;
    "like_count": number;
    "repost_count": number;
    "reply_count": number;
    "view_count": number;
    "is_reply": boolean;
    "is_quote": boolean;
    "language": string;
    "content_summary"?: string;      // LLM 内容摘要
    "content_key_points"?: string[]; // 关键要点
    "draft_generated": boolean;
    "fetched_at": string;
  }>;
  "total": number;
}
```

---

### 5.2 刷新推文

```http
POST /tweets/refresh
```

**请求体：**
```typescript
{
  "user_id": string;
  "account_ids"?: string[];  // 指定账号 ID 列表，为空则刷新所有
}
```

**响应：**
```typescript
{
  "message": string;        // "已开始刷新推文"
  "queued_accounts": number;  // 加入队列的账号数量
}
```

---

### 5.3 获取推文详情

```http
GET /tweets/:id
```

**响应：** 同 5.1 单条数据结构，额外包含：
```typescript
{
  "top_comments": Array<{
    "id": string;
    "platform_comment_id": string;
    "author_username": string;
    "author_display_name": string;
    "author_avatar_url": string;
    "author_is_blue_verified": boolean;
    "content": string;
    "like_count": number;
    "published_at": string;
    "rank": number;  // 1-10
  }>;
  "comments_fetched_at"?: string;
  "drafts": Array<{
    "id": string;
    "content": string;
    "model": string;
    "status": string;
    "created_at": string;
  }>;
}
```

---

### 5.4 获取推文评论

```http
GET /tweets/comments
```

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| platform_post_id | string | 是 | 推文平台 ID |
| user_id | string | 是 | 用户 ID |
| limit | number | 否 | 返回数量，默认 10 |

**响应：**
```typescript
{
  "comments": Array<{
    "id": string;
    "platform_comment_id": string;
    "author_username": string;
    "author_display_name": string;
    "author_avatar_url": string;
    "author_is_blue_verified": boolean;
    "content": string;
    "like_count": number;
    "published_at": string;
    "is_reply": boolean;
    "reply_to_username"?: string;
  }>;
  "total": number;
}
```

---

### 5.5 手动刷新评论

```http
POST /tweets/:id/refresh-comments
```

**响应：** `200 OK`

---

### 5.6 生成内容摘要

```http
POST /tweets/:id/generate-summary
```

**请求体：**
```typescript
{
  "model"?: string;  // "kimi" | "claude"，默认系统配置
}
```

**响应：**
```typescript
{
  "summary": string;
  "key_points": string[];
  "model": string;
}
```

---

### 5.7 生成回复草稿

```http
POST /tweets/:id/generate-draft
```

**请求体：**
```typescript
{
  "user_id": string;
  "model": string;        // "kimi" | "claude"
  "prompt"?: string;      // 自定义 prompt
  "tone"?: string;        // 回复风格
}
```

**响应：**
```typescript
{
  "drafts": Array<{
    "id": string;
    "content": string;
    "model": string;
    "prompt_used": string;
    "tone": string;
    "created_at": string;
  }>;
}
```

---

### 5.8 批量生成草稿

```http
POST /tweets/batch-generate
```

**请求体：**
```typescript
{
  "user_id": string;
  "post_ids": string[];
  "model"?: string;
}
```

---

## 6. 热点大盘接口 (Trending)

### 6.1 获取热点列表

```http
GET /trending
```

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| user_id | string | 是 | 用户 ID |
| platform | string | 否 | 平台，默认 "twitter" |

**响应：**
```typescript
{
  "topics": Array<{
    "id": string;
    "platform": string;
    "topic_name": string;
    "topic_query": string;
    "topic_url": string;
    "tweet_volume": number | null;
    "occurrence_count": number;    // 累计出现次数
    "first_seen_at": string;
    "last_seen_at": string;
    "is_new": boolean;             // 本轮是否新出现
    "consecutive_count": number;   // 连续出现次数
    "peak_rank": number;           // 历史最高排名
    "current_rank": number;        // 当前排名
    "core_summary"?: string;       // LLM 热点核心分析
    "writing_suggestions": Array<{
      "angle": string;
      "title_suggestion": string;
      "description": string;
      "target_audience": string;
    }>;
    "analysis_generated_at"?: string;
    "status": "active" | "faded" | "new" | "returning";
  }>;
  "total": number;
  "updated_at": string;
}
```

---

### 6.2 刷新热点

```http
POST /trending/refresh
```

**请求体：**
```typescript
{
  "user_id": string;
}
```

**响应：**
```typescript
{
  "message": string;  // "已开始刷新热点"
}
```

---

### 6.3 获取热点详情

```http
GET /trending/:id
```

**响应：** 同 6.1 单条数据结构

---

### 6.4 基于热点生成推文草稿

```http
POST /trending/:id/generate-draft
```

**请求体：**
```typescript
{
  "user_id": string;
  "model": string;  // "kimi" | "claude"
}
```

**响应：**
```typescript
{
  "drafts": Array<{
    "id": string;
    "content": string;
    "model": string;
    "created_at": string;
  }>;
}
```

---

### 6.5 获取历史快照列表

```http
GET /trending/snapshots
```

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| platform | string | 否 | 平台筛选 |
| page | number | 否 | 页码 |
| page_size | number | 否 | 每页数量 |

**响应：**
```typescript
{
  "snapshots": Array<{
    "id": string;
    "platform": string;
    "fetched_at": string;
    "topic_count": number;
  }>;
  "total": number;
}
```

---

### 6.6 获取快照详情

```http
GET /trending/snapshots/:id
```

**响应：**
```typescript
{
  "id": string;
  "platform": string;
  "fetched_at": string;
  "topics": Array<{
    "topic_name": string;
    "rank": number;
    "tweet_volume": number | null;
    "is_new": boolean;
  }>;
}
```

---

## 7. 草稿接口 (Draft)

### 7.1 获取草稿列表

```http
GET /drafts
```

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| user_id | string | 是 | 用户 ID |
| platform | string | 否 | 平台筛选 |
| status | string | 否 | 状态筛选: "generated" | "edited" | "copied" | "sent" |
| post_id | string | 否 | 指定帖子 ID |
| page | number | 否 | 页码，默认 1 |
| page_size | number | 否 | 每页数量，默认 20 |

**响应：**
```typescript
{
  "drafts": Array<{
    "id": string;
    "post_id": string;
    "platform": string;
    "original_content": string;    // 原帖内容快照
    "draft_content": string;       // 草稿内容
    "model": string;               // LLM 模型
    "prompt_used": string;         // 使用的 prompt
    "tone": string;                // 回复风格
    "status": "generated" | "edited" | "copied" | "sent";
    "copied_at"?: string;
    "rating"?: number;             // 1-5 评分
    "created_at": string;
    "updated_at": string;
    // 关联的帖子信息
    "post": {
      "platform_post_id": string;
      "author_username": string;
      "content": string;
      "post_url": string;
    };
  }>;
  "total": number;
  "page": number;
  "page_size": number;
}
```

---

### 7.2 获取草稿详情

```http
GET /drafts/:id
```

**响应：** 同 7.1 单条数据结构

---

### 7.3 编辑草稿

```http
PUT /drafts/:id
```

**请求体：**
```typescript
{
  "draft_content": string;
}
```

**响应：**
```typescript
{
  "id": string;
  "draft_content": string;
  "status": "edited";
  "updated_at": string;
}
```

---

### 7.4 更新草稿状态

```http
PATCH /drafts/:id/status
```

**请求体：**
```typescript
{
  "status": "copied" | "sent";
}
```

**响应：** `200 OK`

---

### 7.5 评分草稿

```http
POST /drafts/:id/rate
```

**请求体：**
```typescript
{
  "rating": number;  // 1-5
}
```

**响应：** `200 OK`

---

## 8. 信息流摘要接口 (Feed Summary)

### 8.1 获取摘要列表

```http
GET /feed-summaries
```

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| user_id | string | 是 | 用户 ID |
| platform | string | 否 | 平台筛选 |
| page | number | 否 | 页码 |
| page_size | number | 否 | 每页数量 |

**响应：**
```typescript
{
  "summaries": Array<{
    "id": string;
    "platform": string;
    "fetched_at": string;
    "post_count": number;
    "summary_content": string;    // LLM 生成的结构化摘要
    "highlights": Array<{
      "type": "hot_topic" | "key_opinion" | "recommended_account";
      "title": string;
      "description": string;
      "related_post_ids": string[];
    }>;
    "created_at": string;
  }>;
  "total": number;
}
```

---

### 8.2 获取最新摘要

```http
GET /feed-summaries/latest
```

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| user_id | string | 是 | 用户 ID |
| platform | string | 否 | 平台筛选 |

**响应：** 同 8.1 单条数据结构

---

### 8.3 获取摘要详情

```http
GET /feed-summaries/:id
```

**响应：** 同 8.1 单条数据结构，额外包含：
```typescript
{
  "post_snapshots": Array<{
    "platform_post_id": string;
    "author_username": string;
    "content": string;
    "like_count": number;
  }>;
}
```

---

## 9. 用户设置接口 (Settings)

### 9.1 获取用户设置

```http
GET /settings
```

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| user_id | string | 是 | 用户 ID |

**响应：**
```typescript
{
  "user_id": string;
  // 轮询配置
  "poll_interval_minutes": number;       // 帖子拉取频率，默认 10
  "feed_poll_interval_minutes": number;  // 推荐流拉取频率，默认 5
  // LLM 配置
  "default_llm_model": string;           // 默认 LLM 模型
  "default_reply_prompt": string;        // 全局默认回复 prompt
  "default_reply_tone": string;          // 全局默认回复风格
  // 推送事件开关
  "notify_on_new_post": boolean;         // 新推文推送
  "notify_on_draft_ready": boolean;      // 草稿生成推送
  "notify_on_trending": boolean;         // 热点更新推送
  "notify_on_feed_summary": boolean;     // 信息流摘要推送
  // 其他
  "timezone": string;                    // 默认 "Asia/Shanghai"
  "language": string;                    // 默认 "zh-CN"
  "created_at": string;
  "updated_at": string;
}
```

---

### 9.2 更新用户设置

```http
PUT /settings
```

**请求体：** （字段同 9.1，全部可选）
```typescript
{
  "user_id": string;
  "poll_interval_minutes"?: number;
  "feed_poll_interval_minutes"?: number;
  "default_llm_model"?: string;
  "default_reply_prompt"?: string;
  "default_reply_tone"?: string;
  "notify_on_new_post"?: boolean;
  "notify_on_draft_ready"?: boolean;
  "notify_on_trending"?: boolean;
  "notify_on_feed_summary"?: boolean;
  "timezone"?: string;
  "language"?: string;
}
```

---

## 10. 推送通道接口 (Notify Channel)

### 10.1 获取可用通道类型

```http
GET /settings/notify-channels
```

**响应：**
```typescript
{
  "types": Array<{
    "type": string;           // "dingtalk" | "feishu" | "slack"
    "display_name": string;   // 显示名称
    "is_available": boolean;  // 是否已上线
    "config_fields": Array<{
      "name": string;
      "label": string;
      "type": "text" | "password" | "url";
      "required": boolean;
      "description": string;
    }>;
  }>;
}
```

---

### 10.2 添加推送通道

```http
POST /settings/notify-channels
```

**请求体：**
```typescript
{
  "user_id": string;
  "type": string;           // "dingtalk" | "feishu"
  "name": string;           // 用户自定义名称
  "webhook_url": string;    // Webhook 地址
  "secret"?: string;        // 签名密钥（钉钉加签用）
  "notify_events": string[]; // ["new_post", "draft_ready", "trending", "feed_summary"]
  "enabled": boolean;       // 是否启用
}
```

**响应：**
```typescript
{
  "id": string;
  "type": string;
  "name": string;
  "webhook_url": string;    // 脱敏显示
  "enabled": boolean;
  "notify_events": string[];
  "created_at": string;
}
```

---

### 10.3 获取用户推送通道列表

```http
GET /settings/notify-channels/list
```

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| user_id | string | 是 | 用户 ID |

**响应：**
```typescript
{
  "channels": Array<{
    "id": string;
    "type": string;
    "name": string;
    "webhook_url": string;    // 脱敏显示，如 "https://oapi.dingtalk.com/robot/send?access_token=***abcd"
    "enabled": boolean;
    "notify_events": string[];
    "created_at": string;
  }>;
}
```

---

### 10.4 更新推送通道

```http
PUT /settings/notify-channels/:id
```

**请求体：** （字段同 10.2，全部可选）
```typescript
{
  "name"?: string;
  "webhook_url"?: string;
  "secret"?: string;
  "notify_events"?: string[];
  "enabled"?: boolean;
}
```

---

### 10.5 删除推送通道

```http
DELETE /settings/notify-channels/:id
```

**响应：** `200 OK`

---

### 10.6 启用/禁用推送通道

```http
PATCH /settings/notify-channels/:id/toggle
```

**响应：**
```typescript
{
  "id": string;
  "enabled": boolean;  // 切换后的状态
}
```

---

### 10.7 发送测试消息

```http
POST /settings/notify-channels/:id/test
```

**响应：**
```typescript
{
  "success": boolean;
  "message": string;
}
```

---

### 10.8 获取推送记录

```http
GET /settings/notify-logs
```

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| user_id | string | 是 | 用户 ID |
| channel_type | string | 否 | 通道类型筛选 |
| status | string | 否 | 状态筛选: "success" | "failed" |
| page | number | 否 | 页码 |
| page_size | number | 否 | 每页数量 |

**响应：**
```typescript
{
  "logs": Array<{
    "id": string;
    "channel_type": string;
    "channel_name": string;
    "event_type": string;      // "new_post" | "draft_ready" | "trending" | "feed_summary"
    "payload": object;         // 推送内容快照
    "status": "success" | "failed";
    "error_message"?: string;
    "created_at": string;
  }>;
  "total": number;
}
```

---

## 附录 A: 错误码

| HTTP 状态码 | 错误码 | 说明 |
|------------|--------|------|
| 400 | INVALID_REQUEST | 请求参数错误 |
| 401 | UNAUTHORIZED | 未授权，Token 无效或过期 |
| 403 | FORBIDDEN | 权限不足 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | CONFLICT | 资源冲突（如已存在） |
| 429 | RATE_LIMITED | 请求过于频繁 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

**错误响应格式：**
```typescript
{
  "code": string;      // 错误码
  "message": string;   // 错误描述
  "details"?: object;  // 额外信息
}
```

---

## 附录 B: 数据类型定义

```typescript
// 平台类型
enum PlatformType {
  TWITTER = 'twitter',
  XIAOHONGSHU = 'xiaohongshu',
  TIKTOK = 'tiktok',
  DOUYIN = 'douyin',
  FARCASTER = 'farcaster',
  TELEGRAM = 'telegram',
  DISCORD = 'discord',
  INSTAGRAM = 'instagram',
}

// LLM 模型类型
enum LLMModel {
  KIMI = 'kimi',
  CLAUDE = 'claude',
}

// 推送事件类型
enum NotifyEventType {
  NEW_POST = 'new_post',
  DRAFT_READY = 'draft_ready',
  TRENDING = 'trending',
  FEED_SUMMARY = 'feed_summary',
}

// 草稿状态
enum DraftStatus {
  GENERATED = 'generated',
  EDITED = 'edited',
  COPIED = 'copied',
  SENT = 'sent',
}
```

---

## 附录 C: 前端 Mock 数据

所有接口在前端开发阶段使用以下 Mock 数据：

### Mock 用户
```typescript
const MOCK_USER = {
  id: "mock_user_001",
  twitter_id: "1234567890",
  twitter_username: "0xziheng",
  display_name: "Ziheng",
  avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=ziheng",
  email: "ziheng@example.com"
};
```

### Mock 监控账号
```typescript
const MOCK_MONITORED_ACCOUNTS = [
  {
    id: "acc_001",
    platform_user_id: "44196397",
    platform: "twitter",
    username: "elonmusk",
    display_name: "Elon Musk",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=elon",
    bio: "Mars & Cars",
    follower_count: 180000000,
    following_count: 500,
    is_blue_verified: true,
    enabled: true,
    tags: ["tech", "space"],
    created_at: "2026-03-15T10:00:00Z"
  },
  // ... 更多账号
];
```

### Mock 推文
```typescript
const MOCK_TWEETS = [
  {
    id: "tweet_001",
    platform_post_id: "1901234567890",
    author_username: "elonmusk",
    author_display_name: "Elon Musk",
    author_avatar_url: "...",
    author_is_blue_verified: true,
    content: "Exciting progress on Starship. Full stack test flight soon!",
    media_urls: [],
    post_url: "https://x.com/elonmusk/status/1901234567890",
    published_at: "2026-03-21T08:00:00Z",
    like_count: 125000,
    repost_count: 35000,
    reply_count: 8200,
    view_count: 1500000,
    content_summary: "SpaceX 星舰全栈测试飞行即将进行",
    content_key_points: ["星舰开发取得重大进展", "全栈测试飞行时间临近"],
    draft_generated: true
  }
];
```

### Mock 热点
```typescript
const MOCK_TRENDING = [
  {
    id: "trend_001",
    topic_name: "#SpaceX",
    tweet_volume: 125000,
    occurrence_count: 12,
    is_new: true,
    current_rank: 1,
    peak_rank: 1,
    core_summary: "SpaceX 星舰即将进行全栈测试飞行，引发全球航天爱好者热议",
    writing_suggestions: [
      {
        angle: "技术解读",
        title_suggestion: "星舰全栈测试的技术挑战与突破",
        description: "面向航天技术爱好者，解读试飞的技术难点",
        target_audience: "航天技术爱好者"
      }
    ]
  }
];
```

### Mock 推送通道
```typescript
const MOCK_NOTIFY_CHANNELS = [
  {
    id: "channel_001",
    type: "dingtalk",
    name: "我的运营群",
    webhook_url: "https://oapi.dingtalk.com/robot/send?access_token=***abcd",
    enabled: true,
    notify_events: ["new_post", "draft_ready", "trending"],
    created_at: "2026-03-16T10:00:00Z",
  },
];
```

### Mock 平台连接
```typescript
const MOCK_PLATFORM_CONNECTIONS = [
  {
    id: "conn_001",
    platform: "twitter",
    platform_user_id: "1234567890",
    platform_username: "0xziheng",
    platform_display_name: "Ziheng",
    platform_avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=ziheng",
    status: "active",
    token_expires_at: "2026-04-15T10:00:00Z",
    auto_connected: true,
    connected_at: "2026-03-15T10:00:00Z",
    last_synced_at: "2026-03-21T10:00:00Z",
  },
];
```

---

## 附录 D: 钉钉配置 Mock 接口

前端开发阶段使用以下 Mock 接口（位于 `src/api/mockDingTalk.ts`）：

### 获取钉钉配置列表
```typescript
GET /mock/dingtalk/channels
Response: { channels: NotifyChannel[] }
```

### 添加钉钉配置
```typescript
POST /mock/dingtalk/channels
Body: {
  name: string;
  webhook_url: string;
  secret?: string;
  notify_events: NotifyEventType[];
  enabled?: boolean;
}
Response: NotifyChannel
```

### 更新钉钉配置
```typescript
PUT /mock/dingtalk/channels/:id
Body: Partial<{
  name: string;
  webhook_url: string;
  secret: string;
  notify_events: NotifyEventType[];
  enabled: boolean;
}>
Response: NotifyChannel
```

### 删除钉钉配置
```typescript
DELETE /mock/dingtalk/channels/:id
Response: void
```

### 启用/禁用钉钉配置
```typescript
PATCH /mock/dingtalk/channels/:id/toggle
Response: { id: string; enabled: boolean }
```

### 发送测试消息
```typescript
POST /mock/dingtalk/channels/:id/test
Response: { success: boolean; message: string }
```

**Mock 数据示例：**
```typescript
// 默认包含 2 条配置
[
  {
    id: "ding_001",
    type: "dingtalk",
    name: "运营一群",
    webhook_url: "https://oapi.dingtalk.com/robot/send?access_token=***a1b2",
    enabled: true,
    notify_events: ["new_post", "draft_ready"],
    created_at: "2026-03-15T10:00:00Z",
  },
  {
    id: "ding_002",
    type: "dingtalk",
    name: "产品通知群",
    webhook_url: "https://oapi.dingtalk.com/robot/send?access_token=***c3d4",
    enabled: false,
    notify_events: ["trending", "feed_summary"],
    created_at: "2026-03-18T14:30:00Z",
  },
]
```

**特性：**
- 所有 Webhook URL 自动脱敏（如 `access_token=***a1b2`）
- 测试消息发送模拟 90% 成功率
- 支持配置名称唯一性校验
- 所有操作有 300-800ms 模拟延迟

---

**文档版本**: v1.1  
**最后更新**: 2026-03-21  
**作者**: Social Tool Team
