import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './app/App'
import './styles/index.css'

declare global {
  interface Window {
    /** index.html 的启动自愈脚本用它判断 React 是否已挂载 */
    __VA_BOOTED__?: boolean
  }
}

// React 挂载会清掉 #root 里的启动占位，index.html 的自愈脚本靠这个标志判断
window.__VA_BOOTED__ = true

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

/*
 * 全局错误上报
 *
 * 手机上的白屏很难排查（拿不到控制台），所以把 JS 运行时错误
 * 上报到服务端，出问题能查到是哪台设备、哪个浏览器、错在哪。
 */
function reportError(kind: string, message: string, extra = '') {
  try {
    const body = JSON.stringify({
      deviceId: (() => {
        try {
          return localStorage.getItem('va-device-id') || 'anonymous'
        } catch {
          return 'anonymous'
        }
      })(),
      event: 'js_error',
      detail: `${kind} | ${message} | ${extra}`.slice(0, 900),
    })
    const url = '/api/stats/track'
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
    } else {
      void fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    /* ignore */
  }
}

window.addEventListener('error', (e) => {
  if (e?.target && (e.target as any).tagName === 'SCRIPT') {
    const src = (e.target as any).src || ''
    reportError('script', '脚本加载失败', src.slice(-80))
    return
  }
  reportError(
    'runtime',
    String(e?.message || 'unknown'),
    `${e?.filename || ''}:${e?.lineno || 0} ${String(e?.error?.stack || '').slice(0, 300)}`,
  )
})

window.addEventListener('unhandledrejection', (e) => {
  reportError('promise', String((e as any)?.reason?.message || (e as any)?.reason || 'unknown'))
})
