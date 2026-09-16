/**
 * 学习状态管理（基于 Taro.Storage）
 *
 * 简化版：用全局变量 + Storage 持久化，不引入 zustand 以减小包体积。
 */
import Taro from '@tarojs/taro'
import { createFSRS, Rating } from '@vocab-agent/sdk-fsrs'
import type { FSRSCardState, Word } from '@vocab-agent/types'

const STORAGE_KEY = 'vocab-agent-state'

interface ReviewQueueItem {
  word: Word
  card: FSRSCardState
}

interface LearnState {
  currentWordbookId: string | null
  queue: ReviewQueueItem[]
  index: number
  todayLearned: number
  todayReviewed: number
  wrongWords: Word[]
}

const scheduler = createFSRS()

const defaultState: LearnState = {
  currentWordbookId: null,
  queue: [],
  index: 0,
  todayLearned: 0,
  todayReviewed: 0,
  wrongWords: [],
}

let state: LearnState = defaultState
const listeners = new Set<() => void>()

function loadFromStorage() {
  try {
    const cached = Taro.getStorageSync(STORAGE_KEY)
    if (cached) state = { ...defaultState, ...cached }
  } catch (e) {
    console.warn('Failed to load learn state:', e)
  }
}

function saveToStorage() {
  try {
    Taro.setStorageSync(STORAGE_KEY, state)
  } catch (e) {
    console.warn('Failed to save learn state:', e)
  }
}

function notify() {
  listeners.forEach((l) => l())
}

export function getState(): LearnState {
  return state
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function setWordbook(id: string, words: Word[]) {
  state = {
    ...state,
    currentWordbookId: id,
    queue: words.map((word) => ({ word, card: scheduler.newCard() })),
    index: 0,
  }
  saveToStorage()
  notify()
}

export function nextWord() {
  state = { ...state, index: state.index + 1 }
  saveToStorage()
  notify()
}

export function rate(rating: Rating) {
  const current = state.queue[state.index]
  if (!current) return
  const result = scheduler.review(current.card, rating)
  const newQueue = state.queue.slice()
  newQueue[state.index] = { ...current, card: result.card }
  const newWrong =
    rating === Rating.Again && !state.wrongWords.find((w) => w.id === current.word.id)
      ? [...state.wrongWords, current.word]
      : state.wrongWords
  state = {
    ...state,
    queue: newQueue,
    todayLearned: state.todayLearned + (current.card.state === 'new' ? 1 : 0),
    todayReviewed: state.todayReviewed + 1,
    wrongWords: newWrong,
  }
  saveToStorage()
  notify()
}

export function reset() {
  state = { ...defaultState }
  saveToStorage()
  notify()
}

loadFromStorage()

export { Rating }