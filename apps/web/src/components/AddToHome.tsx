import { useEffect, useState } from 'react'
import { getPlatform, type PlatformInfo } from '@/services/platform'

/**
 * 添加到主屏幕指引
 *
 * 自动识别用户用的是微信 / 小米 / 华为 / QQ / UC / Chrome / Safari，
 * 给对应的步骤 —— 给错步骤等于没给。
 */
export function AddToHome({ compact = false }: { compact?: boolean }) {
  const [info, setInfo] = useState<PlatformInfo | null>(null)

  useEffect(() => {
    setInfo(getPlatform())
  }, [])

  if (!info) return null

  // 已经在主屏里跑起来了
  if (info.standalone) {
    return (
      <div className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2.5">
        ✅ 你已经把本站添加到主屏幕了，正在以 App 模式运行。
      </div>
    )
  }

  if (!info.isMobile) {
    return (
      <div className="text-xs text-ink-600 bg-ink-50 rounded-lg px-3 py-2.5 leading-relaxed">
        💻 你现在用的是电脑浏览器，不需要添加。用手机打开同一个网址，
        会有对应的「添加到主屏幕」指引。
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-ink-900 text-white">
          {info.name}
        </span>
        {!info.canAddToHome && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
            需要先跳浏览器
          </span>
        )}
      </div>

      {info.note && (
        <div className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 leading-relaxed">
          ⚠️ {info.note}
        </div>
      )}

      <ol className="space-y-1.5">
        {info.steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <span className="w-5 h-5 rounded-full bg-ink-900 text-white text-[11px] flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span className="text-ink-700 leading-relaxed">{s}</span>
          </li>
        ))}
      </ol>

      {!compact && info.isWechat && (
        <div className="text-xs text-ink-500 leading-relaxed border-t border-ink-100 pt-2.5">
          提示：第一次跳浏览器可能要等几秒。跳过去之后，建议把这个网址
          <strong> 收藏一下</strong>，以后直接从浏览器打开更顺畅。
        </div>
      )}

      {!compact && info.canAddToHome && (
        <div className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 leading-relaxed">
          💡 加到主屏幕后：打开更快（全屏无地址栏）、能收每日提醒、
          还能离线看已缓存的内容。
        </div>
      )}
    </div>
  )
}
