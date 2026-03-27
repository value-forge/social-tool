# bird-cli 使用文档

## 简介

bird-cli 是一个命令行工具，通过浏览器 Cookie 获取 Twitter 数据，无需 API Key。

## 安装

```bash
npm install -g bird-cli
# 或使用 npx
npx bird-cli
```

## 认证配置

将以下内容保存到 `~/.config/bird/config.json5`：

```json5
{
  authToken: '66196d93a694a9c1f31ac34b08f11b764e7ddd62',
  ct0: '63ae439800bd83320eb70389942bc4a6d81a5c15bf93a031f1e11903556b1065bc423b6d8addc62092d203b8f2a3f6a42d73056216f478b110d9bf82c6f59d45c610059161640d7f1f9e1b1b91d6021d',
}
```

## 查询类命令列表

| 命令 | 说明 | 示例 |
|------|------|------|
| `whoami` | 检查当前登录账号 | `bird whoami` |
| `read <tweet-id-or-url>` | 读取单条推文详情 | `bird read 1901234567890123456 --json` |
| `user-tweets <handle>` | 获取指定用户的推文 | `bird user-tweets XXY177 --json` |
| `home` | 主页时间线 ("For You") | `bird home --json` |
| `search <query>` | 搜索推文 | `bird search "比特币" --json` |
| `mentions` | 获取提及当前用户的推文 | `bird mentions --json` |
| `replies <tweet-id-or-url>` | 获取某推文的回复列表 | `bird replies 1901234567890123456 --json` |
| `thread <tweet-id-or-url>` | 获取完整对话线程 | `bird thread 1901234567890123456 --json` |
| `bookmarks` | 获取书签推文 | `bird bookmarks --json` |
| `likes` | 获取点赞的推文 | `bird likes --json` |
| `following [username]` | 获取关注列表（自己或他人） | `bird following --json` |
| `followers [username]` | 获取粉丝列表（自己或他人） | `bird followers --json` |
| `lists` | 获取自己的 Twitter Lists | `bird lists --json` |
| `list-timeline <list-id>` | 获取某个 List 的推文 | `bird list-timeline 123456 --json` |
| `about <username>` | 获取用户账户信息 | `bird about XXY177 --json` |
| `news` / `trending` | 获取 AI 推荐的热门话题 | `bird trending --json` |
| `check` | 检查认证状态 | `bird check` |

### 快捷方式

```bash
# 读取单条推文（read 的简写）
bird 1901234567890123456 --json
bird https://x.com/user/status/1901234567890123456 --json
```

## 命令详解（含真实返回数据）

### 1. whoami - 检查当前登录账号

**命令：**
```bash
bird whoami
```

**返回结果：**
```
📍 CLI argument
🙋 @0xziheng (李子恒)
🪪 777044373028483073
⚙️ graphql
🔑 CLI argument
```

---

### 2. read - 读取单条推文详情

**命令：**
```bash
bird read 2036870207730573382 --json
```

**返回结果（JSON）：**
```json
{
  "id": "2036870207730573382",
  "text": "跟一个香港朋友聊天，也是一样的逻辑，他眼里，香港那么多七八十岁还在开出租车的老人，是真的热爱工作，才去开出租车上班，大陆的都是因为迫于生计，只能出去干活。。。😂。我是想不明白这个逻辑的。",
  "createdAt": "Wed Mar 25 18:17:55 +0000 2026",
  "replyCount": 5,
  "retweetCount": 2,
  "likeCount": 8,
  "conversationId": "2036870207730573382",
  "author": {
    "username": "XXY177",
    "name": "夏雪宜"
  },
  "authorId": "1691056639804399616"
}
```

---

### 3. user-tweets - 获取指定用户的推文

**命令：**
```bash
bird user-tweets BTCdayu --json
```

**返回结果（JSON）：**
```json
[
  {
    "id": "2036989156493320249",
    "text": "连续多次创业大成，联合创办OKX，早期投资泡泡玛特，13年就预言比特币会成为多国国家储备的神人\n\n《麦刚投资逻辑全集》\n\n无论是要创业、关注比特币或泡泡玛特，都可以收藏起来慢慢读。\n\nhttps://t.co/zrG7V8klVc",
    "createdAt": "Thu Mar 26 02:10:34 +0000 2026",
    "replyCount": 6,
    "retweetCount": 9,
    "likeCount": 29,
    "conversationId": "2036989156493320249",
    "author": {
      "username": "BTCdayu",
      "name": "大宇"
    },
    "authorId": "1403881130802225152"
  }
]
```

---

### 4. home - 主页时间线 (For You)

**命令：**
```bash
bird home --json
```

**返回结果（JSON）：**
```json
[
  {
    "id": "2036886860098941224",
    "text": "其实人过了30岁，基本就过了人生的3/2，哪怕你能活到80岁。30岁后时间就变得飞快，一天天一月月，基本都是每天重复，基本没什么变化，重复率很高，一年唰的一下又没了。然后脑海里也不太记得前几天的事，都是很久很久以前的事情。",
    "createdAt": "Wed Mar 25 19:24:05 +0000 2026",
    "replyCount": 9,
    "retweetCount": 2,
    "likeCount": 25,
    "conversationId": "2036886860098941224",
    "author": {
      "username": "XXY177",
      "name": "夏雪宜"
    },
    "authorId": "1691056639804399616"
  }
]
```

