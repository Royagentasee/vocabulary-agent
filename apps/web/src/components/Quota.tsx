import { Link } from 'react-router-dom'
import { useQuotaStore } from '@/stores/quotaStore'

/**
 * 额度徽标：显示某功能今日剩余次数
 * 会员或不限次功能显示「不限」
 */
export function QuotaBadge({ feature, className = '' }: { feature: string; className?: string }) {
  const items = useQuotaStore((s) => s.items)
  const isMember = useQuotaStore((s) => s.isMember)
  const loaded = useQuotaStore((s) => s.loaded)
  const it = items.find((x) => x.feature === feature)

  if (!loaded || !it) return null

  if (isMember || it.unlimited) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ${className}`}
      >
        🏅 会员不限
      </span>
    )
  }

  const empty = it.remaining <= 0
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${
        empty ? 'bg-red-50 text-red-600' : 'bg-ink-50 text-ink-500'
      } ${className}`}
    >
      今日剩余 {it.remaining}/{it.limit}
    </span>
  )
}

/** 额度用尽时的升级引导（全局挂载一个） */
export function QuotaGate() {
  const upsell = useQuotaStore((s) => s.upsell)
  const close = useQuotaStore((s) => s.closeUpsell)
  if (!upsell) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-3"
      onClick={close}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl p-5 space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center space-y-2">
          <div className="text-4xl">🔒</div>
          <div className="text-lg font-semibold">今日额度已用完</div>
          <div className="text-sm text-ink-500">
            {upsell.label}
            {upsell.limit > 0 && (
              <span className="ml-1 tabular-nums">
                （{upsell.used}/{upsell.limit}）
              </span>
            )}
          </div>
        </div>

        <div className="bg-amber-50 rounded-xl p-3 space-y-1.5 text-xs text-amber-800">
          <div className="font-medium">🏅 会员可无限使用所有 AI 功能</div>
          <div className="text-amber-700">
            打卡学习就能赚积分，积分可免费兑换会员 —— 不用花钱。
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            to="/points"
            onClick={close}
            className="flex-1 text-center py-2.5 rounded-xl bg-ink-900 text-white text-sm font-medium active:opacity-80"
          >
            去兑换会员
          </Link>
          <button
            onClick={close}
            className="px-4 py-2.5 rounded-xl bg-ink-50 text-ink-600 text-sm active:bg-ink-100"
          >
            知道了
          </button>
        </div>

        <div className="text-[11px] text-ink-400 text-center">
          额度每天 0 点自动重置
        </div>
      </div>
    </div>
  )
}
