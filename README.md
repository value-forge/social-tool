# Social Ops Tool（社媒运营）

## 本地启动

```bash
# 1. 数据库
docker compose up -d

# 2. 后端（另开终端）
cd backend
# 在 configs/config.yaml 填好 twitter.client_id / client_secret
export GOPATH="$HOME/go" GOMODCACHE="$HOME/go/pkg/mod"
go run cmd/server/main.go -conf configs/config.yaml

# 3. 前端（另开终端）
cd frontend
npm install
npm run dev
```

在浏览器打开：**http://127.0.0.1:5173** 或 **http://localhost:5173**（开发服务已监听所有网卡，两种一般均可）。

若页面打不开：

- **先看终端**：`npm run dev` 是否成功打印 `Local: http://localhost:5173/`；若报 `Port 5173 is in use`，请先释放端口：`lsof -i :5173` 后结束占用进程。
- **后端起不来**：若 MongoDB / Redis 未启动，`go run` 会在 `ping mongodb` 或 `ping redis` 处失败，前端能打开但登录/接口会报错。请先启动本机或 Docker 里的数据库。

## 页面空白 / 无法访问 — 常见原因

1. **端口被占用**  
   已开启 `strictPort: true`：若 5173 被占用，`npm run dev` 会直接报错退出，而不会悄悄改到 5174。  
   处理：`lsof -i :5173` 找到进程并结束，或改掉占用 5173 的程序后再 `npm run dev`。

2. **打开了错误的地址**  
   开发服务器固定为 **127.0.0.1:5173**。若以前打开的是 `localhost:5173` 且本机解析到 IPv6，可能连到别的服务。请优先使用 **http://127.0.0.1:5173**。

3. **Twitter 回调地址不一致**  
   `backend/configs/config.yaml` 里的 `twitter.callback_url` 必须与 X Developer Portal 里登记的 **Callback URL** 完全一致（包括 `localhost` vs `127.0.0.1`）。  
   建议在 X 后台同时添加两条（最多可配多条）：
   - `http://127.0.0.1:5173/auth/twitter/callback`
   - `http://localhost:5173/auth/twitter/callback`  
   本地用哪个打开前端，`callback_url` 就配置成对应的那条。

4. **后端未启动**  
   登录页点 Twitter 会请求 `/api/auth/twitter/url`，需后端在 **http://127.0.0.1:8000** 运行；前端已通过 Vite 代理转发 `/api`。

## 关注列表拉取失败 — 常见原因

1. **X access_token 过期（最常见）**  
   用户态 token 通常约 **2 小时**过期。已支持用 **refresh_token** 自动刷新（授权范围需包含 **`offline.access`**，当前 OAuth 已配置）。  
   若仍提示刷新失败或没有 refresh_token：**退出登录后重新用 X 登录** 一次。

2. **X 开发者套餐 / 端点权限**  
   `GET /2/users/:id/following` 需要 **用户 OAuth 2.0**（非仅 App Bearer），且部分账号/项目可能对用户关注类接口有额外限制。若返回 **403**，响应里的 `title`/`detail` 会经后端原样透出，请对照 [X API 文档](https://developer.x.com/en/docs/twitter-api) 与控制台计费/权限。

3. **缺少 `follows.read` 授权**  
   若曾在未包含该 scope 时登录过，请 **重新授权登录**，确保同意包含读取关注。

4. **数据库无连接记录**  
   需成功完成一次 Twitter 回调登录，`platform_connections` 中应有 `twitter` 记录且含 `access_token`、`platform_user_id`。

## 产品说明

详见 [product.md](./product.md)。
