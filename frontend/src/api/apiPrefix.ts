/**
 * 开发时默认 `/api`，由 Vite 代理到后端（见 vite.config.ts）。
 * 若用 `vite preview`、或直接打开 dist、或前后端不同机，可设环境变量：
 *   VITE_API_ORIGIN=http://127.0.0.1:8000
 * （不要末尾斜杠；会请求 {ORIGIN}/api/...）
 */
export function getApiPrefix(): string {
  const o = import.meta.env.VITE_API_ORIGIN?.trim().replace(/\/$/, '')
  return o ? `${o}/api` : '/api'
}
