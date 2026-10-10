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
  claimPendingPoints,
  regenerateSyncCode,
  restoreByCode,
  setLocalUser,
  UserProfile,
} from '@/services/account'
import { useLearnStore } from '@/stores/learnStore'
import { usePlanStore } from '@/stores/planStore'
import { usePointsStore } from '@/stores/pointsStore'

export type SyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'error'

/** 需要同步的字段（队列类字段是临时的，不存云端） */
export function pickSyncData() {
  const s = useLearnStore.getState()
  const p = usePlanStore.getState()
  const pt = usePointsStore.getState()
  return {
    learnedWords: s.learnedWords || [],
    wrongWords: s.wrongWords || [],
    todayLearned: s.todayLearned || 0,
    todayReviewed: s.todayReviewed || 0,
    dailyGoal: s.dailyGoal ?? 20,
    currentWordbookId: s.currentWordbookId ?? null,
    // 打卡与学习计划
    checkinDates: p.checkinDates || [],
    taskDone: p.taskDone || {},
    taskTargets: p.taskTargets || {},
    exam: { type: p.examType || '', date: p.examDate || '', target: p.targetScore || '' },
    // 积分与会员
    points: {
      balance: pt.balance || 0,
      totalEarned: pt.totalEarned || 0,
      totalSpent: pt.totalSpent || 0,
      dailyEarned: pt.dailyEarned || {},
      unlockedModules: pt.unlockedModules || [],
      memberUntil: pt.memberUntil || '',
      lastStreakBonusAt: pt.lastStreakBonusAt || 0,
      awardedTasks: pt.awardedTasks || [],
    },
  }
}

/** 把云端数据合并进本地几个 store */
export function applyRemoteToStores(remote: any) {
  if (!remote || typeof remote !== 'object') return
  const merged = mergeLearnState(pickSyncData(), remote)
  useLearnStore.getState().applyRemote(merged)
  usePlanStore.getState().applyRemote(remote)
  usePointsStore.getState().applyRemote(remote)
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
        applyRemoteToStores(data)
      }

      // 2) 领取服务端挂账的积分（邀请奖励等）
      try {
        const bonus = await claimPendingPoints(u.id)
        if (bonus > 0) {
          usePointsStore.getState().earn(bonus, `邀请奖励 +${bonus}`)
        }
      } catch {
        /* ignore */
      }

      // 2) 把合并结果推回云端
      const r = await pushState(u.id, pickSyncData(), version)
      set({ version: r.version, status: 'synced', lastSyncAt: Date.now() })

      // 3) 订阅本地变化，防抖上传（学习数据 + 打卡计划）
      if (!unsubscribed) {
        unsubscribed = true
        const schedule = () => {
          if (!get().user) return
          set({ status: 'pending' })
          window.clearTimeout(debounceTimer)
          debounceTimer = window.setTimeout(() => {
            void get().pushNow()
          }, 2500)
        }
        useLearnStore.subscribe(schedule)
        usePlanStore.subscribe(schedule)
        usePointsStore.subscribe(schedule)
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
      const r = await pushState(user.id, pickSyncData(), version)
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

      applyRemoteToStores(data || {})

      // 合并后推回，保证两端一致
      const r = await pushState(user.id, pickSyncData(), version)
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