---

### 5. search - 搜索推文

**命令：**
```bash
bird search "比特币" -n 3 --json
```

**返回结果（JSON）：**
```json
[
  {
    "id": "2037011039754346896",
    "text": "过去30天内，Strategy买入4.5万枚比特币，而其他公司合计仅买入约1,000枚，较此前减少99%。感觉市场就剩mstr一个多头撑着了。。。 $BTC",
    "createdAt": "Thu Mar 26 03:37:32 +0000 2026",
    "replyCount": 0,
    "retweetCount": 0,
    "likeCount": 0,
    "conversationId": "2037011039754346896",
    "author": {
      "username": "houshanke001",
      "name": "后山客漫漫谈"
    },
    "authorId": "1466253305185595396"
  }
]
```

---

### 6. mentions - 获取提及当前用户的推文

**命令：**
```bash
bird mentions --json
```

**返回结果（JSON）：**
```json
[]
```

> 注：如果没有其他人 @ 你，返回空数组

---

### 7. replies - 获取某推文的回复列表

**命令：**
```bash
bird replies 2036870207730573382 --json
```

**返回结果（JSON）：**
```json
[
  {
    "id": "2036896769200841103",
    "text": "@XXY177 所以开出租=热爱生活",
    "createdAt": "Wed Mar 25 20:03:28 +0000 2026",
    "replyCount": 0,
    "retweetCount": 0,
    "likeCount": 0,
    "conversationId": "2036870207730573382",
    "inReplyToStatusId": "2036870207730573382",
    "author": {
      "username": "df66618",
      "name": "赛博理塘锐克狼 和成天下芙蓉王"
    },
    "authorId": "1729889800390688768"
  }
]
```

---

### 8. thread - 获取完整对话线程

**命令：**
```bash
bird thread 2036870207730573382 --json
```

**返回结果（JSON）：**
```json
[
  {
    "id": "2036870207730573382",
    "text": "跟一个香港朋友聊天，也是一样的逻辑，他眼里，香港那么多七八十岁还在开出租车的老人，是真的热爱工作，才去开出租车上班，大陆的都是因为迫于生计，只能出去干活。。。😂。我是想不明白这个逻辑的。",
    "createdAt": "Wed Mar 25 18:17:55 +0000 2026",
    "replyCount": 5,
    "retweetCount": 2,
    "likeCount": 8,
    "conversationId": "2036870207730573382",
    "author": {
      "username": "XXY177",
      "name": "夏雪宜"
    },
    "authorId": "1691056639804399616"
  },
  {
    "id": "2036871357531877721",
    "text": "@XXY177 香港油价全球第一香港打车贵的离谱…为什么香港政府还不出补贴的士更换成新能源车…🤣",
    "createdAt": "Wed Mar 25 18:22:29 +0000 2026",
    "replyCount": 0,
    "retweetCount": 0,
    "likeCount": 0,
    "conversationId": "2036870207730573382",
    "inReplyToStatusId": "2036870207730573382",
    "author": {
      "username": "SilverBullet818",
      "name": "SilverBullet 2.0"
    },
    "authorId": "1696619237702529024"
  }
]
```

---

### 9. bookmarks - 获取书签推文

**命令：**
```bash
bird bookmarks --json
```

**返回结果（JSON）：**
```json
[
  {
    "id": "2031005479548461162",
    "text": "https://t.co/X2gLVgVPXz",
    "createdAt": "Mon Mar 09 13:53:35 +0000 2026",
    "replyCount": 4,
    "retweetCount": 1,
    "likeCount": 19,
    "conversationId": "2031005479548461162",
    "author": {
      "username": "0xpeterlee",
      "name": "耐心Peter"
    },
    "authorId": "1717372691270053888"
  }
]
```

---

### 10. likes - 获取点赞的推文

**命令：**
```bash
bird likes --json
```

**返回结果（JSON）：**
```json
[
  {
    "id": "2036666639606038853",
    "text": "1、猝死加速四件套：高压状态+熬夜+咖啡+情绪激动\n\n2、睡不好是慢性自杀\n\n3、40岁后做一次胃肠镜，结直肠癌国人高发，发现就是晚期，几个月就挂掉。\n\n4、发现勃起问题小心血管\n\n5、胸闷、心悸、莫名疲劳，结合上面其他，别硬扛\n\n6、必备最简化补齐：鱼油、维D3+K2、辅酶Q10+PQQ、镁、锌（男）",
    "createdAt": "Wed Mar 25 04:49:00 +0000 2026",
    "replyCount": 114,
    "retweetCount": 195,
    "likeCount": 1260,
    "conversationId": "2036666639606038853",
    "author": {
      "username": "BTCdayu",
      "name": "大宇"
    },
    "authorId": "1403881130802225152"
  }
]
```

---

### 11. following - 获取关注列表

**命令：**
```bash
bird following --json
```

