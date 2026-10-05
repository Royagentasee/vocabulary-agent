/**
 * 账号 / 云同步 状态
 *
 * - init()    ：确保有账号 → 拉云端数据合并 → 订阅本地变化自动上传
 * - pushNow() ：立即上传
 * - restore() ：用同步码恢复（换设备）
 */
import { create } from 'zustand'
import {
  ensureAccount,
  getLocalUser,
  mergeLearnState,
  pullState,
  pushState,
  regenerateSyncCode,
  restoreByCode,
  setLocalUser,
  UserProfile,
} from '@/services/account'
import { useLearnStore } from '@/stores/learnStore'

export type SyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'error'

/** 只同步这些字段（队列类字段是临时的，不存云端） */
function pickSyncData(s: any) {
  return {
    learnedWords: s.learnedWords || [],
    wrongWords: s.wrongWords || [],
    todayLearned: s.todayLearned || 0,
    todayReviewed: s.todayReviewed || 0,
    dailyGoal: s.dailyGoal ?? 20,
    currentWordbookId: s.currentWordbookId ?? null,
  }
}

interface AccountState {
  user: UserProfile | null
  status: SyncStatus
  lastSyncAt: number
  version: number
  started: boolean
  error: string
  init: () => Promise<void>
  pushNow: () => Promise<void>
  restore: (code: string) => Promise<void>
  regenerate: () => Promise<string>
}

let debounceTimer: number | undefined
let unsubscribed = false

export const useAccountStore = create<AccountState>((set, get) => ({
  user: getLocalUser(),
  status: 'idle',
  lastSyncAt: 0,
  version: 0,
  started: false,
  error: '',

  init: async () => {
    if (get().started) return
    set({ started: true, status: 'syncing', error: '' })

    try {
      const u = await ensureAccount()
      set({ user: u })

      // 1) 拉云端数据并与本地合并
      const { data, version } = await pullState(u.id)
      if (data && Object.keys(data).length) {
        const merged = mergeLearnState(pickSyncData(useLearnStore.getState()), data)
        useLearnStore.getState().applyRemote(merged)
      }

      // 2) 把合并结果推回云端
      const r = await pushState(u.id, pickSyncData(useLearnStore.getState()), version)
      set({ version: r.version, status: 'synced', lastSyncAt: Date.now() })

      // 3) 订阅本地变化，防抖上传
      if (!unsubscribed) {
        unsubscribed = true
        useLearnStore.subscribe(() => {
          const st = get()
          if (!st.user) return
          set({ status: 'pending' })
          window.clearTimeout(debounceTimer)
          debounceTimer = window.setTimeout(() => {
            void get().pushNow()
          }, 2500)
        })
      }
    } catch (e: any) {
      set({ status: 'error', error: e?.message || '同步失败' })
    }
  },

  pushNow: async () => {
    const { user, version } = get()
    if (!user) return
    set({ status: 'syncing' })
    try {
      const r = await pushState(user.id, pickSyncData(useLearnStore.getState()), version)
      set({ version: r.version, status: 'synced', lastSyncAt: Date.now(), error: '' })
    } catch (e: any) {
      set({ status: 'error', error: e?.message || '同步失败' })
    }
  },

  restore: async (code: string) => {
    set({ status: 'syncing', error: '' })
    try {
      const { user, data, version } = await restoreByCode(code)
      setLocalUser(user)
      set({ user, version })

      const local = pickSyncData(useLearnStore.getState())
      const merged = mergeLearnState(local, data || {})
      useLearnStore.getState().applyRemote(merged)

      // 合并后推回，保证两端一致
      const r = await pushState(user.id, pickSyncData(useLearnStore.getState()), version)
      set({ version: r.version, status: 'synced', lastSyncAt: Date.now() })
    } catch (e: any) {
      set({ status: 'error', error: e?.message || '恢复失败' })
      throw e
    }
  },

  regenerate: async () => {
    const { user } = get()
    if (!user) throw new Error('尚未登录')
    const code = await regenerateSyncCode(user.id)
    const next = { ...user, syncCode: code }
    setLocalUser(next)
    set({ user: next })
    return code
  },
}))
