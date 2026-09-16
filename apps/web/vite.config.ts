import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const AI_GATEWAY = process.env.VITE_AI_GATEWAY ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',  // 监听所有网络接口（手机可访问）
    port: 5173,
    // CORS 配置：允许手机访问
    cors: {
      origin: true,
      credentials: true,
    },
    proxy: {
      // AI 网关：精确路径前缀，避免匹配错乱
      '/api/ai': {
        target: AI_GATEWAY,
        changeOrigin: true,
        secure: false,
      },
      // 词条查询
      '/api/words': {
        target: AI_GATEWAY,
        changeOrigin: true,
        secure: false,
      },
      // 错因分析
      '/api/analyze-mistake': {
        target: AI_GATEWAY,
        changeOrigin: true,
        secure: false,
      },
      // 口语陪练
      '/api/dialogue': {
        target: AI_GATEWAY,
        changeOrigin: true,
        secure: false,
      },
      // 学习服务
      '/api/learn': {
        target: process.env.LEARN_SERVICE_URL ?? 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // 让前端能拿到 AI 网关地址（运行时检查 proxy 是否生效）
  define: {
    __AI_GATEWAY__: JSON.stringify(AI_GATEWAY),
  },
})