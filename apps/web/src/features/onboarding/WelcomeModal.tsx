import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AddToHome } from '@/components/AddToHome'
import { getPlatform } from '@/services/platform'
import { trackEvent } from '@/services/stats'

const SEEN_KEY = 'va-welcome-seen'
const SNOOZE_KEY = 'va-addhome-snooze'

/** 是否该弹欢迎引导 */
function shouldShow(): boolean {
  try {
    // 已经装成 App 了就不用引导
    if (getPlatform().standalone) return false
    if (localStorage.getItem(SEEN_KEY)) return false
    return true
  } catch {
    return false
  }
}

/**
 * 首次访问引导
 *
 * 新用户第一次打开时弹一次，重点是「怎么装到手机上」——
 * 这一步不做，后面留存和推送都无从谈起。
 */
export function WelcomeModal() {
  const nav = useNavigate()
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)
  const [info, setInfo] = useState(() => getPlatform())

  useEffect(() => {
    // 等首屏渲染完再弹，别抢资源
    const t = window.setTimeout(() => {
      setInfo(getPlatform())
      if (shouldShow()) {
        setShow(true)
        trackEvent('welcome_show', getPlatform().platform)
      }
    }, 900)
    return () => window.clearTimeout(t)
  }, [])

  const close = (seen = true) => {
    try {
      if (seen) localStorage.setItem(SEEN_KEY, new Date().toISOString())
      // 没装到主屏的话，标记一下，隔几天再提醒一次
      if (!getPlatform().standalone) {
        localStorage.setItem(SNOOZE_KEY, String(Date.now()))
      }
    } catch {
      /* ignore */
    }
    setShow(false)
    trackEvent('welcome_close', String(step))
  }

  if (!show) return null

  const steps = [
    {
      emoji: '👋',
      title: '欢迎使用 Vocabulary Agent',
      body: (
        <div className="space-y-3">
          <p className="text-sm text-ink-700 leading-relaxed">
            一个<strong>免费的 AI 英语学习工具</strong> —— 词汇、听力、口语、
            阅读、写作、拍照翻译，还有 AI 教练帮你看数据。
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ['🗺️', '学习路径', '跟着走就行'],
              ['🧠', 'AI 教练', '看数据给建议'],
              ['📷', '拍照翻译', '拍书上英文'],
              ['🎧', '1000 篇听力', '托福雅思素材'],
            ].map(([e, t, d]) => (
              <div key={t} className="bg-ink-50 rounded-lg px-2.5 py-2">
                <div className="font-medium text-ink-800">
                  {e} {t}
                </div>
                <div className="text-ink-500 mt-0.5">{d}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-500">不用注册，也没有广告。</p>
        </div>
      ),
    },
    {
      emoji: '📲',
      title: '装到手机主屏幕',
      body: (
        <div className="space-y-3">
          <p className="text-sm text-ink-700 leading-relaxed">
            加完之后就像装了 App：<strong>全屏打开、有图标、能收每日提醒</strong>。
          </p>
          <AddToHome compact />
        </div>
      ),
    },
    {
      emoji: '🚀',
      title: '从「学习路径」开始',
      body: (
        <div className="space-y-3">
          <p className="text-sm text-ink-700 leading-relaxed">
            打开后<strong>直接点「路径」</strong>。里面是一条安排好的主线，
            每天点「继续」就行 —— 不用自己决定学什么。
          </p>
          <div className="bg-ink-50 rounded-xl p-3 space-y-1.5 text-xs">
            <div className="text-ink-500">你在别处做的事会自动算进路径：</div>
            <ul className="space-y-1 text-ink-700">
              <li>• 背了 5 个单词 → 学习任务 +5</li>
              <li>• 做了 1 篇听力 → 听力任务 +1</li>
              <li>• 和 AI 对话一轮 → 对话任务 +1</li>
            </ul>
            <div className="text-ink-500 pt-1">不用手动打卡。</div>
          </div>
          {info.isMobile && !info.standalone && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 leading-relaxed">
              💡 建议先完成上一步「添加到主屏幕」，体验会好很多。
            </p>
          )}
        </div>
      ),
    },
  ]

  const cur = steps[step]
  const last = step === steps.length - 1

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={() => close()}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-auto pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="sticky top-0 bg-white px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-3xl leading-none">{cur.emoji}</span>
            <div>
              <div className="font-semibold">{cur.title}</div>
              <div className="text-[11px] text-ink-400 mt-0.5">
                第 {step + 1} / {steps.length} 步
              </div>
            </div>
          </div>
          <button
            onClick={() => close()}
            className="text-ink-400 text-lg leading-none px-1 shrink-0"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {/* 内容 */}
        <div className="px-5 pb-4">{cur.body}</div>

        {/* 底部 */}
        <div className="sticky bottom-0 bg-white border-t border-ink-100 px-5 py-3.5 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 flex-1">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step ? 'w-6 bg-ink-900' : 'w-1.5 bg-ink-200'
                  }`}
                  aria-label={`第 ${i + 1} 步`}
                />
              ))}
            </div>
            {!last ? (
              <>
                <button
                  onClick={() => close()}
                  className="px-3 py-2 text-xs text-ink-500"
                >
                  跳过
                </button>
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="px-5 py-2 rounded-lg bg-ink-900 text-white text-sm font-medium active:opacity-80"
                >
                  下一步
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  close()
                  nav('/path')
                }}
                className="px-5 py-2 rounded-lg bg-ink-900 text-white text-sm font-medium active:opacity-80"
              >
                开始学习 →
              </button>
            )}
          </div>
          <button
            onClick={() => {
              close()
              nav('/guide')
            }}
            className="w-full text-[11px] text-ink-400 hover:text-ink-700"
          >
            查看完整新手指南
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * 添加到主屏幕提醒条
 *
 * 只在「手机 + 没装 + 上次提醒超过 3 天」时出现，避免烦人。
 */
export function AddToHomeBanner() {
  const nav = useNavigate()
  const [show, setShow] = useState(false)
  const [info] = useState(() => getPlatform())

  useEffect(() => {
    const t = window.setTimeout(() => {
      const p = getPlatform()
      if (!p.isMobile || p.standalone) return
      try {
        if (localStorage.getItem(SEEN_KEY)) return   // 还没看过欢迎弹窗就别急
        const snooze = Number(localStorage.getItem(SNOOZE_KEY) || 0)
        if (snooze && Date.now() - snooze < 3 * 86400_000) return
      } catch {
        return
      }
      setShow(true)
    }, 4000)
    return () => window.clearTimeout(t)
  }, [])

  if (!show || !info.isMobile || info.standalone) return null

  const dismiss = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now()))
    } catch {
      /* ignore */
    }
    setShow(false)
  }

  return (
    <div className="fixed bottom-16 md:bottom-4 inset-x-0 z-40 px-3 md:px-0 md:max-w-md md:mx-auto pointer-events-none">
      <div className="va-card shadow-lg flex items-center gap-3 pointer-events-auto !py-3">
        <span className="text-2xl shrink-0">📲</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">把本站装到主屏幕</div>
          <div className="text-[11px] text-ink-500 truncate">
            全屏打开 · 能收提醒 · 像 App 一样
          </div>
        </div>
        <button
          onClick={() => {
            dismiss()
            nav('/guide')
          }}
          className="px-3 py-2 rounded-lg bg-ink-900 text-white text-xs shrink-0"
        >
          怎么装
        </button>
        <button
          onClick={dismiss}
          className="text-ink-300 text-lg leading-none px-1 shrink-0"
          aria-label="关闭"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
