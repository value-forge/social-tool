#!/bin/bash

# 导入真实推文数据到 MongoDB

PROJECT_DIR="/Users/zuiyou/.openclaw/workspace/project/social-tool"
MONGO_CONTAINER="social-tool-mongo"

echo "📥 导入真实推文数据..."

# 创建临时 JS 文件转换数据
cat > /tmp/import_tweets.js << 'EOF'
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('/Users/zuiyou/.openclaw/workspace/project/social-tool/real_tweets.json', 'utf8'));

const tweets = data.tweets.map(t => ({
  _id: new ObjectId(),
  user_id: new ObjectId("65f1234567890123456789ab"), // 默认用户ID
  platform: "twitter",
  platform_post_id: t.id,
  author_username: t.author?.username || "unknown",
  author_display_name: t.author?.name || "Unknown",
  author_avatar_url: "",
  author_is_blue_verified: false,
  content: t.text,
  media_urls: t.media?.map(m => m.url) || [],
  post_url: `https://x.com/${t.author?.username}/status/${t.id}`,
  published_at: new Date(t.createdAt),
  like_count: t.likeCount || 0,
  repost_count: t.retweetCount || 0,
  reply_count: t.replyCount || 0,
  view_count: 0,
  is_reply: false,
  is_quote: !!t.quotedTweet,
  language: "zh",
  fetched_at: new Date(),
  created_at: new Date(),
  updated_at: new Date()
}));

// 输出为 MongoDB 导入格式
fs.writeFileSync('/tmp/tweets_import.json', tweets.map(t => JSON.stringify(t)).join('\n'));
console.log(`转换了 ${tweets.length} 条推文`);
EOF

# 使用 Node.js 转换数据（如果没有 Node.js，使用 Python）
if command -v node &> /dev/null; then
    node /tmp/import_tweets.js
else
    echo "使用 Python 转换数据..."
    python3 << 'PYEOF'
import json
from datetime import datetime
from bson import ObjectId

data = json.load(open('/Users/zuiyou/.openclaw/workspace/project/social-tool/real_tweets.json'))

tweets = []
for t in data['tweets']:
    tweet = {
        '_id': str(ObjectId()),
        'user_id': '65f1234567890123456789ab',
        'platform': 'twitter',
        'platform_post_id': t['id'],
        'author_username': t.get('author', {}).get('username', 'unknown'),
        'author_display_name': t.get('author', {}).get('name', 'Unknown'),
        'author_avatar_url': '',
        'author_is_blue_verified': False,
        'content': t['text'],
        'media_urls': [m['url'] for m in t.get('media', [])],
        'post_url': f"https://x.com/{t.get('author', {}).get('username', 'unknown')}/status/{t['id']}",
        'published_at': {'$date': datetime.strptime(t['createdAt'], '%a %b %d %H:%M:%S +0000 %Y').isoformat() + 'Z'},
        'like_count': t.get('likeCount', 0),
        'repost_count': t.get('retweetCount', 0),
        'reply_count': t.get('replyCount', 0),
        'view_count': 0,
        'is_reply': False,
        'is_quote': 'quotedTweet' in t,
        'language': 'zh',
        'fetched_at': {'$date': datetime.now().isoformat() + 'Z'},
        'created_at': {'$date': datetime.now().isoformat() + 'Z'},
        'updated_at': {'$date': datetime.now().isoformat() + 'Z'}
    }
    tweets.append(tweet)

with open('/tmp/tweets_import.json', 'w') as f:
    for t in tweets:
        f.write(json.dumps(t) + '\n')

print(f"转换了 {len(tweets)} 条推文")
PYEOF
fi

# 导入到 MongoDB
echo "导入到 MongoDB..."
docker exec -i $MONGO_CONTAINER mongosh social_tool --eval "db.tweets.deleteMany({})" > /dev/null 2>&1
docker exec -i $MONGO_CONTAINER mongoimport --db social_tool --collection tweets --file /dev/stdin < /tmp/tweets_import.json 2>&1 | tail -5

echo "✅ 数据导入完成"

# 显示导入的数据
docker exec $MONGO_CONTAINER mongosh social_tool --eval "db.tweets.countDocuments()" 2>&1 | tail -1
