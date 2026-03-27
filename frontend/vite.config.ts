import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** 开发 / preview 共用：把 /api 转到 Go 后端（使用 8889 端口） */
const apiProxy = {
  '/api': {
    target: 'http://127.0.0.1:8889',
    changeOrigin: true,
  },
} as const

export default defineConfig({
  // 明确 SPA，避免个别环境下根路径未回退到 index.html
  appType: 'spa',
  plugins: [react(), tailwindcss()],
  server: {
    // 0.0.0.0 = 监听所有 IPv4 接口，确保 localhost 和 IP 都能访问
    host: '0.0.0.0',
    port: 5173,
    // 端口被占用时直接失败，避免静默改端口
    strictPort: true,
    proxy: { ...apiProxy },
  },
  // npm run preview 默认没有 server.proxy，会导致 /api 404 或连错主机 →「无法连接服务器」
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: { ...apiProxy },
  },
})
