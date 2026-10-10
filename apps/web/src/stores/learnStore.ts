/**
 * 学习状态 Store
 *
 * 区分两个模块：
 * - 学习（learn）：每天学新词，学完加入"已学词池"
 * - 复习（review）：从已学词池里按 FSRS 到期时间抽取复习
 * - 错题本（wrongWords）：答错的词 + 错误次数
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createFSRS, Rating } from '@vocab-agent/sdk-fsrs'
import type { FSRSCardState, Word } from '@vocab-agent/types'
import { fetchWords, BOOK_TAG } from '@/services/words'

const scheduler = createFSRS()

interface LearnedWord {
  word: Word
  card: FSRSCardState
  learnedAt: string
}

interface WrongWord {
  word: Word
  wrongCount: number
  lastWrongAt: string
}

interface LearnState {
  currentWordbookId: string | null

  // 已学词池（含 FSRS 状态，用于复习）
  learnedWords: LearnedWord[]

  // 学习队列（新词）
  learnQueue: Word[]
  learnIndex: number

  // 复习队列（到期词）
  reviewQueue: LearnedWord[]
  reviewIndex: number

  // 统计
  todayLearned: number
  todayReviewed: number
  /** 上次活跃日期（YYYY-MM-DD），用于跨天自动重置今日计数 */
  lastActiveDate: string
  wrongWords: WrongWord[]

  // 设置
  dailyGoal: number  // 每日学习新词数量（用户可自定义）

  // actions
  setWordbook: (id: string) => void
  setDailyGoal: (n: number) => void
  startLearn: () => Promise<void>
  learnRate: (rating: Rating) => void
  nextLearn: () => void

  startReview: () => void
  reviewRate: (rating: Rating) => void
  nextReview: () => void

  // 错题本
  startReviewWrongWords: () => void  // 把错词装入 reviewQueue
  removeWrongWord: (wordId: string) => void
  clearWrongWords: () => void

  /** 合并云端数据（换设备恢复 / 启动时同步） */
  applyRemote: (remote: any) => void

  reset: () => void
}

function makeCard(): FSRSCardState {
  return scheduler.newCard()
}

/** 本地时区的 YYYY-MM-DD */
function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 判断 FSRS 卡片是否到期（该复习了） */
function isDue(card: FSRSCardState, now: Date = new Date()): boolean {
  if (!card.lastReview) return true
  const due = new Date(new Date(card.lastReview).getTime() + card.scheduledDays * 86400 * 1000)
  return due <= now
}

/** 答错时更新错词本（记录次数） */
function addWrongWord(wrongWords: WrongWord[], word: Word): WrongWord[] {
  const existing = wrongWords.find((w) => w.word.id === word.id)
  if (existing) {
    return wrongWords.map((w) =>
      w.word.id === word.id
        ? { ...w, wrongCount: w.wrongCount + 1, lastWrongAt: new Date().toISOString() }
        : w,
    )
  }
  return [
    ...wrongWords,
    { word, wrongCount: 1, lastWrongAt: new Date().toISOString() },
  ]
}

