#!/bin/bash

# Social Tool 快速启动脚本（不依赖 Docker）
# 使用内存存储，适用于开发和测试

set -e

echo "🚀 启动 Social Tool 项目（开发模式）..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="/Users/zuiyou/.openclaw/workspace/project/social-tool"

# 1. 构建后端
echo "🔨 构建后端..."
cd "$PROJECT_DIR/backend"

if [ ! -f "$PROJECT_DIR/backend/server" ] || [ "$PROJECT_DIR/backend/server" -ot "$PROJECT_DIR/backend/cmd/server/main.go" ]; then
    echo "  正在编译..."
    go build -o server ./cmd/server 2>&1
    echo -e "${GREEN}✅ 后端编译完成${NC}"
else
    echo -e "${GREEN}✅ 后端已是最新${NC}"
fi

# 2. 启动后端
echo ""
echo "📡 启动后端服务..."

# 检查后端是否已在运行
if lsof -ti:8889 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  后端已在 8889 端口运行${NC}"
else
    cd "$PROJECT_DIR/backend"
    # 使用内存模式启动（设置环境变量）
    export MONGODB_URI="mongodb://localhost:27017"  # 如果没有 MongoDB，使用 mock
    ./server -conf configs/config.yaml &
    BACKEND_PID=$!
    echo -e "${GREEN}✅ 后端已启动 (PID: $BACKEND_PID)${NC}"
    
    # 等待后端就绪
    echo "⏳ 等待后端服务就绪..."
    for i in {1..10}; do
        if curl -s "http://127.0.0.1:8889/api/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 后端服务已就绪${NC}"
            break
        fi
        sleep 1
    done
fi

# 3. 启动前端
echo ""
echo "🎨 启动前端开发服务器..."
cd "$PROJECT_DIR/frontend"

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install 2>&1
fi

echo ""
echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}🎉 Social Tool 启动成功!${NC}"
echo -e "${GREEN}===============================================${NC}"
echo ""
echo "  📱 前端地址: http://127.0.0.1:5173"
echo "  📡 后端地址: http://127.0.0.1:8889"
echo "  🔍 API 文档: $PROJECT_DIR/backend/API_DESIGN_TWEET_DETAIL.md"
echo ""
echo -e "${YELLOW}按 Ctrl+C 停止所有服务${NC}"
echo ""

# 启动前端
npm run dev

# 清理
cleanup() {
    echo ""
    echo "🛑 正在停止服务..."
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        echo "  ✅ 后端已停止"
    fi
    echo -e "${GREEN}👋 所有服务已停止${NC}"
}
trap cleanup INT EXIT
