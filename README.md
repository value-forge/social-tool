# Social Ops Tool（社媒运营）

## 本地启动

```bash
# 1. 数据库
docker compose up -d

# 2. 后端（另开终端）
cd backend
# 在 configs/config.yaml 填好 twitter.client_id / client_secret
# 关注列表 / 推文接口仅走 bird-cli，必须安装 bird 并在 Chrome 登录 X，且显式开启：
export TWITTER_USE_BIRD=true
# 可选：无 OAuth 数字用户 id 时，用用户名经 bird about 解析（与 TWITTER_USERNAME 二选一逻辑见下）
# export TWITTER_USERNAME=your_handle
export GOPATH="$HOME/go" GOMODCACHE="$HOME/go/pkg/mod"
go run cmd/server/main.go -conf configs/config.yaml

# 3. 前端（另开终端）
cd frontend
npm install
npm run dev
```

在浏览器打开：**http://127.0.0.1:5173** 或 **http://localhost:5173**（开发服务已监听所有网卡，两种一般均可）。

**登录页提示「无法连接后端 / 网络无法到达 API」时**：前端请求会先发到同源的 `/api`，由 Vite **代理**到 `127.0.0.1:8000`。请同时满足：后端已启动、前端用 **`npm run dev`** 或 **`npm run preview`**（不要用资源管理器直接双击打开 `dist/index.html`）。若仍失败，在 `frontend` 建 `.env` 写入 `VITE_API_ORIGIN=http://127.0.0.1:8000` 后重新 `npm run dev`，让浏览器直连后端（需在可访问后端的网络环境下）。

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

4. **换 X 账号但授权页仍是旧账号**  
   在 X 设置里**解绑 Google** ≠ 退出本机浏览器里的 X 登录；OAuth 认的是 **x.com 的 Cookie**。请用登录页上的 **「在新标签页打开 x.com 退出」**，在新标签里确认登出后，再回到本站点「使用 X 账号继续」。  
   后端默认使用 **`x.com`** 授权地址，并带 **`prompt=login`** 与 **`max_age=0`**（若 X 报参数错误，可临时改用 `GET /api/auth/twitter/url?quick=1` 试授权，但换号仍须先清 Cookie / 无痕窗口）。  
   不需要换号、少输密码：`GET /api/auth/twitter/url?quick=1` 或「快捷授权」。

5. **后端未启动**  
   登录页点 Twitter 会请求 `/api/auth/twitter/url`，需后端在 **http://127.0.0.1:8000** 运行；前端已通过 Vite 代理转发 `/api`。

## 关注列表 / 推文 — 仅 bird-cli（无 Twitter API 兜底）

- 必须设置 **`TWITTER_USE_BIRD=true`**（或 `1`），否则接口会直接报错。
- 本机需安装 **`bird`**（`bird --version` 可用），且 **Chrome 默认 Profile 已在 x.com 登录**（与 bird 的 `--chrome-profile Default` 一致）。
- **`GET /api/twitter/following`**（需 JWT）：用 `bird following` 拉取。优先使用 OAuth 写入的 **`platform_user_id`** 作为 `bird following --user`；若无数字 id，则用 **`TWITTER_USERNAME`** 或库里的 **`platform_username`**，经 **`bird about`** 解析 id；若皆无，则不带 `--user`，表示拉取 **当前 Chrome 登录账号** 的关注列表。
- **`GET /api/twitter/posts`**：仅 `bird user-tweets`，查询参数 **`account_id`** 为目标用户名（不要带 `@`）。
- 公开调试接口 **`/api/bird/following`**、**`/api/bird/posts`** 同样需要 **`TWITTER_USE_BIRD=true`**。

### 关注列表仍失败时

1. 未设置 `TWITTER_USE_BIRD=true` 或未安装 `bird`。  
2. Chrome 未登录 X，或 bird 读不到 Cookie（可本机执行 `bird whoami` 自检）。  
3. `bird following` / `bird about` 报错：看后端日志里的 bird 输出。

## 产品说明

详见 [product.md](./product.md)。
