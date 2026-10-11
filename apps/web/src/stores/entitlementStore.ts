import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  fetchEntitlement,
  isProRoute,
  redeemCode,
  type Entitlement,
} from '@/services/entitlement'

interface EntitlementState {
  ent: Entitlement | null
  loading: boolean
  lastFetch: number

  refresh: (force?: boolean) => Promise<void>
  /** 某个路由当前能否访问 */
  canAccess: (path: string) => boolean
  redeem: (code: string) => Promise<void>
  applyRemote: (remote: any) => void
}

export const useEntitlementStore = create<EntitlementState>()(
  persist(
    (set, get) => ({
      ent: null,
      loading: false,
      lastFetch: 0,

      refresh: async (force = false) => {
        // 5 分钟内不重复请求
        if (!force && Date.now() - get().lastFetch < 5 * 60_000) return
        set({ loading: true })
        try {
          const ent = await fetchEntitlement()
          set({ ent, lastFetch: Date.now() })
        } finally {
          set({ loading: false })
        }
      },

      canAccess: (path: string) => {
        if (!isProRoute(path)) return true
        const ent = get().ent
        // 还没拿到状态时不拦人（避免网络慢导致误挡）
        if (!ent) return true
        return !!(ent.isPro || ent.trialActive)
      },

      redeem: async (code: string) => {
        const ent = await redeemCode(code)
        set({ ent, lastFetch: Date.now() })
      },

      applyRemote: (remote: any) => {
        // 云端同步里带的状态优先级低于服务端实时查询，这里只做兜底
        if (remote?.entitlement) {
          set({ ent: { ...(get().ent as any), ...remote.entitlement } })
        }
      },
    }),
    {
      name: 'vocab-agent-entitlement',
      version: 1,
      // ent 由服务端决定，本地只缓存一份用于首屏快速判断
      partialize: (s) => ({ ent: s.ent, lastFetch: s.lastFetch }) as any,
    },
  ),
)