**返回结果（JSON）：**
```json
[
  {
    "id": "1691056639804399616",
    "username": "XXY177",
    "name": "夏雪宜",
    "description": "90后投资者、2013老韭菜｜BTC矿工、矿场主｜推崇：价值投资、巴菲特、段永平、芒格 ｜研究：美股、A股、加密、AI、人性、性…",
    "followersCount": 69951,
    "followingCount": 915,
    "isBlueVerified": true,
    "profileImageUrl": "https://pbs.twimg.com/profile_images/1999861750355955712/CmsGGVzQ_normal.jpg",
    "createdAt": "Mon Aug 14 11:58:33 +0000 2023"
  },
  {
    "id": "1403881130802225152",
    "username": "BTCdayu",
    "name": "大宇",
    "description": "每日精选要闻\nhttps://t.co/f4KWsBAJpr\n\n顶级大所永省最高等级手续费\n币安\nhttps://t.co/xqXcO18aeh\n欧易\nhttps://t.co/G6HwKCeW3g\n\n专注科技、投资、健康，财富自由\n全原创，无AI生成内容",
    "followersCount": 300316,
    "followingCount": 4298,
    "isBlueVerified": true,
    "profileImageUrl": "https://pbs.twimg.com/profile_images/1862767252400967680/mjEMe7kp_normal.jpg",
    "createdAt": "Sun Jun 13 01:05:28 +0000 2021"
  }
]
```

---

### 12. followers - 获取粉丝列表

**命令：**
```bash
bird followers --json
```

**返回结果（JSON）：**
```json
[
  {
    "id": "1142505181948628993",
    "username": "BTcdayuus",
    "name": "大宇……………",
    "description": "巾宝典 http://dayu.xyz $ 省手续费注册交易所 币安 http://bit.ly/dy789...",
    "followersCount": 2613,
    "followingCount": 2600,
    "isBlueVerified": false,
    "profileImageUrl": "https://pbs.twimg.com/profile_images/2005077701179420672/qXXpK_gT_normal.jpg",
    "createdAt": "Sat Jun 22 18:50:36 +0000 2019"
  },
  {
    "id": "777045102296379392",
    "username": "YongjieQiu",
    "name": "邱邱邱",
    "description": "",
    "followersCount": 2,
    "followingCount": 7,
    "isBlueVerified": false,
    "profileImageUrl": "https://pbs.twimg.com/profile_images/989118053001523200/Ipt1czX8_normal.jpg",
    "createdAt": "Sat Sep 17 07:22:44 +0000 2016"
  }
]
```

---

### 13. lists - 获取自己的 Twitter Lists

**命令：**
```bash
bird lists --json
```

**返回结果（JSON）：**
```json
[]
```

> 注：如果没有创建 Lists，返回空数组

---

### 14. list-timeline - 获取某个 List 的推文

**命令：**
```bash
bird list-timeline 123456 --json
```

> 注：需要先知道 List ID，可通过 `bird lists` 获取

---

### 15. about - 获取用户账户信息

**命令：**
```bash
bird about XXY177 --json
```

**返回结果（JSON）：**
```json
{
  "accountBasedIn": "East Asia",
  "source": "East Asia App Store",
  "createdCountryAccurate": true,
  "locationAccurate": false,
  "learnMoreUrl": "https://help.twitter.com/managing-your-account/about-twitter-verified-accounts"
}
```

---

### 16. trending - 获取 AI 推荐的热门话题

**命令：**
```bash
bird trending --json
```

**返回结果（JSON）：**
```json
[
  {
    "id": "twitter://trending/2036754534975095131",
    "headline": "Bitcoin Options Expiry Looms with $14 Billion at Max Pain $75,000",
    "category": "AI · News",
    "timeAgo": "17 hours ago",
    "postCount": 8100,
    "url": "twitter://trending/2036754534975095131"
  },
  {
    "id": "twitter://trending/2036815036249944235",
    "headline": "S&P 500 Surges Early Then Fades Amid Trader Buzz",
    "category": "AI · News",
    "timeAgo": "13 hours ago",
    "postCount": 5500,
    "url": "twitter://trending/2036815036249944235"
  },
  {
    "id": "twitter://trending/2036839823684850112",
    "headline": "Google DeepMind Launches Lyria 3 Pro for Full-Length AI Songs",
    "category": "AI · News",
    "timeAgo": "11 hours ago",
    "postCount": 2700,
    "url": "twitter://trending/2036839823684850112"
  }
]
```

---

### 17. check - 检查认证状态

**命令：**
```bash
bird check
```

**返回结果：**
```
ℹ️ Credential check
────────────────────────────────────────
✅ auth_token: 66196d93a6...
✅ ct0: 63ae439800...
📍 CLI argument

✅ Ready to tweet!
```

---

## 常用选项

| 选项 | 说明 | 示例 |
|------|------|------|
| `--json` | 输出 JSON 格式 | `bird home --json` |
| `-n <number>` | 限制返回数量 | `bird user-tweets XXY177 -n 10 --json` |
| `--auth-token <token>` | 指定 auth_token | 用于脚本中显式传入 |
| `--ct0 <token>` | 指定 ct0 | 用于脚本中显式传入 |
