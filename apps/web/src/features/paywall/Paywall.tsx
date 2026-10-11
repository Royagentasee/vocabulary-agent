import { Link, useLocation } from 'react-router-dom'
import { useEntitlementStore } from '@/stores/entitlementStore'
import { ROUTE_LABEL, untilText } from '@/services/entitlement'
import { useEffect } from 'react'
import { trackEvent } from '@/services/stats'

/** 永久免费的部分（文案里反复强调，降低抵触） */
const FREE_THINGS = [
  '学习新单词',
  '书本阅读（103 本）',
  '复习 + 错题本',
  '学习路径 + 计划',
  '成就徽章',
]

/**
 * 会员门：包住需要付费的页面
 * 有权限就直接渲染内容，没权限显示付费墙（不是跳转，用户能看到这是啥）
 */
export function ProGate({ route, children }: { route: string; children: React.ReactNode }) {
  const canAccess = useEntitlementStore((s) => s.canAccess)
  const ent = useEntitlementStore((s) => s.ent)
  const refresh = useEntitlementStore((s) => s.refresh)

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (canAccess(route)) return <>{children}</>
  return <Paywall route={route} trialEnded={!!ent?.trialEnded} />
}

export function Paywall({ route, trialEnded = true }: { route: string; trialEnded?: boolean }) {
  const info = ROUTE_LABEL[route] || { name: '会员功能', emoji: '⭐', desc: '' }
  const ent = useEntitlementStore((s) => s.ent)

  useEffect(() => {
    trackEvent('paywall_view', route)
  }, [route])

  return (
    <div className="max-w-lg mx-auto space-y-4 py-2">
      <div className="va-card text-center space-y-3 py-8">
        <div className="text-5xl">{info.emoji}</div>
        <div className="space-y-1">
          <div className="text-lg font-semibold">{info.name}</div>
          <div className="text-sm text-ink-500">{info.desc}</div>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-amber-50 text-amber-800">
          🔒 这是会员功能
        </div>
      </div>

      <section className="va-card space-y-2.5">
        <div className="text-sm font-semibold text-green-700">✅ 这些永久免费</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {FREE_THINGS.map((t) => (
            <div key={t} className="flex items-center gap-2 text-sm text-ink-700">
              <span className="text-green-600">✓</span>
              {t}
            </div>
          ))}
        </div>
        <div className="text-xs text-ink-500 leading-relaxed pt-1 border-t border-ink-100">
          不付费也完全能用 —— 背单词和读书这两件事，我们永久免费。
        </div>
      </section>

      <section className="va-card space-y-3 border-ink-900">
        <div className="flex items-baseline justify-between">
          <div className="text-sm font-semibold">解锁全部功能</div>
          <div className="text-right">
            <span className="text-2xl font-semibold">¥{ent?.price ?? 9.9}</span>
            <span className="text-xs text-ink-500"> / 月</span>
          </div>
        </div>
        <div className="text-xs text-ink-500 leading-relaxed">
          听力 · 口语 · 对话 · 写作 · 分级阅读 · 拍照翻译 · 语法 · AI 教练
        </div>
        <Link
          to="/upgrade"
          onClick={() => trackEvent('paywall_click', route)}
          className="block text-center py-3 rounded-xl bg-ink-900 text-white text-sm font-medium active:opacity-80"
        >
          立即开通
        </Link>
        <Link to="/upgrade?code=1" className="block text-center text-xs text-ink-500 hover:text-ink-900">
          我已经有激活码了 →
        </Link>
      </section>

      {!trialEnded && (ent?.trialDaysLeft ?? 0) > 0 && (
        <div className="text-center text-xs text-ink-500">
          免费试用还剩 {ent?.trialDaysLeft} 天
        </div>
      )}
    </div>
  )
}

/** 顶部试用倒计时横幅 */
export function TrialBanner() {
  const ent = useEntitlementStore((s) => s.ent)
  const location = useLocation()

  // 已付费 / 没登录 / 在升级页 → 不显示
  if (!ent || ent.isPro || location.pathname === '/upgrade') return null
  if (!ent.trialActive) return null

  const left = ent.trialDaysLeft
  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2 flex items-center gap-2 text-xs">
        <span>🎁</span>
        <span className="flex-1">
          全功能免费试用中，还剩 <strong>{left}</strong> 天
          {ent.proUntil ? `（会员 ${untilText(ent.proUntil)}）` : ''}
        </span>
        <Link
          to="/upgrade"
          className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-900 text-white font-medium"
        >
          了解会员
        </Link>
      </div>
    </div>
  )
}

/** 试用已结束的提醒条 */
export function TrialEndedBanner() {
  const ent = useEntitlementStore((s) => s.ent)
  const location = useLocation()
  if (!ent || ent.isPro || ent.trialActive || location.pathname === '/upgrade') return null

  return (
    <div className="bg-ink-900 text-white">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2 flex items-center gap-2 text-xs">
        <span>👋</span>
        <span className="flex-1">
          试用结束了 —— 背单词和读书依然免费，其他功能需要会员
        </span>
        <Link to="/upgrade" className="shrink-0 px-2.5 py-1 rounded-lg bg-white text-ink-900 font-medium">
          ¥{ent.price}/月
        </Link>
      </div>
    </div>
  )
}
