/**
 * AI 额度状态
 *
 * 免费用户每日有次数上限，会员不限。
 * 后端在响应头/429 里给出额度信息，这里统一缓存并驱动 UI。
 */
import { create } from 'zustand'
import { config, fetchWithFallback, getUserId } from '@/config'

export interface QuotaItem {
  feature: string
  label: string
  used: number
  limit: number
  unlimited: boolean
  remaining: number
}

interface UpsellInfo {
  feature: string
  label: string
  used: number
  limit: number
  message?: string
  hint?: string
}

interface QuotaState {
  isMember: boolean
  memberUntil: string
  items: QuotaItem[]
  loaded: boolean
  upsell: UpsellInfo | null
  refresh: () => Promise<void>
  remainingOf: (feature: string) => number
  /** 本地预估一次消耗（请求成功后调用，减少刷新次数） */
  consumeLocal: (feature: string) => void
  triggerUpsell: (info: UpsellInfo) => void
  closeUpsell: () => void
}

export const useQuotaStore = create<QuotaState>((set, get) => ({
  isMember: false,
  memberUntil: '',
  items: [],
  loaded: false,
  upsell: null,

  refresh: async () => {
    const uid = getUserId()
    if (!uid) return
    const path = `/api/user/${encodeURIComponent(uid)}/quota`
    try {
      const resp = await fetchWithFallback(path, config.aiGateway ? `${config.aiGateway}${path}` : path, {
        method: 'GET',
      })
      if (!resp.ok) return
      const d = await resp.json()
      set({
        isMember: !!d.isMember,
        memberUntil: d.memberUntil || '',
        items: d.items || [],
        loaded: true,
      })
    } catch {
      /* 静默失败，不打扰用户 */
    }
  },

  remainingOf: (feature) => {
    const it = get().items.find((x) => x.feature === feature)
    if (!it) return -1          // 未知功能视为不限
    return it.unlimited ? -1 : it.remaining
  },

  consumeLocal: (feature) => {
    const items = get().items.map((x) =>
      x.feature === feature && !x.unlimited
        ? { ...x, used: x.used + 1, remaining: Math.max(0, x.remaining - 1) }
        : x,
    )
    set({ items })
  },

  triggerUpsell: (info) => set({ upsell: info }),
  closeUpsell: () => set({ upsell: null }),
}))

// 全局监听 429（由 config.ts 的 fetchWithFallback 广播）
if (typeof window !== 'undefined') {
  window.addEventListener('va:quota-exceeded', ((e: CustomEvent) => {
    const d = e.detail || {}
    useQuotaStore.getState().triggerUpsell({
      feature: d.feature,
      label: d.label || 'AI 功能',
      used: d.used ?? 0,
      limit: d.limit ?? 0,
      message: d.message,
      hint: d.hint,
    })
    void useQuotaStore.getState().refresh()
  }) as EventListener)
}
