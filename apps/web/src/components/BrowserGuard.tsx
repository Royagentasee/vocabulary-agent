import { useEffect, useState } from 'react'

/** 常见的 App 内置浏览器 UA 特征（这些 WebView 体验差 / 限制多，建议跳系统浏览器） */
const IN_APP_BROWSERS: { key: string; name: string }[] = [
  { key: 'micromessenger', name: '微信' },
  { key: 'qq/', name: 'QQ' },
  { key: 'weibo', name: '微博' },
  { key: 'alipayclient', name: '支付宝' },
  { key: 'dingtalk', name: '钉钉' },
  { key: 'toutiao', name: '今日头条' },
  { key: 'aweme', name: '抖音' },
  { key: 'baiduboxapp', name: '百度' },
  { key: 'xiaohongshu', name: '小红书' },
]

export function BrowserGuard() {
  const [inApp, setInApp] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase()
    const hit = IN_APP_BROWSERS.find((b) => ua.includes(b.key))
    if (hit) setInApp(hit.name)
  }, [])

  const handleCopy = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // 部分 WebView 不支持 clipboard API，降级用 textarea
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        setCopied(true)
      } catch {
        setCopied(false)
      }
      document.body.removeChild(ta)
    }
  }

  if (!inApp || dismissed) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center px-4 pt-16">
      {/* 指向右上角「···」的箭头 */}
      <div className="absolute top-2 right-4 text-white text-5xl leading-none animate-bounce">
        ↗
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl mt-10">
        <div className="text-center">
          <div className="text-4xl mb-3">🌐</div>
          <h2 className="text-lg font-semibold">请用浏览器打开</h2>
          <p className="text-sm text-ink-500 mt-2 leading-relaxed">
            当前是 <span className="font-medium text-ink-900">{inApp}</span> 内置浏览器，
            可能无法正常播放发音、保存学习进度。
          </p>
        </div>

        <div className="mt-5 bg-ink-50 rounded-xl p-4 text-sm text-ink-700 space-y-2">
          <div className="font-medium text-ink-900">操作步骤：</div>
          <div>1. 点击右上角 <span className="font-semibold">···</span> 按钮</div>
          <div>2. 选择「<span className="font-semibold">在浏览器打开</span>」</div>
          <div className="text-xs text-ink-500 pt-1">
            安卓会打开默认浏览器，iPhone 会打开 Safari
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <button onClick={handleCopy} className="va-btn va-btn--primary va-btn--md w-full">
            {copied ? '✓ 链接已复制，去浏览器粘贴' : '复制链接'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="w-full text-center text-xs text-ink-500 py-2"
          >
            仍要继续访问
          </button>
        </div>
      </div>
    </div>
  )
}
