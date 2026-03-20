import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // 明确 SPA，避免个别环境下根路径未回退到 index.html
  appType: 'spa',
  plugins: [react(), tailwindcss()],
  server: {
    // true = 同时监听 IPv4/IPv6，避免浏览器用 localhost 走到 ::1 而服务只绑 127.0.0.1 导致「无法访问」
    host: true,
    port: 5173,
    // 端口被占用时直接失败，避免静默改端口
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