export const useLearnStore = create<LearnState>()(
  persist(
    (set, get) => ({
      currentWordbookId: null,
      learnedWords: [],
      learnQueue: [],
      learnIndex: 0,
      reviewQueue: [],
      reviewIndex: 0,
      todayLearned: 0,
      todayReviewed: 0,
      lastActiveDate: dayKey(),
      wrongWords: [],
      dailyGoal: 20,

      setWordbook: (id) => set({ currentWordbookId: id }),

      setDailyGoal: (n) => set({ dailyGoal: n }),

      // ============ 学习（新词） ============

      startLearn: async () => {
        const learned = get().learnedWords
        const learnedIds = learned.map((l) => l.word.id)
        // 选了词书就只从该词书抽词，否则全库随机（都排除已学的）
        const tag = BOOK_TAG[get().currentWordbookId || ''] || ''
        const words = await fetchWords(learnedIds, get().dailyGoal, tag)
        set({ learnQueue: words, learnIndex: 0 })
      },

      learnRate: (rating) => {
        // 跨天则先把今日计数清零
        const today = dayKey()
        if (get().lastActiveDate !== today) {
          set({ todayLearned: 0, todayReviewed: 0, lastActiveDate: today })
        }

        const { learnQueue, learnIndex, learnedWords, wrongWords } = get()
        const word = learnQueue[learnIndex]
        if (!word) return

        // 创建初始 FSRS 卡片并做一次评分
        const card = makeCard()
        const result = scheduler.review(card, rating)

        const learnedWord: LearnedWord = {
          word,
          card: result.card,
          learnedAt: new Date().toISOString(),
        }

        const newWrong =
          rating === Rating.Again ? addWrongWord(wrongWords, word) : wrongWords

        set({
          learnedWords: [...learnedWords, learnedWord],
          todayLearned: get().todayLearned + 1,
          wrongWords: newWrong,
        })
      },

      nextLearn: () => {
        set({ learnIndex: get().learnIndex + 1 })
      },

      // ============ 复习（旧词） ============

      startReview: () => {
        const { learnedWords } = get()
        // 筛选 FSRS 到期的词
        const due = learnedWords.filter((l) => isDue(l.card))
        // 如果到期词不足 10 个，随机抽已学词补足
        let queue = due
        if (queue.length < 10 && learnedWords.length > 0) {
          const rest = learnedWords.filter((l) => !isDue(l.card))
          const shuffled = [...rest].sort(() => Math.random() - 0.5)
          const need = Math.min(10 - queue.length, shuffled.length)
          queue = [...queue, ...shuffled.slice(0, need)]
        }
        set({ reviewQueue: queue, reviewIndex: 0 })
      },

      reviewRate: (rating) => {
        const today = dayKey()
        if (get().lastActiveDate !== today) {
          set({ todayLearned: 0, todayReviewed: 0, lastActiveDate: today })
        }

        const { reviewQueue, reviewIndex, learnedWords, wrongWords } = get()
        const current = reviewQueue[reviewIndex]
        if (!current) return

        // 用 FSRS 更新卡片状态
        const result = scheduler.review(current.card, rating)
        const updated: LearnedWord = { ...current, card: result.card }

        const newLearned = learnedWords.map((l) =>
          l.word.id === current.word.id ? updated : l,
        )

        // 答对（Good/Easy/Hard）：从错题本移除（如果该词在错题本）
        // 答错（Again）：加入或累加错误次数
        let newWrong = wrongWords
        if (rating === Rating.Again) {
          newWrong = addWrongWord(wrongWords, current.word)
        } else {
          newWrong = wrongWords.filter((w) => w.word.id !== current.word.id)
        }

        set({
          learnedWords: newLearned,
          todayReviewed: get().todayReviewed + 1,
          wrongWords: newWrong,
        })
      },

      nextReview: () => {
        set({ reviewIndex: get().reviewIndex + 1 })
      },

      // ============ 错题本 ============

      startReviewWrongWords: () => {
        const { wrongWords } = get()
        if (wrongWords.length === 0) return
        // 把每个错词包成 LearnedWord（fresh FSRS card）放入复习队列
        const now = new Date().toISOString()
        const queue: LearnedWord[] = wrongWords.map((w) => ({
          word: w.word,
          card: makeCard(),
          learnedAt: now,
        }))
        // 打乱顺序，避免按错误次数排序（每次重做顺序随机）
        const shuffled = [...queue].sort(() => Math.random() - 0.5)
        set({ reviewQueue: shuffled, reviewIndex: 0 })
      },

      removeWrongWord: (wordId) => {
        set({ wrongWords: get().wrongWords.filter((w) => w.word.id !== wordId) })
      },

      clearWrongWords: () => {
        set({ wrongWords: [] })
      },

      /** 合并云端数据：与本地取并集，避免任何一边被覆盖丢失 */
      applyRemote: (remote: any) => {
        if (!remote || typeof remote !== 'object') return
        const local = get()

        // 已学词：按 word.id 并集，同一词取 FSRS 复习时间更晚的那条
        const lm = new Map<string, LearnedWord>()
        for (const it of local.learnedWords || []) {
          if (it?.word?.id != null) lm.set(String(it.word.id), it)
        }
        for (const it of remote.learnedWords || []) {
          const id = it?.word?.id != null ? String(it.word.id) : ''
          if (!id) continue
          const prev = lm.get(id)
          const t = (x: LearnedWord) =>
            x?.card?.lastReview ? Date.parse(String(x.card.lastReview)) : 0
          if (!prev || t(it) >= t(prev)) lm.set(id, it)
        }

        // 错词本：错误次数取较大值
        const wm = new Map<string, WrongWord>()
        for (const it of local.wrongWords || []) {
          if (it?.word?.id != null) wm.set(String(it.word.id), it)
        }
        for (const it of remote.wrongWords || []) {
          const id = it?.word?.id != null ? String(it.word.id) : ''
          if (!id) continue
          const prev = wm.get(id)
          wm.set(
            id,
            prev
              ? { ...prev, wrongCount: Math.max(prev.wrongCount || 0, it.wrongCount || 0) }
              : it,
          )
        }

        set({
          learnedWords: [...lm.values()],
          wrongWords: [...wm.values()],
          todayLearned: Math.max(local.todayLearned || 0, remote.todayLearned || 0),
          todayReviewed: Math.max(local.todayReviewed || 0, remote.todayReviewed || 0),
          dailyGoal: remote.dailyGoal ?? local.dailyGoal,
        })
      },

      reset: () =>
        set({
          learnedWords: [],
          learnQueue: [],
          learnIndex: 0,
          reviewQueue: [],
          reviewIndex: 0,
          todayLearned: 0,
          todayReviewed: 0,
          wrongWords: [],
        }),
    }),
    {
      name: 'vocab-agent-state',
      version: 5,
      migrate: (persistedState: any, version: number) => {
        // 旧版本 → 重置，用新的 learn/review/wrongWords 结构
        if (version < 4) {
          return {
            currentWordbookId: null,
            learnedWords: [],
            learnQueue: [],
            learnIndex: 0,
            reviewQueue: [],
            reviewIndex: 0,
            todayLearned: 0,
            todayReviewed: 0,
            wrongWords: [],
            dailyGoal: 20,
          }
        }
        // v4 → v5：补 dailyGoal 默认值
        if (version < 5) {
          return { ...persistedState, dailyGoal: persistedState.dailyGoal ?? 20 }
        }
        return persistedState
      },
    },
  ),
)

export { Rating }
