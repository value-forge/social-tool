#!/bin/bash

# 启动脚本 - 同时启动前端和后端

echo "🚀 启动 Social Tool..."

# 检查后端是否在运行
if ! curl -s "http://127.0.0.1:8000/api/health" > /dev/null 2>&1; then
    echo "📡 启动后端..."
    cd /Users/lijunxuniji/.openclaw/workspace/social-tool/backend
    /tmp/social-tool -conf configs/config.yaml &
    sleep 2
else
    echo "✅ 后端已在运行"
fi

# 启动前端
echo "🎨 启动前端..."
cd /Users/lijunxuniji/.openclaw/workspace/social-tool/frontend
npm run dev

# 清理后台进程
trap "kill $(pgrep -f social-tool) 2>/dev/null; exit" INT
wait