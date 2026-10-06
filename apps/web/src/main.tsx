import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './app/App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

// 注册 Service Worker（PWA：可添加到主屏、断网也能打开）
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => {
      console.warn('[PWA] Service Worker 注册失败:', e)
    })
  })
}

// 记录是「添加到主屏」打开的，便于统计
if (window.matchMedia?.('(display-mode: standalone)').matches) {
  document.documentElement.dataset.displayMode = 'standalone'
}
