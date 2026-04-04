#!/usr/bin/env bash
# 在 macOS + Docker Desktop 上，宿主机 mongosh 有时会对映射端口认证失败；
# 此脚本始终在容器内执行 mongosh，与 backend/docker-compose.yml 默认账号一致。
set -euo pipefail
CONTAINER="${MONGO_CONTAINER:-social-tool-mongo}"
USER="${MONGO_INITDB_ROOT_USERNAME:-admin}"
PASS="${MONGO_INITDB_ROOT_PASSWORD:-password}"
DB="${1:-social_tool}"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "未找到运行中的容器: $CONTAINER" >&2
  echo "请在 social-tool/backend 目录执行: docker compose up -d" >&2
  exit 1
fi

exec docker exec -it "$CONTAINER" mongosh -u "$USER" -p "$PASS" --authenticationDatabase admin "$DB"
