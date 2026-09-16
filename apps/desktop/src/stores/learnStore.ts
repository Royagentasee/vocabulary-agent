import { create } from 'zustand'
import { createFSRS, Rating } from '@vocab-agent/sdk-fsrs'
import type { FSRSCardState, Word } from '@vocab-agent/types'

const STORAGE_KEY = 'vocab-agent-desktop-state'
const scheduler = createFSRS()

interface ReviewQueueItem { word: Word; card: FSRSCardState }
interface LearnState {
  currentWordbookId: string | null
  queue: ReviewQueueItem[]
  index: number
  todayLearned: number
  todayReviewed: number
  wrongWords: Word[]
  setWordbook: (id: string) => void
  startReview: () => Promise<void>
  nextWord: () => void
  rate: (rating: Rating) => void
  reset: () => void
}

function loadInitial(): LearnState {
  try {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached) return { ...defaultState(), ...JSON.parse(cached), startReview: undefined as any, nextWord: undefined as any, rate: undefined as any, setWordbook: undefined as any, reset: undefined as any }
  } catch {}
  return defaultState()
}

function defaultState(): LearnState {
  return {
    currentWordbookId: null,
    queue: [],
    index: 0,
    todayLearned: 0,
    todayReviewed: 0,
    wrongWords: [],
    startReview: async () => {},
    nextWord: () => {},
    rate: () => {},
    setWordbook: () => {},
    reset: () => {},
  }
}

export const useLearnStore = create<LearnState>()((set, get) => ({
  ...loadInitial(),

  setWordbook: (id) => set({ currentWordbookId: id }),

  startReview: async () => {
    const { fetchWords } = await import('@/services/words')
    const words = await fetchWords()
    set({
      queue: words.map((word) => ({ word, card: scheduler.newCard() })),
      index: 0,
    })
    saveState(get())
  },

  nextWord: () => {
    set({ index: get().index + 1 })
    saveState(get())
  },

  rate: (rating) => {
    const { queue, index, wrongWords } = get()
    const current = queue[index]
    if (!current) return
    const result = scheduler.review(current.card, rating)
    const newQueue = [...queue]
    newQueue[index] = { ...current, card: result.card }
    const newWrong =
      rating === Rating.Again && !wrongWords.find((w) => w.id === current.word.id)
        ? [...wrongWords, current.word]
        : wrongWords
    set({
      queue: newQueue,
      todayLearned: get().todayLearned + (current.card.state === 'new' ? 1 : 0),
      todayReviewed: get().todayReviewed + 1,
      wrongWords: newWrong,
    })
    saveState(get())
  },

  reset: () => {
    set({ queue: [], index: 0, todayLearned: 0, todayReviewed: 0, wrongWords: [] })
    saveState(get())
  },
}))

function saveState(state: LearnState) {
  try {
    const { startReview, nextWord, rate, reset, setWordbook, ...rest } = state
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
  } catch {}
}

export { Rating }