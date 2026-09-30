/**
 * 书库（原版阅读）API
 */
import { config, fetchWithFallback } from '../config'

export interface BookSummary {
  id: string
  kind: 'classic' | 'story'
  title: string
  titleZh: string
  author: string
  level: string
  category: string
  blurb: string
  chapterCount: number
  wordCount: number
  letter: string
}

export interface ChapterSummary {
  index: number
  title: string
  titleZh: string
  wordCount: number
}

export interface BookDetail extends BookSummary {
  chapters: ChapterSummary[]
}

export interface VocabItem {
  word: string
  meaning: string
}

export interface StoryQuestion {
  question: string
  choices: string[]
  answer: string
  explanation: string
}

export interface ChapterContent {
  bookId: string
  index: number
  title: string
  titleZh: string
  text: string
  wordCount: number
  prevIndex: number | null
  nextIndex: number | null
  translation: string
  vocabulary: VocabItem[]
  questions: StoryQuestion[]
}

export interface BookListResult {
  items: BookSummary[]
  total: number
  categories: string[]
  levels: string[]
}

export interface LibraryStats {
  classicCount: number
  storyCount: number
  totalWords: number
  chapters: number
  source: string
}

const BASE = '/api/library'

async function get<T>(path: string): Promise<T> {
  const directUrl = config.aiGateway ? `${config.aiGateway}${path}` : path
  const resp = await fetchWithFallback(path, directUrl, { method: 'GET' })
  if (!resp.ok) throw new Error(`请求失败 ${resp.status}`)
  return resp.json()
}

export async function fetchBooks(params: {
  kind?: string
  level?: string
  category?: string
  letter?: string
  q?: string
  limit?: number
} = {}): Promise<BookListResult> {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  })
  const suffix = qs.toString() ? `?${qs}` : ''
  return get<BookListResult>(`${BASE}/books${suffix}`)
}

export async function fetchBook(bookId: string): Promise<BookDetail> {
  return get<BookDetail>(`${BASE}/books/${encodeURIComponent(bookId)}`)
}

export async function fetchChapter(bookId: string, index: number): Promise<ChapterContent> {
  return get<ChapterContent>(`${BASE}/books/${encodeURIComponent(bookId)}/chapters/${index}`)
}

export async function fetchLibraryStats(): Promise<LibraryStats> {
  return get<LibraryStats>(`${BASE}/stats`)
}

/* ---------------- 阅读进度（本地存储） ---------------- */

const PROGRESS_KEY = 'va-reading-progress'

export interface ReadingProgress {
  bookId: string
  chapterIndex: number
  title: string
  updatedAt: number
}

function readAll(): Record<string, ReadingProgress> {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}')
  } catch {
    return {}
  }
}

export function saveProgress(bookId: string, chapterIndex: number, title: string): void {
  try {
    const all = readAll()
    all[bookId] = { bookId, chapterIndex, title, updatedAt: Date.now() }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

export function getProgress(bookId: string): ReadingProgress | null {
  return readAll()[bookId] || null
}

export function getAllProgress(): ReadingProgress[] {
  return Object.values(readAll()).sort((a, b) => b.updatedAt - a.updatedAt)
}
