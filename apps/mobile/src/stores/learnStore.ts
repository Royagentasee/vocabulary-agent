import AsyncStorage from '@react-native-async-storage/async-storage'
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

async function load() {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEY)
    if (cached) state = { ...defaultState, ...JSON.parse(cached) }
  } catch (e) {
    console.warn('Load state failed:', e)
  }
}
load()

async function save() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('Save state failed:', e)
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
  await save()
  notify()
}

export function nextWord() {
  state = { ...state, index: state.index + 1 }
  save()
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
  save()
  notify()
}

export function reset() {
  state = { ...defaultState }
  save()
  notify()
}

export { Rating }