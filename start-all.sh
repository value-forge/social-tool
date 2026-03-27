#!/bin/bash

# Social Tool 启动脚本
# 同时启动 MongoDB、Redis、后端和前端

set -e

echo "🚀 启动 Social Tool 项目..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PROJECT_DIR="/Users/zuiyou/.openclaw/workspace/project/social-tool"

# 1. 启动 MongoDB 和 Redis
echo "📦 启动 MongoDB 和 Redis..."
cd "$PROJECT_DIR"

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker 未运行，请先启动 Docker${NC}"
    exit 1
fi

# 启动容器
docker-compose up -d

# 等待 MongoDB 就绪
echo "⏳ 等待 MongoDB 就绪..."
for i in {1..30}; do
    if docker exec social-tool-mongo mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ MongoDB 已就绪${NC}"
        break
    fi
    sleep 1
done

# 2. 构建后端
echo ""
echo "🔨 构建后端..."
cd "$PROJECT_DIR/backend"

# 检查是否已编译
if [ ! -f "$PROJECT_DIR/backend/server" ] || [ "$PROJECT_DIR/backend/server" -ot "$PROJECT_DIR/backend/cmd/server/main.go" ]; then
    echo "  正在编译..."
    go build -o server ./cmd/server
    echo -e "${GREEN}✅ 后端编译完成${NC}"
else
    echo -e "${GREEN}✅ 后端已是最新${NC}"
fi

# 3. 启动后端
echo ""
echo "📡 启动后端服务..."

# 检查后端是否已在运行
if lsof -ti:8889 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  后端已在 8889 端口运行，先停止旧进程...${NC}"
    kill $(lsof -ti:8889) 2>/dev/null || true
    sleep 1
fi

# 启动后端（后台运行）
cd "$PROJECT_DIR/backend"
./server -conf configs/config.yaml &
BACKEND_PID=$!
echo -e "${GREEN}✅ 后端已启动 (PID: $BACKEND_PID)${NC}"

# 等待后端就绪
echo "⏳ 等待后端服务就绪..."
for i in {1..30}; do
    if curl -s "http://127.0.0.1:8889/api/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 后端服务已就绪${NC}"
        break
    fi
    sleep 1
done

# 4. 启动前端
echo ""
echo "🎨 启动前端开发服务器..."
cd "$PROJECT_DIR/frontend"

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install
fi

echo ""
echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}🎉 Social Tool 启动成功!${NC}"
echo -e "${GREEN}===============================================${NC}"
echo ""
echo "  📱 前端地址: http://127.0.0.1:5173"
echo "  📡 后端地址: http://127.0.0.1:8889"
echo "  🗄️  MongoDB:  mongodb://localhost:27017"
echo "  💾 Redis:    localhost:6379"
echo ""
echo -e "${YELLOW}按 Ctrl+C 停止所有服务${NC}"
echo ""

# 启动前端（前台运行，这样可以看到日志）
npm run dev

# 清理函数（当脚本退出时执行）
cleanup() {
    echo ""
    echo "🛑 正在停止服务..."
    
    # 停止后端
    if kill $BACKEND_PID 2>/dev/null; then
        echo "  ✅ 后端已停止"
    fi
    
    # 停止前端（npm run dev 会在前台，Ctrl+C 会终止它）
    
    # 停止 Docker 容器
    cd "$PROJECT_DIR"
    docker-compose down
    echo "  ✅ MongoDB 和 Redis 已停止"
    
    echo -e "${GREEN}👋 所有服务已停止${NC}"
}

trap cleanup INT EXIT
